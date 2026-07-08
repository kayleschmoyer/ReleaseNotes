/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { isDemoMode } from '../lib/config'
import { demoPages, demoVersions, demoWorkItems } from '../lib/fixtures'
import { compareVersionsDesc } from '../lib/versionSort'
import type { VersionPage, WorkItemInfo } from '../lib/types'
import { useAuth } from '../auth/AuthProvider'
import { AdoClient } from './ado'

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
  const { getToken } = useAuth()
  const source = useMemo(() => {
    if (isDemoMode) return withCache(createDemoSource())
    const client = new AdoClient(getToken)
    return withCache({
      listVersions: () => client.listVersions(),
      getReleaseMarkdown: (path) => client.getPageMarkdown(path),
      getWorkItems: (ids) => client.getWorkItems(ids),
    })
  }, [getToken])
  return <DataContext.Provider value={source}>{children}</DataContext.Provider>
}
