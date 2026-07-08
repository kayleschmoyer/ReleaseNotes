import { useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useData } from '../api/DataProvider'
import { useAsync } from '../lib/useAsync'
import { compareVersionsDesc } from '../lib/versionSort'
import { useMode } from '../lib/mode'
import { Logo } from '../components/Logo'
import { GlobalSearch } from '../components/GlobalSearch'
import { VersionSidebar } from '../components/VersionSidebar'
import { SidebarSkeleton } from '../components/Skeletons'
import { ErrorState } from '../components/States'
import { CloseIcon, CompareIcon, MenuIcon } from '../components/icons'
import type { VersionPage } from '../lib/types'

export interface ShellContext {
  versions: VersionPage[]
  versionsLoading: boolean
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const mode = useMode()
  const data = useData()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const versionsState = useAsync(() => data.listVersions(), [data])
  const versions = useMemo(
    () => [...(versionsState.data ?? [])].sort((a, b) => compareVersionsDesc(a.name, b.name)),
    [versionsState.data],
  )

  if (!user) return <Navigate to="/signin" replace state={{ from: location }} />

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen flex-col bg-biscuit">
      <header className="no-print sticky top-0 z-40 border-b border-charcoal/8 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
          <button
            className="rounded-lg p-2 text-charcoal hover:bg-charcoal/5 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open version list"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <Link to="/" className="shrink-0" aria-label="Home">
            <Logo />
          </Link>
          <div className="hidden flex-1 justify-center sm:flex">
            <GlobalSearch versions={versions} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/compare"
              className="hidden items-center gap-2 rounded-full border border-charcoal/10 px-4 py-2 text-sm font-medium text-charcoal transition-colors hover:border-magenta hover:text-magenta-deep md:inline-flex"
            >
              <CompareIcon className="h-4 w-4" />
              Compare
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account menu"
                data-testid="user-menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta text-sm font-semibold text-white transition-colors hover:bg-magenta-deep"
              >
                {initials || 'U'}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-charcoal/10 bg-white p-2 shadow-card-hover">
                  <div className="border-b border-charcoal/8 px-3 py-2.5">
                    <p className="text-sm font-semibold text-charcoal">{user.name}</p>
                    <p className="truncate text-xs text-slate-brand">{user.email}</p>
                    {mode === 'demo' && (
                      <p className="mt-1 font-mono text-[10px] text-magenta-deep">demo mode · sample data</p>
                    )}
                  </div>
                  <button
                    onClick={signOut}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-charcoal hover:bg-biscuit"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 sm:hidden">
          <GlobalSearch versions={versions} />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-[61px] hidden h-[calc(100vh-61px)] w-60 shrink-0 border-r border-charcoal/8 bg-white lg:block">
          {versionsState.loading ? (
            <SidebarSkeleton />
          ) : versionsState.error ? (
            <p className="p-4 text-sm text-slate-brand">Couldn't load versions.</p>
          ) : (
            <VersionSidebar versions={versions} />
          )}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-charcoal/40" onClick={() => setDrawerOpen(false)} />
            <div className="absolute top-0 bottom-0 left-0 w-72 bg-white shadow-card-hover">
              <div className="flex justify-end p-2">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 hover:bg-charcoal/5"
                  aria-label="Close version list"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <VersionSidebar versions={versions} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 print-full">
          {versionsState.error && !versionsState.loading ? (
            <ErrorState error={versionsState.error} onRetry={versionsState.retry} />
          ) : (
            <Outlet context={{ versions, versionsLoading: versionsState.loading } satisfies ShellContext} />
          )}
        </main>
      </div>
    </div>
  )
}
