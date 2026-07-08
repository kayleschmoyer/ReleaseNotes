/** A version page under the wiki root (e.g. "7.0.7"). */
export interface VersionPage {
  /** Display name, e.g. "7.0.7" */
  name: string
  /** Full wiki path, e.g. "/Vast Online Core/7.0.7" */
  path: string
  /** Link to the page in the Azure DevOps wiki UI */
  remoteUrl?: string
}

export type ItemType = 'feature' | 'bug' | 'story' | 'task' | 'other'

export type SectionKind = 'main' | 'minor' | 'other'

/** A single change (work item) extracted from a release page. */
export interface ReleaseItem {
  type: ItemType
  id?: number
  title: string
  section: SectionKind
  /** Markdown that appeared under this item's heading, if any. */
  body: string
}

/** A non-item section of the page (Deployment Notes, Change Log, ...). */
export interface ReleaseSection {
  title: string
  markdown: string
}

export interface ParsedRelease {
  items: ReleaseItem[]
  sections: ReleaseSection[]
}

/** Live work item details fetched from Azure DevOps. */
export interface WorkItemInfo {
  id: number
  title: string
  state: string
  type: ItemType
}
