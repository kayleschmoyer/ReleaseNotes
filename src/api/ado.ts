import { config } from '../lib/config'
import type { ItemType, VersionPage, WorkItemInfo } from '../lib/types'

const API = '7.1'

export class AdoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AdoError'
  }
}

interface WikiPageDto {
  path: string
  remoteUrl?: string
  content?: string
  subPages?: WikiPageDto[]
}

interface WorkItemDto {
  id: number
  fields: Record<string, unknown>
}

function toItemType(adoType: string): ItemType {
  const t = adoType.toLowerCase()
  if (t === 'feature' || t === 'epic') return 'feature'
  if (t === 'bug' || t === 'defect') return 'bug'
  if (t.includes('story') || t.includes('backlog')) return 'story'
  if (t === 'task') return 'task'
  return 'other'
}

/**
 * Thin typed client for the Azure DevOps REST API, authenticated with the
 * signed-in user's Entra token (so wiki/work-item permissions apply per user).
 */
export class AdoClient {
  private base = `https://dev.azure.com/${config.org}/${encodeURIComponent(config.project)}/_apis`

  constructor(private getToken: () => Promise<string>) {}

  private async request<T>(url: string): Promise<T> {
    const token = await this.getToken()
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (!res.ok) {
      let detail = ''
      try {
        detail = ((await res.json()) as { message?: string }).message ?? ''
      } catch {
        /* non-JSON error body */
      }
      throw new AdoError(res.status, detail || `Azure DevOps request failed (${res.status})`)
    }
    return (await res.json()) as T
  }

  /** List the version pages under the wiki root path. */
  async listVersions(): Promise<VersionPage[]> {
    const url =
      `${this.base}/wiki/wikis/${encodeURIComponent(config.wiki)}/pages` +
      `?path=${encodeURIComponent(config.rootPath)}&recursionLevel=oneLevel&api-version=${API}`
    const page = await this.request<WikiPageDto>(url)
    return (page.subPages ?? []).map((p) => ({
      name: p.path.split('/').filter(Boolean).pop() ?? p.path,
      path: p.path,
      remoteUrl: p.remoteUrl,
    }))
  }

  /** Fetch a wiki page's markdown content. */
  async getPageMarkdown(path: string): Promise<string> {
    const url =
      `${this.base}/wiki/wikis/${encodeURIComponent(config.wiki)}/pages` +
      `?path=${encodeURIComponent(path)}&includeContent=True&api-version=${API}`
    const page = await this.request<WikiPageDto>(url)
    return page.content ?? ''
  }

  /** Batch-fetch work item title/state/type (chunks of 200, the API limit). */
  async getWorkItems(ids: number[]): Promise<Map<number, WorkItemInfo>> {
    const map = new Map<number, WorkItemInfo>()
    const unique = [...new Set(ids)]
    for (let i = 0; i < unique.length; i += 200) {
      const chunk = unique.slice(i, i + 200)
      const url =
        `${this.base}/wit/workitems?ids=${chunk.join(',')}` +
        `&fields=System.Title,System.State,System.WorkItemType&errorPolicy=omit&api-version=${API}`
      const res = await this.request<{ value: WorkItemDto[] }>(url)
      for (const wi of res.value ?? []) {
        map.set(wi.id, {
          id: wi.id,
          title: String(wi.fields['System.Title'] ?? ''),
          state: String(wi.fields['System.State'] ?? ''),
          type: toItemType(String(wi.fields['System.WorkItemType'] ?? '')),
        })
      }
    }
    return map
  }
}
