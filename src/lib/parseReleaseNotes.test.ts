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

  it('recognises headings and bare mentions with invisible wiki characters', () => {
    const md = ['#﻿Deployment Notes', '##​Main Changes', '#297226', '##‌Minor Changes', '#296356'].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, section: i.section }))).toEqual([
      { id: 297226, section: 'main' },
      { id: 296356, section: 'minor' },
    ])
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

  it('parses the real 7.0.6 format: no-space headings, #id then title on next line', () => {
    // Verbatim structure from the production wiki page.
    const md = [
      '#Deployment Notes',
      '##Main Changes',
      '',
      '#247531',
      'A/R Cash Posting - Accounts receivable for 1st Mile',
      '',
      'Value: Customers with multiple outstanding invoices can now settle them together.',
      '',
      'How to use: Open the cash posting screen for the customer.',
      '',
      '#268223',
      'Add Store Selector for Surcharge Estimate Check for 1st Mile - Payment Provider Configuration',
      '',
      'Value: Branches can now control whether a surcharge estimate check runs.',
      '',
      'Workflow:',
      '',
      'Navigate to payment provider configuration for the branch.',
      'Save the settings and confirm the change applies to that branch only.',
      '',
      '#308590',
      '##Minor Changes',
      '',
      '#291670',
      'HQ Maintained - Can update cost on an OP',
      '',
      'Overview:',
      '',
      'Fixed an issue where cost could be updated on an order proposal.',
      '',
      '#300163',
      'Invoices api returning payment against original work order after credit reissue',
      '',
      'Overview:',
      '',
      'Fixed an issue where credited invoices showed payment information from the original work order.',
    ].join('\n')

    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => i.id)).toEqual([247531, 268223, 308590, 291670, 300163])

    expect(items[0]).toMatchObject({
      id: 247531,
      title: 'A/R Cash Posting - Accounts receivable for 1st Mile',
      section: 'main',
    })
    expect(items[0].body).toContain('Value: Customers with multiple outstanding invoices')
    expect(items[0].body).toContain('How to use:')

    expect(items[1].body).toContain('Workflow:')

    // "#308590" with no title/body at all — placeholder, enrichment fills it in.
    expect(items[2]).toMatchObject({ id: 308590, title: 'Work item 308590', section: 'main' })

    expect(items[3]).toMatchObject({
      id: 291670,
      title: 'HQ Maintained - Can update cost on an OP',
      section: 'minor',
    })
    expect(items[3].body).toContain('Fixed an issue where cost could be updated')

    // No leftover soup: everything belongs to an item or a known heading.
    expect(sections).toHaveLength(0)
  })

  it('parses bold-wrapped mentions (real 7.0.7 format)', () => {
    const md = [
      '#Change Log',
      '#Deployment Notes',
      '##Main Changes',
      '',
      '**#297226**',
      '',
      '##Minor Changes',
      '',
      '**#296356**',
      '**#303980**',
      '**#311235**',
      '**#312923**',
    ].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => i.id)).toEqual([297226, 296356, 303980, 311235, 312923])
    // Title-less mentions get placeholders; the UI swaps in the live work-item title.
    expect(items[0]).toMatchObject({ id: 297226, title: 'Work item 297226', section: 'main' })
    expect(items[1].section).toBe('minor')
    expect(sections).toHaveLength(0)
  })

  it('parses wiki content that arrives with escaped newlines and escaped heading markers', () => {
    const escapedHash = '\\#'
    const md = [
      '#Change Log',
      '#Deployment Notes',
      '##Main Changes',
      '',
      `**${escapedHash}297226**`,
      '',
      '##Minor Changes',
      '',
      `**${escapedHash}296356**`,
    ].join('\\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, section: i.section }))).toEqual([
      { id: 297226, section: 'main' },
      { id: 296356, section: 'minor' },
    ])
    expect(sections).toHaveLength(0)
  })

  it('parses wiki content that is double-escaped by upstream serialization', () => {
    const escapedHash = '\\\\#'
    const md = ['#Change Log', '#Deployment Notes', '##Main Changes', `**${escapedHash}297226**`, '##Minor Changes', `**${escapedHash}296356**`].join(
      '\\\\n',
    )
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, section: i.section }))).toEqual([
      { id: 297226, section: 'main' },
      { id: 296356, section: 'minor' },
    ])
    expect(sections).toHaveLength(0)
  })

  it('parses numeric-only work item lines without leading hash', () => {
    const md = [
      '##Main Changes',
      '297226 Vast Commerce - AutoZone Deals',
      '##Minor Changes',
      '296356 Merge Quote Shows Quotes Converted to Work Orders',
      '303980 Disabled products still showing in Inventory Adjustment screen',
    ].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => i.id)).toEqual([297226, 296356, 303980])
    expect(items[0].title).toContain('AutoZone Deals')
    expect(items[1].section).toBe('minor')
    expect(sections).toHaveLength(0)
  })

  it('parses anchor-wrapped item lines from wiki html', () => {
    const md = [
      '##Main Changes',
      '<a href="#%2237f1bf223ca942c58595316845671dbc%22">Feature 297226: Vast Commerce - AutoZone Deals</a>',
      '##Minor Changes',
      '<a href="#x">Bug 296356: Merge Quote Shows Quotes Converted to Work Orders</a>',
    ].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, type: i.type, section: i.section }))).toEqual([
      { id: 297226, type: 'feature', section: 'main' },
      { id: 296356, type: 'bug', section: 'minor' },
    ])
    expect(items[0].title).toContain('AutoZone Deals')
    expect(sections).toHaveLength(0)
  })

  it('parses plain section labels and id/title lines split across lines', () => {
    const md = [
      'Main Changes:',
      '297226',
      'Vast Commerce - AutoZone Deals',
      '',
      'Minor Changes:',
      '296356',
      'Merge Quote Shows Quotes Converted to Work Orders',
      '',
      '303980',
      'Disabled products still showing in Inventory Adjustment screen',
      '',
      '311235',
      'Jobnumber/Linenumber column in Plines is different than the same information on the post call',
    ].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, title: i.title, section: i.section }))).toEqual([
      { id: 297226, title: 'Vast Commerce - AutoZone Deals', section: 'main' },
      { id: 296356, title: 'Merge Quote Shows Quotes Converted to Work Orders', section: 'minor' },
      { id: 303980, title: 'Disabled products still showing in Inventory Adjustment screen', section: 'minor' },
      {
        id: 311235,
        title: 'Jobnumber/Linenumber column in Plines is different than the same information on the post call',
        section: 'minor',
      },
    ])
    expect(sections).toHaveLength(0)
  })

  it('parses heading-level bare mentions like ### #297226', () => {
    const md = ['##Main Changes', '### #297226', '##Minor Changes', '### #296356', '### #303980', '### #311235', '### #312923'].join('\n')
    const { items, sections } = parseReleaseNotes(md)
    expect(items.map((i) => ({ id: i.id, section: i.section }))).toEqual([
      { id: 297226, section: 'main' },
      { id: 296356, section: 'minor' },
      { id: 303980, section: 'minor' },
      { id: 311235, section: 'minor' },
      { id: 312923, section: 'minor' },
    ])
    expect(sections).toHaveLength(0)
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
