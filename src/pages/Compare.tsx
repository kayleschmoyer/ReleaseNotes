import { useMemo, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router-dom'
import { useData } from '../api/DataProvider'
import { useAsync } from '../lib/useAsync'
import { parseReleaseNotes } from '../lib/parseReleaseNotes'
import { versionsBetween } from '../lib/versionSort'
import type { ReleaseItem, WorkItemInfo } from '../lib/types'
import { ItemCard } from '../components/ItemCard'
import { ReleaseSkeleton } from '../components/Skeletons'
import { EmptyState, ErrorState } from '../components/States'
import type { ShellContext } from './AppShell'

interface VersionChanges {
  version: string
  items: ReleaseItem[]
}

export function Compare() {
  const { versions } = useOutletContext<ShellContext>()
  const data = useData()
  const [params, setParams] = useSearchParams()
  const names = versions.map((v) => v.name)

  const from = params.get('from') ?? names[Math.min(3, Math.max(names.length - 1, 0))] ?? ''
  const to = params.get('to') ?? names[0] ?? ''
  const [expandedAll] = useState(true)

  const span = useMemo(
    () => (from && to ? versionsBetween(names, from, to) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [names.join('|'), from, to],
  )

  const state = useAsync<{ changes: VersionChanges[]; workItems: Map<number, WorkItemInfo> } | null>(
    async () => {
      if (span.length === 0) return { changes: [], workItems: new Map() }
      const byPath = new Map(versions.map((v) => [v.name, v.path]))
      const changes = await Promise.all(
        span.map(async (name): Promise<VersionChanges> => {
          const path = byPath.get(name)
          if (!path) return { version: name, items: [] }
          const md = await data.getReleaseMarkdown(path)
          return { version: name, items: parseReleaseNotes(md).items }
        }),
      )
      const ids = changes.flatMap((c) => c.items.map((i) => i.id)).filter((id): id is number => id !== undefined)
      let workItems = new Map<number, WorkItemInfo>()
      try {
        workItems = await data.getWorkItems(ids)
      } catch {
        /* enrichment is best-effort */
      }
      return { changes, workItems }
    },
    [data, span.join('|')],
  )

  const totals = useMemo(() => {
    const items = state.data?.changes.flatMap((c) => c.items) ?? []
    return {
      features: items.filter((i) => i.type === 'feature').length,
      bugs: items.filter((i) => i.type === 'bug').length,
      all: items.length,
    }
  }, [state.data])

  const set = (key: 'from' | 'to', value: string) => {
    const next = new URLSearchParams(params)
    next.set('from', key === 'from' ? value : from)
    next.set('to', key === 'to' ? value : to)
    setParams(next, { replace: true })
  }

  const selectCls =
    'rounded-xl border border-charcoal/15 bg-white px-3 py-2 font-mono text-sm text-charcoal focus:border-magenta'

  return (
    <div className="rise-in mx-auto max-w-4xl px-6 py-10" data-testid="compare-page">
      <p className="font-mono text-xs tracking-widest text-slate-brand uppercase">Vast Online Core</p>
      <h1 className="mt-1 text-3xl font-bold text-charcoal">What changed between versions?</h1>
      <p className="mt-2 max-w-xl text-[15px] text-slate-brand">
        Pick the version a customer is on and the one they're moving to — this rolls up everything
        shipped in between.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-brand">
          Upgrading from
          <select value={from} onChange={(e) => set('from', e.target.value)} className={selectCls} data-testid="compare-from" aria-label="From version">
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span className="font-mono text-stone-brand">→</span>
        <label className="flex items-center gap-2 text-sm text-slate-brand">
          to
          <select value={to} onChange={(e) => set('to', e.target.value)} className={selectCls} data-testid="compare-to" aria-label="To version">
            {names.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {state.data && span.length > 0 && (
          <span className="ml-auto rounded-full bg-magenta/10 px-3 py-1 text-sm font-medium text-magenta-deep">
            {totals.all} changes · {totals.features} features · {totals.bugs} fixes
          </span>
        )}
      </div>

      {state.loading && <ReleaseSkeleton />}
      {state.error != null && !state.loading && <ErrorState error={state.error} onRetry={state.retry} />}
      {!state.loading && state.error == null && span.length === 0 && (
        <EmptyState title="Nothing between those versions">
          Pick an older “from” and a newer “to” version to see the rollup.
        </EmptyState>
      )}

      {!state.loading && state.error == null && state.data && (
        <div className="mt-10 space-y-12">
          {state.data.changes.map((c) => (
            <section key={c.version}>
              <div className="mb-4 flex items-baseline gap-3">
                <Link
                  to={`/release/${encodeURIComponent(c.version)}`}
                  className="font-mono text-2xl font-semibold text-charcoal hover:text-magenta-deep"
                >
                  {c.version}
                </Link>
                <span className="font-mono text-xs text-stone-brand">
                  {c.items.length} {c.items.length === 1 ? 'change' : 'changes'}
                </span>
              </div>
              {c.items.length === 0 ? (
                <p className="text-sm text-slate-brand">No itemised changes recorded.</p>
              ) : (
                <div className="space-y-3">
                  {expandedAll &&
                    c.items.map((item, i) => (
                      <ItemCard
                        key={item.id ?? `${c.version}-${i}`}
                        item={item}
                        workItem={item.id ? state.data!.workItems.get(item.id) : undefined}
                      />
                    ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
