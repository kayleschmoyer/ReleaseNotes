import { describe, expect, it } from 'vitest'
import { parseReleaseNotes } from './parseReleaseNotes'
import { demoPages } from './fixtures'

const SAMPLE = `[[_TOC_]]

# Change Log

# Deployment Notes

Restart the sync service after deploying.

## Main Changes

### Feature 297226: Vast Commerce - AutoZone Deals

Adds AutoZone deal support.

- Deal headers sync on schedule.

## Minor Changes

### Bug 296356: Merge Quote Shows Quotes Converted to Work Orders

### Bug #303980 - Disabled products still showing in Inventory Adjustment screen
`

describe('parseReleaseNotes', () => {
  it('extracts items with type, id, title and section', () => {
    const { items } = parseReleaseNotes(SAMPLE)
    expect(items).toHaveLength(3)

    expect(items[0]).toMatchObject({
      type: 'feature',
      id: 297226,
      title: 'Vast Commerce - AutoZone Deals',
      section: 'main',
    })
    expect(items[0].body).toContain('Adds AutoZone deal support.')

    expect(items[1]).toMatchObject({ type: 'bug', id: 296356, section: 'minor' })
    // "#id -" heading variant
    expect(items[2]).toMatchObject({
      type: 'bug',
      id: 303980,
      title: 'Disabled products still showing in Inventory Adjustment screen',
      section: 'minor',
    })
  })

  it('keeps non-item content as markdown sections and strips the TOC macro', () => {
    const { sections } = parseReleaseNotes(SAMPLE)
    const deploy = sections.find((s) => s.title === 'Deployment Notes')
    expect(deploy?.markdown).toContain('Restart the sync service')
    expect(sections.every((s) => !s.markdown.includes('[[_TOC_]]'))).toBe(true)
    // Empty sections (Change Log had no content) are dropped
    expect(sections.find((s) => s.title === 'Change Log')).toBeUndefined()
  })

  it('captures bare work-item mentions', () => {
    const { items } = parseReleaseNotes('## Minor Changes\n\n- #312923: Products Api fix\n')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 312923, title: 'Products Api fix', section: 'minor' })
  })

  it('ignores headings inside code fences', () => {
    const md = '## Main Changes\n\n### Feature 100001: Thing\n\n```\n### Bug 999999: not real\n```\n'
    const { items } = parseReleaseNotes(md)
    expect(items).toHaveLength(1)
    expect(items[0].body).toContain('### Bug 999999: not real')
  })

  it('parses link-wrapped item headings (real wiki format)', () => {
    const md = [
      '## Main Changes',
      '### [Product Backlog Item 247531: A/R Cash Posting - Account Change](https://dev.azure.com/x/_workitems/edit/247531)',
      'Details here.',
      '## Minor Changes',
      '#### [Bug 291670: HQ Maintained - Can update cost on an OP](https://dev.azure.com/x/_workitems/edit/291670)',
    ].join('\n')
    const { items } = parseReleaseNotes(md)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      type: 'story',
      id: 247531,
      title: 'A/R Cash Posting - Account Change',
      section: 'main',
    })
    expect(items[0].body).toContain('Details here.')
    expect(items[1]).toMatchObject({ type: 'bug', id: 291670, section: 'minor' })
  })

  it('parses items written as bullet links', () => {
    const md = [
      '## Main Changes',
      '- [Product Backlog Item 303826: Text To Authorize - Enable Config](url)',
      '* [Feature 302442: Vast Commerce - AutoZone](url)',
      '## Minor Changes',
      '- [Bug 300163: Invoices api returning payment against original](url)',
    ].join('\n')
    const { items } = parseReleaseNotes(md)
    expect(items.map((i) => i.id)).toEqual([303826, 302442, 300163])
    expect(items[0].section).toBe('main')
    expect(items[2]).toMatchObject({ type: 'bug', section: 'minor' })
  })

  it('treats bare #id lines as mentions, never as headings', () => {
    const md = ['## Main Changes', '#297226', '## Minor Changes', '#296356', '- #303980'].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => i.id)).toEqual([297226, 296356, 303980])
    expect(items[0].section).toBe('main')
    expect(items[1].section).toBe('minor')
    expect(sections).toHaveLength(0)
  })

  it('dedupes items listed both in a TOC bullet and as a heading', () => {
    const md = [
      '- [Bug 291670: HQ Maintained](url)',
      '## Minor Changes',
      '### Bug 291670: HQ Maintained - Can update cost',
      'Body text.',
    ].join('\n')
    const { items } = parseReleaseNotes(md)
    expect(items).toHaveLength(1)
    expect(items[0].body).toContain('Body text.')
  })

  it('never renders a page blank: falls back to raw markdown', () => {
    const md = 'Just a plain paragraph with no headings or items.'
    const { items, sections } = parseReleaseNotes(md)
    expect(items).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(sections[0].markdown).toContain('plain paragraph')
  })

  it('parses every bundled demo page without losing items', () => {
    for (const [path, md] of demoPages) {
      const { items } = parseReleaseNotes(md)
      expect(items.length, path).toBeGreaterThan(0)
      for (const item of items) {
        expect(item.id, path).toBeTypeOf('number')
        expect(item.title.length, path).toBeGreaterThan(0)
      }
    }
  })
})
