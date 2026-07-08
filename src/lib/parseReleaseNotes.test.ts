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
