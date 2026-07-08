/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { demoPages, demoVersions, demoWorkItems } from '../lib/fixtures'
import { useMode } from '../lib/mode'
import { compareVersionsDesc } from '../lib/versionSort'
import type { VersionPage, WorkItemInfo } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { AdoClient, AdoError } from './ado'

export interface DataSource {
  listVersions(): Promise<VersionPage[]>
  getReleaseMarkdown(path: string): Promise<string>
  getWorkItems(ids: number[]): Promise<Map<number, WorkItemInfo>>
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function createDemoSource(): DataSource {
  return {
    async listVersions() {
      await delay(250)
      return [...demoVersions].sort((a, b) => compareVersionsDesc(a.name, b.name))
    },
    async getReleaseMarkdown(path) {
      await delay(200)
      const md = demoPages.get(path)
      if (md === undefined) throw new Error(`No demo page at ${path}`)
      return md
    },
    async getWorkItems(ids) {
      await delay(150)
      const map = new Map<number, WorkItemInfo>()
      for (const id of ids) {
        const wi = demoWorkItems.get(id)
        if (wi) map.set(id, wi)
      }
      return map
    },
  }
}

/** Fired when the server rejects our session so the UI returns to sign-in. */
export const UNAUTHORIZED_EVENT = 'app:unauthorized'

/** Talks to the bundled Node server, which proxies Azure DevOps with its PAT. */
function createServerSource(): DataSource {
  const get = async <T,>(url: string): Promise<T> => {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      // Session expired (e.g. the server restarted) — go back to sign-in.
      if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new AdoError(res.status, body.error ?? `Request failed (${res.status})`)
    }
    return (await res.json()) as T
  }
  return {
    listVersions: () => get<VersionPage[]>('/api/versions'),
    getReleaseMarkdown: (path) =>
      get<{ content: string }>(`/api/release?path=${encodeURIComponent(path)}`).then((r) => r.content),
    async getWorkItems(ids) {
      if (ids.length === 0) return new Map()
      const res = await get<{ value: Array<{ id: number; fields: Record<string, unknown> }> }>(
        `/api/workitems?ids=${[...new Set(ids)].join(',')}`,
      )
      return new Map(
        res.value.map((wi) => {
          const adoType = String(wi.fields['System.WorkItemType'] ?? '').toLowerCase()
          const type =
            adoType === 'feature' || adoType === 'epic'
              ? ('feature' as const)
              : adoType === 'bug' || adoType === 'defect'
                ? ('bug' as const)
                : adoType.includes('story') || adoType.includes('backlog')
                  ? ('story' as const)
                  : adoType === 'task'
                    ? ('task' as const)
                    : ('other' as const)
          return [
            wi.id,
            {
              id: wi.id,
              title: String(wi.fields['System.Title'] ?? ''),
              state: String(wi.fields['System.State'] ?? ''),
              type,
            } satisfies WorkItemInfo,
          ]
        }),
      )
    },
  }
}

/** Session-lifetime caches so navigating between versions is instant. */
function withCache(source: DataSource): DataSource {
  let versions: Promise<VersionPage[]> | null = null
  const pages = new Map<string, Promise<string>>()
  const workItems = new Map<number, WorkItemInfo>()

  return {
    listVersions() {
      versions ??= source.listVersions().catch((err) => {
        versions = null
        throw err
      })
      return versions
    },
    getReleaseMarkdown(path) {
      let p = pages.get(path)
      if (!p) {
        p = source.getReleaseMarkdown(path).catch((err) => {
          pages.delete(path)
          throw err
        })
        pages.set(path, p)
      }
      return p
    },
    async getWorkItems(ids) {
      const missing = ids.filter((id) => !workItems.has(id))
      if (missing.length) {
        const fetched = await source.getWorkItems(missing)
        for (const [id, wi] of fetched) workItems.set(id, wi)
      }
      const result = new Map<number, WorkItemInfo>()
      for (const id of ids) {
        const wi = workItems.get(id)
        if (wi) result.set(id, wi)
      }
      return result
    },
  }
}

const DataContext = createContext<DataSource | null>(null)

export function useData(): DataSource {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}

export function DataProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  const { getToken } = useAuth()
  const source = useMemo(() => {
    if (mode === 'demo') return withCache(createDemoSource())
    if (mode === 'server') return withCache(createServerSource())
    const client = new AdoClient(getToken)
    return withCache({
      listVersions: () => client.listVersions(),
      getReleaseMarkdown: (path) => client.getPageMarkdown(path),
      getWorkItems: (ids) => client.getWorkItems(ids),
    })
  }, [mode, getToken])
  return <DataContext.Provider value={source}>{children}</DataContext.Provider>
}
