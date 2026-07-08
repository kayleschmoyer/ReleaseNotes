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

// e.g. "### Feature 297226: Vast Commerce - AutoZone Deals"
//      "### Bug #296356 - Merge Quote Shows Quotes Converted to Work Orders"
const ITEM_HEADING =
  /^#{1,6}\s*(feature|bug|defect|user story|story|product backlog item|pbi|task)\s*#?(\d{3,})\s*[:\-–—]?\s*(.*)$/i

// Bare work-item mention on its own line / list bullet, e.g. "- #297226" or "#297226: Title"
const BARE_MENTION = /^\s*(?:[-*]\s*)?#(\d{4,})\s*[:\-–—]?\s*(.*)$/

const HEADING = /^(#{1,6})\s*(.+?)\s*$/

const MAIN_SECTIONS = ['main changes', 'main change', 'features', 'new features']
const MINOR_SECTIONS = ['minor changes', 'minor change', 'bug fixes', 'fixes', 'bugs']

function sectionKind(title: string): SectionKind {
  const t = title.trim().toLowerCase()
  if (MAIN_SECTIONS.some((s) => t === s || t.startsWith(s))) return 'main'
  if (MINOR_SECTIONS.some((s) => t === s || t.startsWith(s))) return 'minor'
  return 'other'
}

/** Strip markdown links/emphasis from a heading title. */
function cleanTitle(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Turn an Azure DevOps wiki release page into structured data.
 *
 * Recognises item headings ("Feature 297226: ...", "Bug 296356 - ...") and
 * bare work-item mentions ("#297226"), grouped under whatever section
 * heading they appear beneath (Main Changes / Minor Changes / anything else).
 * Content that isn't part of an item is preserved as markdown sections so
 * unusual pages still render fully.
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

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (inFence) {
      if (currentItem) currentItem.body += line + '\n'
      else sectionBuf.push(line)
      continue
    }

    const item = line.match(ITEM_HEADING)
    if (item) {
      flushItem()
      const [, kind, id, rest] = item
      currentItem = {
        type: ITEM_TYPES[kind.toLowerCase()] ?? 'other',
        id: Number(id),
        title: cleanTitle(rest) || `Work item ${id}`,
        section: currentSection,
        body: '',
      }
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      // A generic heading ends the current item and possibly starts a section.
      flushItem()
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

    if (currentItem) currentItem.body += line + '\n'
    else sectionBuf.push(line)
  }
  flushItem()
  flushSection()

  return { items, sections }
}
