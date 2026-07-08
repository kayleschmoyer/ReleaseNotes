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

// A markdown heading (CommonMark requires whitespace after the #s, so a bare
// work-item mention like "#297226" is NOT a heading).
const HEADING = /^(#{1,6})\s+(.+?)\s*$/

// Bare work-item mention on its own line / list bullet, e.g. "#297226",
// "- #297226" or "* #297226: optional title"
const BARE_MENTION = /^\s*(?:[-*+]\s*)?#(\d{3,})\s*[:\-–—]?\s*(.*)$/

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
  return s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
}

/** Strip markdown emphasis/backticks and collapse whitespace. */
function cleanTitle(s: string): string {
  return unwrapLinks(s)
    .replace(/[*_`]/g, '')
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
    title: rest.trim() || `Work item ${id}`,
  }
}

/**
 * Turn an Azure DevOps wiki release page into structured data.
 *
 * Handles the formats seen in real Vast Online release pages:
 *  - item headings:      "### Feature 297226: Title" (optionally link-wrapped)
 *  - item bullets:       "- [Bug 300163: Title](url)"
 *  - bare mentions:      "#297226" / "- #297226"
 * grouped under whatever section heading they appear beneath (Main Changes /
 * Minor Changes / anything else). Content that isn't part of an item is
 * preserved as markdown sections; a page that parses to nothing at all is
 * returned whole as a single markdown section so it can never render blank.
 */
export function parseReleaseNotes(markdown: string): ParsedRelease {
  const items: ReleaseItem[] = []
  const sections: ReleaseSection[] = []

  let currentSection: SectionKind = 'other'
  let currentSectionTitle = ''
  let sectionBuf: string[] = []
  let currentItem: ReleaseItem | null = null
  let inFence = false

  const flushItem = () => {
    if (currentItem) {
      currentItem.body = currentItem.body.trim()
      items.push(currentItem)
      currentItem = null
    }
  }
  const flushSection = () => {
    const md = sectionBuf.join('\n').replace(/\[\[_TOC_\]\]/g, '').trim()
    if (md) sections.push({ title: currentSectionTitle, markdown: md })
    sectionBuf = []
  }
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) {
      if (currentItem) currentItem.body += line + '\n'
      else sectionBuf.push(line)
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      flushItem()
      // Item heading ("### Feature 123: …", possibly link-wrapped)?
      const item = matchItemText(heading[2])
      if (item) {
        // Headings own the content until the next heading.
        currentItem = { ...item, section: currentSection, body: '' }
        continue
      }
      // Otherwise a section heading.
      flushSection()
      currentSectionTitle = cleanTitle(heading[2])
      currentSection = sectionKind(currentSectionTitle)
      continue
    }

    const mention = line.match(BARE_MENTION)
    if (mention && !currentItem) {
      const [, id, rest] = mention
      items.push({
        type: 'other',
        id: Number(id),
        title: cleanTitle(rest) || `Work item ${id}`,
        section: currentSection,
        body: '',
      })
      continue
    }

    const bullet = line.match(BULLET)
    if (bullet) {
      const item = matchItemText(bullet[1])
      if (item) {
        flushItem()
        // Bullets are self-contained lines.
        items.push({ ...item, section: currentSection, body: '' })
        continue
      }
    }

    if (currentItem) currentItem.body += line + '\n'
    else sectionBuf.push(line)
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
    sections.push({ title: '', markdown: markdown.replace(/\[\[_TOC_\]\]/g, '').trim() })
  }

  return { items: deduped, sections }
}
