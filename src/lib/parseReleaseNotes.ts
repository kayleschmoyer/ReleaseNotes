import type { ItemType, ParsedRelease, ReleaseItem, ReleaseSection, SectionKind } from './types'

const ITEM_TYPES: Record<string, ItemType> = {
  feature: 'feature',
  bug: 'bug',
  defect: 'bug',
  'user story': 'story',
  story: 'story',
  'product backlog item': 'story',
  pbi: 'story',
  task: 'task',
}

const TYPE_WORDS = 'feature|bug|defect|user story|story|product backlog item|pbi|task'

// Matched against link-unwrapped text, e.g.
//   "Feature 297226: Vast Commerce - AutoZone Deals"
//   "Product Backlog Item 247531: A/R Cash Posting - Account…"
//   "Bug #296356 - Merge Quote Shows Quotes Converted to Work Orders"
const ITEM_TEXT = new RegExp(`^(${TYPE_WORDS})\\s*#?(\\d{3,})\\s*[:\\-–—]?\\s*(.*)$`, 'i')

// A markdown heading. Azure DevOps is lenient and renders "##Main Changes"
// (no space after the #s) as a heading, so we accept that too. Work-item
// mentions ("#297226") are handled BEFORE this so digits never become
// headings.
const HEADING = /^(#{1,6})\s*(\S.*?)\s*$/

// Bare work-item mention starting a line: "#297226", "- #297226",
// "#297226: optional same-line title"
const BARE_MENTION = /^\s*(?:[-*+]\s+)?#(\d{3,})\s*[:\-–—]?\s*(.*)$/
const BARE_MENTION_TEXT = /^#(\d{3,})\s*[:\-–—]?\s*(.*)$/

// Some pages use plain numeric mentions without '#', e.g.
// "297226 Vast Commerce - AutoZone Deals" or "- 297226".
const PLAIN_MENTION = /^\s*(?:[-*+]\s+)?(\d{3,})\s*(.*)$/

// List bullet, e.g. "- [Bug 300163: Invoices api…](url)" or "* Feature 1: x"
const BULLET = /^\s*[-*+]\s+(.+)$/

const MAIN_SECTIONS = ['main changes', 'main change', 'features', 'new features']
const MINOR_SECTIONS = ['minor changes', 'minor change', 'bug fixes', 'fixes', 'bugs']

function sectionKind(title: string): SectionKind {
  const t = title.trim().toLowerCase()
  if (MAIN_SECTIONS.some((s) => t === s || t.startsWith(s))) return 'main'
  if (MINOR_SECTIONS.some((s) => t === s || t.startsWith(s))) return 'minor'
  return 'other'
}

/** Replace markdown links with their text: "[Bug 1: x](url)" -> "Bug 1: x". */
function unwrapLinks(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
}

/**
 * Strip inline formatting so structural matching sees the plain text:
 * "**#297226**" -> "#297226", "[**##Heading**](url)" -> "##Heading".
 */
function normalizeStructuralText(s: string): string {
  return s
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
}

/**
 * Normalize raw wiki payloads before line-based parsing.
 * Some sources arrive as escaped text ("\\n", "\\#") instead of real markdown.
 */
function normalizeMarkdownSource(markdown: string): string {
  let out = normalizeStructuralText(markdown)

  // HTML-encoded hash markers are common when wiki content is serialized.
  out = out.replace(/&#35;|&#x23;/gi, '#')

  // Some wiki payloads are escaped multiple times before reaching the client.
  for (let i = 0; i < 3; i += 1) {
    const next = out
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\([#*_`~\[\]()])/g, '$1')
    if (next === out) break
    out = next
  }

  return out
}

function parsePlainSectionLabel(raw: string): { title: string; kind: SectionKind } | null {
  const text = cleanTitle(raw)
    .toLowerCase()
    .replace(/\s*[:\-–—]\s*$/, '')
    .trim()
  if (!text) return null

  if (MAIN_SECTIONS.some((s) => text === s || text.startsWith(s))) {
    return { title: 'Main Changes', kind: 'main' }
  }
  if (MINOR_SECTIONS.some((s) => text === s || text.startsWith(s))) {
    return { title: 'Minor Changes', kind: 'minor' }
  }
  return null
}

/**
 * Azure DevOps treats "##Main Changes" as a heading, but CommonMark does not.
 * Add a space after heading markers so markdown renderers match DevOps output.
 */
function normalizeSectionMarkdownForRender(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/^(#{1,6})([A-Za-z])(.*)$/, '$1 $2$3'))
    .join('\n')
}

function stripInline(s: string): string {
  return normalizeStructuralText(unwrapLinks(s)).replace(/[*_`~]/g, '').trim()
}

/** Strip markdown emphasis/backticks and collapse whitespace. */
function cleanTitle(s: string): string {
  return normalizeStructuralText(unwrapLinks(s))
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchItemText(raw: string): { type: ItemType; id: number; title: string } | null {
  const text = cleanTitle(raw)
  const m = text.match(ITEM_TEXT)
  if (!m) return null
  const [, kind, id, rest] = m
  return {
    type: ITEM_TYPES[kind.toLowerCase()] ?? 'other',
    id: Number(id),
    title: rest.trim(),
  }
}

function matchPlainMention(raw: string): { id: number; title: string } | null {
  const m = stripInline(raw).match(PLAIN_MENTION)
  if (!m) return null
  const [, idText, rest] = m
  const id = Number(idText)
  if (!Number.isFinite(id)) return null

  const title = cleanTitle(rest)
  // If no explicit separator/title exists, keep it as an id-only mention.
  if (!title) return { id, title: '' }
  // Guard against accidental matches like semantic versions (e.g. "7.0.7").
  if (/^\d+(?:\.\d+)+$/.test(title)) return null
  return { id, title }
}

/**
 * Turn an Azure DevOps wiki release page into structured data.
 *
 * Handles the formats seen in real Vast Online release pages:
 *  - section headings with or without a space: "## Minor Changes", "##Main Changes"
 *  - item headings:      "### Feature 297226: Title" (optionally link-wrapped)
 *  - item bullets:       "- [Bug 300163: Title](url)"
 *  - bare mentions:      "#247531" on its own line — the item's title is the
 *                        next non-empty line and everything after that (Value /
 *                        How to use / Overview…) is the item's body, until the
 *                        next mention or heading
 * Content that isn't part of an item is preserved as markdown sections; a page
 * that parses to nothing at all is returned whole so it never renders blank.
 */
export function parseReleaseNotes(markdown: string): ParsedRelease {
  const items: ReleaseItem[] = []
  const sections: ReleaseSection[] = []

  let currentSection: SectionKind = 'other'
  let currentSectionTitle = ''
  let sectionBuf: string[] = []
  let currentItem: ReleaseItem | null = null
  let awaitingTitle = false
  let inFence = false

  const flushItem = () => {
    if (currentItem) {
      currentItem.body = currentItem.body.trim()
      if (!currentItem.title) currentItem.title = `Work item ${currentItem.id}`
      items.push(currentItem)
      currentItem = null
    }
    awaitingTitle = false
  }
  const flushSection = () => {
    const md = normalizeSectionMarkdownForRender(sectionBuf.join('\n').replace(/\[\[_TOC_\]\]/g, '').trim())
    if (md) sections.push({ title: currentSectionTitle, markdown: md })
    sectionBuf = []
  }

  for (const line of normalizeMarkdownSource(markdown).split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) {
      if (currentItem) currentItem.body += line + '\n'
      else sectionBuf.push(line)
      continue
    }

    // Match structure against the line with inline formatting stripped, so
    // "**#297226**" and "**##Heading**" are recognised too.
    const plain = stripInline(line)

    // Work-item mentions first, so "#247531" is never mistaken for a heading.
    const mention = plain.match(BARE_MENTION)
    if (mention) {
      flushItem()
      const [, id, rest] = mention
      currentItem = {
        type: 'other',
        id: Number(id),
        title: cleanTitle(rest),
        section: currentSection,
        body: '',
      }
      awaitingTitle = currentItem.title === ''
      continue
    }

    // Some pages use plain labels instead of markdown headings:
    // "Main Changes:" / "Minor Changes:".
    const plainSection = parsePlainSectionLabel(plain)
    if (plainSection) {
      flushItem()
      flushSection()
      currentSectionTitle = plainSection.title
      currentSection = plainSection.kind
      continue
    }

    // DevOps pages sometimes contain work-item lines without a leading '#'.
    // Only treat these as items once we're inside a known change section.
    if (currentSection !== 'other') {
      const plainMention = matchPlainMention(plain)
      if (plainMention) {
        flushItem()
        currentItem = {
          type: 'other',
          id: plainMention.id,
          title: plainMention.title,
          section: currentSection,
          body: '',
        }
        awaitingTitle = currentItem.title === ''
        continue
      }
    }

    const heading = plain.match(HEADING)
    if (heading) {
      flushItem()
      // Item heading ("### Feature 123: …", possibly link-wrapped)?
      const item = matchItemText(heading[2])
      if (item) {
        // Headings own the content until the next heading.
        currentItem = { ...item, section: currentSection, body: '' }
        awaitingTitle = currentItem.title === ''
        continue
      }

      // DevOps can emit bare mentions as headings, e.g. "### #297226".
      const bareInHeading = stripInline(heading[2]).match(BARE_MENTION_TEXT)
      if (bareInHeading) {
        const [, id, rest] = bareInHeading
        currentItem = {
          type: 'other',
          id: Number(id),
          title: cleanTitle(rest),
          section: currentSection,
          body: '',
        }
        awaitingTitle = currentItem.title === ''
        continue
      }

      if (currentSection !== 'other') {
        const plainMention = matchPlainMention(heading[2])
        if (plainMention) {
          currentItem = {
            type: 'other',
            id: plainMention.id,
            title: plainMention.title,
            section: currentSection,
            body: '',
          }
          awaitingTitle = currentItem.title === ''
          continue
        }
      }
      // Otherwise a section heading.
      flushSection()
      currentSectionTitle = cleanTitle(heading[2])
      currentSection = sectionKind(currentSectionTitle)
      continue
    }

    const bullet = line.match(BULLET)
    if (bullet) {
      const item = matchItemText(bullet[1])
      if (item) {
        flushItem()
        // Bullets are self-contained lines.
        items.push({
          ...item,
          title: item.title || `Work item ${item.id}`,
          section: currentSection,
          body: '',
        })
        continue
      }
    }

    // Some wiki pages list items as plain lines (often anchor-wrapped HTML)
    // without markdown heading/bullet markers.
    if (currentSection !== 'other') {
      const item = matchItemText(line)
      if (item) {
        flushItem()
        currentItem = { ...item, section: currentSection, body: '' }
        awaitingTitle = currentItem.title === ''
        continue
      }
    }

    if (currentItem) {
      if (awaitingTitle && line.trim()) {
        // "#247531" followed by the title on the next line.
        currentItem.title = cleanTitle(line)
        awaitingTitle = false
      } else {
        currentItem.body += line + '\n'
      }
    } else {
      sectionBuf.push(line)
    }
  }
  flushItem()
  flushSection()

  // Dedupe by work-item id (a hand-written TOC bullet plus the item's own
  // heading would otherwise produce the item twice), merging the richer info
  // into the first occurrence.
  const seen = new Map<number, ReleaseItem>()
  const deduped: ReleaseItem[] = []
  for (const item of items) {
    if (item.id === undefined) {
      deduped.push(item)
      continue
    }
    const prev = seen.get(item.id)
    if (!prev) {
      seen.set(item.id, item)
      deduped.push(item)
    } else {
      if (!prev.body && item.body) prev.body = item.body
      if (prev.type === 'other' && item.type !== 'other') prev.type = item.type
      if (prev.title.startsWith('Work item ') && !item.title.startsWith('Work item ')) prev.title = item.title
      if (prev.section === 'other' && item.section !== 'other') prev.section = item.section
    }
  }

  // Safety net: never let a page render blank.
  if (deduped.length === 0 && sections.length === 0 && markdown.trim()) {
    sections.push({ title: '', markdown: normalizeSectionMarkdownForRender(markdown.replace(/\[\[_TOC_\]\]/g, '').trim()) })
  }

  return { items: deduped, sections }
}
