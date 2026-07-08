import { useMemo, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useData } from '../api/DataProvider'
import { useAsync } from '../lib/useAsync'
import { parseReleaseNotes } from '../lib/parseReleaseNotes'
import { typeMeta } from '../lib/status'
import type { ItemType, ParsedRelease, ReleaseItem, WorkItemInfo } from '../lib/types'
import { ItemCard } from '../components/ItemCard'
import { Logo } from '../components/Logo'
import { Markdown } from '../components/Markdown'
import { ReleaseSkeleton } from '../components/Skeletons'
import { EmptyState, ErrorState } from '../components/States'
import { PrintIcon, SearchIcon } from '../components/icons'
import type { ShellContext } from './AppShell'

type TypeFilter = 'all' | ItemType

function matches(item: ReleaseItem, wi: WorkItemInfo | undefined, type: TypeFilter, q: string): boolean {
  if (type !== 'all' && item.type !== type) return false
  if (!q) return true
  const hay = `${item.title} ${item.id ?? ''} ${wi?.state ?? ''} ${item.body}`.toLowerCase()
  return hay.includes(q)
}

export function Release() {
  const { version = '' } = useParams()
  const { versions } = useOutletContext<ShellContext>()
  const data = useData()

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [query, setQuery] = useState('')

  const page = versions.find((v) => v.name === version)

  const releaseState = useAsync<{ parsed: ParsedRelease; workItems: Map<number, WorkItemInfo> } | null>(
    async () => {
      if (!page) return null
      const md = await data.getReleaseMarkdown(page.path)
      const parsed = parseReleaseNotes(md)
      const ids = parsed.items.map((i) => i.id).filter((id): id is number => id !== undefined)
      let workItems = new Map<number, WorkItemInfo>()
      try {
        workItems = await data.getWorkItems(ids)
      } catch {
        // Status enrichment is best-effort; notes still render without it.
      }
      return { parsed, workItems }
    },
    [data, page?.path],
  )

  // Wait for the version list before deciding the version doesn't exist.
  if (!page && versions.length > 0) return <Navigate to="/" replace />
  if (!page || releaseState.loading) return <ReleaseSkeleton />
  if (releaseState.error) return <ErrorState error={releaseState.error} onRetry={releaseState.retry} />
  if (!releaseState.data) return <ReleaseSkeleton />

  const { parsed, workItems } = releaseState.data
  return (
    <ReleaseBody
      key={version}
      version={version}
      parsed={parsed}
      workItems={workItems}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      query={query}
      setQuery={setQuery}
      neighbors={{
        newer: versions[versions.findIndex((v) => v.name === version) - 1]?.name,
        older: versions[versions.findIndex((v) => v.name === version) + 1]?.name,
      }}
    />
  )
}

interface BodyProps {
  version: string
  parsed: ParsedRelease
  workItems: Map<number, WorkItemInfo>
  typeFilter: TypeFilter
  setTypeFilter: (t: TypeFilter) => void
  query: string
  setQuery: (q: string) => void
  neighbors: { newer?: string; older?: string }
}

const WRAPPER_SECTION_TITLES = new Set(['change log', 'deployment notes'])

