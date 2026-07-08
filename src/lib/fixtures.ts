import type { VersionPage, WorkItemInfo } from './types'

/**
 * Demo-mode sample data, modelled on the real "Vast Online Core" wiki
 * structure (one child page per version; Main Changes = features,
 * Minor Changes = bugs, each tied to a work item).
 */

interface DemoItem {
  type: 'feature' | 'bug'
  id: number
  title: string
  state: string
  body?: string
}

interface DemoRelease {
  version: string
  deploymentNotes?: string
  changeLog?: string
  items: DemoItem[]
}

const RELEASES: DemoRelease[] = [
  {
    version: '7.0.7',
    items: [
      {
        type: 'feature',
        id: 297226,
        title: 'Vast Commerce - AutoZone Deals',
        state: 'In UAT',
        body: 'Adds AutoZone deal support to Vast Commerce so promotional pricing flows through to the storefront automatically.\n\n- Deal headers and lines sync on the standard catalogue schedule.\n- Expired deals fall back to list price without manual intervention.',
      },
      { type: 'bug', id: 296356, title: 'Merge Quote Shows Quotes Converted to Work Orders', state: 'Done' },
      { type: 'bug', id: 303980, title: 'Disabled products still showing in Inventory Adjustment screen', state: 'Done' },
      {
        type: 'bug',
        id: 311235,
        title: 'Jobnumber/Linenumber column in Plines is different than the same information on the post call',
        state: 'Done',
      },
      { type: 'bug', id: 312923, title: 'Products Api: POST & PUT Product Endpoints Missing in API Version 3.2', state: 'Done' },
    ],
  },
  {
    version: '7.0.6',
    deploymentNotes: 'Requires the catalogue sync service to be restarted after deployment.',
    items: [
      { type: 'feature', id: 295118, title: 'Customer Portal - Statement Download as PDF', state: 'Done' },
      { type: 'bug', id: 301442, title: 'Sales order line discounts rounding incorrectly at 3+ decimal places', state: 'Done' },
      { type: 'bug', id: 302017, title: 'Stocktake export times out on branches with more than 50k SKUs', state: 'Done' },
      { type: 'bug', id: 302561, title: 'Email templates lose formatting when copied between branches', state: 'Done' },
    ],
  },
  {
    version: '7.0.5',
    items: [
      { type: 'feature', id: 289774, title: 'Vast Commerce - Real-time Stock Availability Feed', state: 'Done' },
      { type: 'feature', id: 291302, title: 'Purchasing - Supplier Price File Import v2', state: 'Done' },
      { type: 'bug', id: 298450, title: 'Credit notes not appearing in customer transaction history filter', state: 'Done' },
      { type: 'bug', id: 299106, title: 'Report scheduler skips runs across daylight-saving transitions', state: 'Done' },
    ],
  },
  {
    version: '7.0.4',
    items: [
      { type: 'bug', id: 294210, title: 'Barcode labels truncate product descriptions over 40 characters', state: 'Done' },
      { type: 'bug', id: 294876, title: 'VAT summary mismatch on invoices with mixed-rate lines', state: 'Done' },
      { type: 'bug', id: 295533, title: 'User permissions cache not refreshing until re-login', state: 'Done' },
    ],
  },
  {
    version: '7.0.3',
    changeLog: 'Includes the 7.0.2 hotfix rollup.',
    items: [
      { type: 'feature', id: 287001, title: 'Workshop - Technician Clocking Dashboard', state: 'Done' },
      { type: 'bug', id: 291877, title: 'Duplicate payment allocation possible with rapid double-click', state: 'Done' },
      { type: 'bug', id: 292400, title: 'Branch transfer paperwork prints wrong destination address', state: 'Done' },
    ],
  },
  {
    version: '7.0.2',
    items: [
      { type: 'bug', id: 290055, title: 'Hotfix: login loop when session expires during checkout', state: 'Done' },
    ],
  },
  {
    version: '7.0.1',
    items: [
      { type: 'bug', id: 288340, title: 'Dashboard KPI tiles blank for users without sales-history rights', state: 'Done' },
      { type: 'bug', id: 288721, title: 'Product search ranking ignores exact part-number match', state: 'Done' },
    ],
  },
  {
    version: '7.0.0',
    deploymentNotes:
      'Major platform release. Database migration runs automatically on first start and can take up to 20 minutes on large datasets. Take a full backup before upgrading.',
    items: [
      { type: 'feature', id: 280010, title: 'New Vast Online platform shell and navigation', state: 'Done' },
      { type: 'feature', id: 280455, title: 'REST API Version 3.2', state: 'Done' },
      { type: 'feature', id: 281200, title: 'Role-based dashboards with configurable KPI tiles', state: 'Done' },
      { type: 'bug', id: 285601, title: 'Legacy report links now redirect to the new report centre', state: 'Done' },
    ],
  },
  {
    version: '6.0.15',
    items: [
      { type: 'bug', id: 276980, title: 'Aged debt report excludes unallocated credits', state: 'Done' },
      { type: 'bug', id: 277455, title: 'Cash-up variance rounding on multi-till branches', state: 'Done' },
    ],
  },
  {
    version: '6.0.14',
    items: [
      { type: 'feature', id: 272033, title: 'Vast Commerce - Click & Collect order flow', state: 'Done' },
      { type: 'bug', id: 274612, title: 'Backorder release ignores customer credit hold', state: 'Done' },
    ],
  },
  {
    version: '6.0.13',
    items: [
      { type: 'bug', id: 270818, title: 'Price file import drops rows with trailing whitespace', state: 'Done' },
    ],
  },
  {
    version: '6.0.12',
    items: [
      { type: 'bug', id: 268905, title: 'Statement run duplicates customers merged mid-month', state: 'Done' },
      { type: 'bug', id: 269477, title: 'Goods-in scanning beeps twice on serialised items', state: 'Done' },
    ],
  },
]

function releaseMarkdown(r: DemoRelease): string {
  const lines: string[] = ['[[_TOC_]]', '', '# Change Log', '']
  if (r.changeLog) lines.push(r.changeLog, '')
  lines.push('# Deployment Notes', '')
  if (r.deploymentNotes) lines.push(r.deploymentNotes, '')
  const features = r.items.filter((i) => i.type === 'feature')
  const bugs = r.items.filter((i) => i.type === 'bug')
  if (features.length) {
    lines.push('## Main Changes', '')
    for (const f of features) {
      lines.push(`### Feature ${f.id}: ${f.title}`, '')
      if (f.body) lines.push(f.body, '')
    }
  }
  if (bugs.length) {
    lines.push('## Minor Changes', '')
    for (const b of bugs) {
      lines.push(`### Bug ${b.id}: ${b.title}`, '')
      if (b.body) lines.push(b.body, '')
    }
  }
  return lines.join('\n')
}

const ROOT = '/Vast Online Core'

export const demoVersions: VersionPage[] = RELEASES.map((r) => ({
  name: r.version,
  path: `${ROOT}/${r.version}`,
}))

export const demoPages = new Map<string, string>(
  RELEASES.map((r) => [`${ROOT}/${r.version}`, releaseMarkdown(r)]),
)

export const demoWorkItems = new Map<number, WorkItemInfo>(
  RELEASES.flatMap((r) =>
    r.items.map((i): [number, WorkItemInfo] => [
      i.id,
      { id: i.id, title: i.title, state: i.state, type: i.type },
    ]),
  ),
)
