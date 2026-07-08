import type { ItemType } from './types'

export interface StatusStyle {
  label: string
  /** Tailwind classes for the pill */
  pill: string
  /** Tailwind class for the dot */
  dot: string
}

/**
 * Map Azure DevOps work item states to brand-palette pill styles.
 * Done -> Forest (Automotive sector green), In UAT -> Sky, active -> Mist,
 * new -> Stone, removed -> Scarlet.
 */
export function statusStyle(state: string): StatusStyle {
  const s = state.trim().toLowerCase()
  if (['done', 'closed', 'resolved', 'completed', 'released'].includes(s)) {
    return { label: state, pill: 'bg-forest/10 text-forest', dot: 'bg-forest' }
  }
  if (s.includes('uat') || s.includes('test') || s.includes('qa')) {
    return { label: state, pill: 'bg-sky/40 text-slate-brand', dot: 'bg-ocean' }
  }
  if (['in progress', 'active', 'committed', 'doing', 'in development'].includes(s)) {
    return { label: state, pill: 'bg-mist/20 text-slate-brand', dot: 'bg-mist' }
  }
  if (['removed', 'rejected', 'wont fix', "won't fix"].includes(s)) {
    return { label: state, pill: 'bg-scarlet/10 text-scarlet', dot: 'bg-scarlet' }
  }
  return { label: state, pill: 'bg-stone-brand/15 text-slate-brand', dot: 'bg-stone-brand' }
}

export function typeMeta(type: ItemType): { label: string; accent: string; chip: string } {
  switch (type) {
    case 'feature':
      return { label: 'Feature', accent: 'text-lilac', chip: 'bg-lilac/10 text-lilac' }
    case 'bug':
      return { label: 'Bug', accent: 'text-scarlet', chip: 'bg-scarlet/10 text-scarlet' }
    case 'story':
      return { label: 'Backlog Item', accent: 'text-ocean', chip: 'bg-ocean/10 text-ocean' }
    case 'task':
      return { label: 'Task', accent: 'text-mist', chip: 'bg-mist/20 text-slate-brand' }
    default:
      return { label: 'Change', accent: 'text-slate-brand', chip: 'bg-stone-brand/15 text-slate-brand' }
  }
}
