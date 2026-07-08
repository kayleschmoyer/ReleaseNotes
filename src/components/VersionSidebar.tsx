import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { majorSeries } from '../lib/versionSort'
import type { VersionPage } from '../lib/types'
import { SearchIcon } from './icons'

interface VersionSidebarProps {
  versions: VersionPage[]
  onNavigate?: () => void
}

export function VersionSidebar({ versions, onNavigate }: VersionSidebarProps) {
  const [filter, setFilter] = useState('')

  const groups = useMemo(() => {
    const filtered = filter
      ? versions.filter((v) => v.name.toLowerCase().includes(filter.toLowerCase()))
      : versions
    const map = new Map<string, VersionPage[]>()
    for (const v of filtered) {
      const key = majorSeries(v.name)
      map.set(key, [...(map.get(key) ?? []), v])
    }
    return [...map.entries()]
  }, [versions, filter])

  return (
    <nav className="flex h-full flex-col" aria-label="Versions" data-testid="version-sidebar">
      <div className="px-4 pt-5 pb-3">
        <p className="font-mono text-[11px] tracking-widest text-stone-brand uppercase">Releases</p>
        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-stone-brand" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter versions"
            aria-label="Filter versions"
            className="w-full rounded-xl border border-charcoal/10 bg-white py-2 pr-3 pl-9 text-sm placeholder:text-stone-brand focus:border-magenta"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {groups.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-brand">No versions match “{filter}”.</p>
        )}
        {groups.map(([series, list]) => (
          <div key={series} className="mt-2">
            <p className="px-3 py-1 font-mono text-[11px] text-stone-brand">{series}</p>
            <ul>
              {list.map((v) => (
                <li key={v.path}>
                  <NavLink
                    to={`/release/${encodeURIComponent(v.name)}`}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group mx-1 my-0.5 flex items-center justify-between rounded-xl px-3 py-2 font-mono text-sm transition-colors ${
                        isActive
                          ? 'bg-magenta font-semibold text-white'
                          : 'text-charcoal hover:bg-charcoal/5'
                      }`
                    }
                  >
                    {v.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