function ReleaseBody(props: BodyProps) {
  const { version, parsed, workItems, typeFilter, setTypeFilter, query, setQuery, neighbors } = props
  const generatedOn = useMemo(
    () =>
      new Intl.DateTimeFormat('en-NZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  // Bare-mention items parse as type 'other'; the live work item knows better.
  const items = useMemo(
    () =>
      parsed.items.map((i) => {
        const wi = i.id ? workItems.get(i.id) : undefined
        return i.type === 'other' && wi && wi.type !== 'other' ? { ...i, type: wi.type } : i
      }),
    [parsed.items, workItems],
  )

  const q = query.trim().toLowerCase()
  const visible = useMemo(
    () => items.filter((i) => matches(i, i.id ? workItems.get(i.id) : undefined, typeFilter, q)),
    [items, workItems, typeFilter, q],
  )

  const featureCount = items.filter((i) => i.type === 'feature' || i.type === 'story').length
  const bugCount = items.filter((i) => i.type === 'bug').length
  const presentTypes = [...new Set(items.map((i) => i.type))]

  const sections: Array<{ title: string; items: ReleaseItem[] }> = [
    { title: 'Main Changes', items: visible.filter((i) => i.section === 'main') },
    { title: 'Minor Changes', items: visible.filter((i) => i.section === 'minor') },
    { title: 'Other Changes', items: visible.filter((i) => i.section === 'other') },
  ].filter((s) => s.items.length > 0)

  return (
    <div className="rise-in pdf-release" data-testid="release-page">
      <div className="print-block pdf-print-header hidden">
        <div className="pdf-print-headline">
          <Logo size="lg" />
          <div className="pdf-print-meta">
            <p className="pdf-print-kicker">Customer Release Notes</p>
            <p className="pdf-print-version">Version {version}</p>
            <p className="pdf-print-date">Generated {generatedOn}</p>
          </div>
        </div>
        <div className="pdf-print-chips">
          {featureCount > 0 && <span className="pdf-chip pdf-chip-feature">{featureCount} new {featureCount === 1 ? 'feature' : 'features'}</span>}
          {bugCount > 0 && <span className="pdf-chip pdf-chip-bug">{bugCount} {bugCount === 1 ? 'fix' : 'fixes'}</span>}
        </div>
      </div>

      {/* Hero */}
      <div className="no-print living-magenta-soft border-b border-charcoal/6">
        <div className="brand-grid mx-auto max-w-4xl px-6 pt-10 pb-8">
          <p className="font-mono text-xs tracking-widest text-slate-brand uppercase">
            Vast Online Core · Release
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-mono text-5xl font-semibold tracking-tight text-charcoal sm:text-6xl" data-testid="release-version">
              {version}
            </h1>
            <div className="no-print flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 bg-white px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-magenta hover:text-magenta-deep"
                title="Print or save as PDF"
              >
                <PrintIcon className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {featureCount > 0 && (
              <span className="rounded-full bg-lilac/10 px-3 py-1 text-sm font-medium text-lilac">
                {featureCount} new {featureCount === 1 ? 'feature' : 'features'}
              </span>
            )}
            {bugCount > 0 && (
              <span className="rounded-full bg-scarlet/10 px-3 py-1 text-sm font-medium text-scarlet">
                {bugCount} {bugCount === 1 ? 'fix' : 'fixes'}
              </span>
            )}
            {items.length === 0 && (
              <span className="rounded-full bg-stone-brand/15 px-3 py-1 text-sm text-slate-brand">
                No itemised changes on this page
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 pdf-content-wrap">
        {/* Filters */}
        {items.length > 0 && (
          <div className="no-print mb-8 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
              {(['all', ...presentTypes] as TypeFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  data-testid={`filter-${t}`}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === t
                      ? 'bg-charcoal text-white'
                      : 'bg-white text-slate-brand ring-1 ring-charcoal/10 hover:text-charcoal'
                  }`}
                >
                  {t === 'all' ? `All (${items.length})` : `${typeMeta(t).label}s`}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-60">
              <SearchIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-brand" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search this release"
                aria-label="Search within this release"
                className="w-full rounded-full border border-charcoal/10 bg-white py-2 pr-4 pl-9 text-sm placeholder:text-stone-brand focus:border-magenta"
              />
            </div>
          </div>
        )}

        {/* Items */}
        {sections.length === 0 && items.length > 0 && (
          <EmptyState title="Nothing matches those filters">
            Clear the search or pick a different type to see the rest of this release.
          </EmptyState>
        )}
        <div className="space-y-10 pdf-item-sections">
          {sections.map((s) => (
            <section key={s.title}>
              <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-charcoal/8 pb-3">
                <h2 className="text-xl font-bold tracking-tight text-charcoal">{s.title}</h2>
                <span className="rounded-full bg-magenta/10 px-3 py-1 font-mono text-xs font-semibold text-magenta-deep">
                  {s.items.length} {s.items.length === 1 ? 'change' : 'changes'}
                </span>
              </div>
              <div className="space-y-3">
                {s.items.map((item, i) => (
                  <ItemCard key={item.id ?? `${s.title}-${i}`} item={item} workItem={item.id ? workItems.get(item.id) : undefined} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Non-item sections (Deployment Notes, Change Log, ...) */}
        {parsed.sections.length > 0 && (
          <div className="mt-12 space-y-8">
            {parsed.sections.map((s, i) => (
              <section key={i} className="rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card pdf-section-card">
                {s.title && !WRAPPER_SECTION_TITLES.has(s.title.trim().toLowerCase()) && (
                  <h2 className="mb-3 text-lg font-bold text-charcoal">{s.title}</h2>
                )}
                <Markdown className="prose-brand text-charcoal/90">{s.markdown}</Markdown>
              </section>
            ))}
          </div>
        )}

        {/* Prev / next */}
        <div className="no-print mt-14 flex items-center justify-between border-t border-charcoal/8 pt-6 font-mono text-sm">
          {neighbors.newer ? (
            <Link to={`/release/${encodeURIComponent(neighbors.newer)}`} className="text-magenta-deep hover:underline">
              ← {neighbors.newer}
            </Link>
          ) : (
            <span />
          )}
          {neighbors.older ? (
            <Link to={`/release/${encodeURIComponent(neighbors.older)}`} className="text-magenta-deep hover:underline">
              {neighbors.older} →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  )
}
