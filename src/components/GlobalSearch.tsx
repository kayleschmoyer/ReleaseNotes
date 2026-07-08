import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../api/DataProvider'
import { parseReleaseNotes } from '../lib/parseReleaseNotes'
import { typeMeta } from '../lib/status'
import type { ReleaseItem, VersionPage } from '../lib/types'
import { SearchIcon } from './icons'

interface IndexedItem extends ReleaseItem {
  version: string
}

interface GlobalSearchProps {
  versions: VersionPage[]
}

/**
 * Header search across every release. The full index (all wiki pages) is
 * built lazily the first time the search is used, then kept in memory.
 */
export function GlobalSearch({ versions }: GlobalSearchProps) {
  const data = useData()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState<IndexedItem[] | null>(null)
  const [indexing, setIndexing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // "/" focuses search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  const buildIndex = useCallback(async () => {
    if (index || indexing || versions.length === 0) return
    setIndexing(true)
    try {
      const all = await Promise.all(
        versions.map(async (v) => {
          try {
            const md = await data.getReleaseMarkdown(v.path)
            return parseReleaseNotes(md).items.map((item) => ({ ...item, version: v.name }))
          } catch {
            return [] // one unreadable page shouldn't kill search
          }
        }),
      )
      setIndex(all.flat())
    } finally {
      setIndexing(false)
    }
  }, [data, index, indexing, versions])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const versionHits = versions
      .filter((v) => v.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((v) => ({ kind: 'version' as const, version: v.name }))
    const itemHits = (index ?? [])
      .filter((i) => i.title.toLowerCase().includes(q) || String(i.id ?? '').includes(q))
      .slice(0, 12)
      .map((i) => ({ kind: 'item' as const, item: i }))
    return [...versionHits, ...itemHits]
  }, [query, index, versions])

  const go = (version: string) => {
    setOpen(false)
    setQuery('')
    navigate(`/release/${encodeURIComponent(version)}`)
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md" data-testid="global-search">
      <SearchIcon className="pointer-events-none absolute top-2.5 left-3.5 h-4 w-4 text-stone-brand" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setOpen(true)
          void buildIndex()
        }}
        placeholder="Search releases and changes…  ( / )"
        aria-label="Search all releases"
        className="w-full rounded-full border border-charcoal/10 bg-biscuit py-2 pr-4 pl-10 text-sm placeholder:text-stone-brand focus:border-magenta focus:bg-white"
      />
      {open && query.trim() && (
        <div className="absolute top-11 right-0 left-0 z-50 max-h-[26rem] overflow-y-auto rounded-2xl border border-charcoal/10 bg-white p-2 shadow-card-hover">
          {indexing && !index && (
            <p className="px-3 py-3 text-sm text-slate-brand">Indexing all releases…</p>
          )}
          {results.length === 0 && !indexing && (
            <p className="px-3 py-3 text-sm text-slate-brand">No matches for “{query.trim()}”.</p>
          )}
          {results.map((r, i) =>
            r.kind === 'version' ? (
              <button
                key={`v-${i}`}
                onClick={() => go(r.version)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-biscuit"
              >
                <span className="rounded-lg bg-magenta/10 px-2 py-0.5 font-mono text-xs font-semibold text-magenta-deep">
                  {r.version}
                </span>
                <span className="text-sm text-charcoal">View release notes</span>
              </button>
            ) : (
              <button
                key={`i-${i}`}
                onClick={() => go(r.item.version)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-biscuit"
              >
                <span className={`mt-0.5 text-[10px] font-semibold uppercase ${typeMeta(r.item.type).accent}`}>
                  {typeMeta(r.item.type).label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-charcoal">{r.item.title}</span>
                  <span className="font-mono text-xs text-stone-brand">
                    {r.item.id ? `#${r.item.id} · ` : ''}
                    {r.item.version}
                  </span>
                </span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
