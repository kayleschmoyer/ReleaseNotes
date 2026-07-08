import { useState } from 'react'
import { workItemUrl } from '../lib/config'
import { typeMeta } from '../lib/status'
import type { ReleaseItem, WorkItemInfo } from '../lib/types'
import { Markdown } from './Markdown'
import { StatusPill } from './StatusPill'
import { BugIcon, ChevronIcon, DocIcon, ExternalIcon, StoryIcon, TrophyIcon } from './icons'

function TypeIcon({ type, className }: { type: ReleaseItem['type']; className?: string }) {
  switch (type) {
    case 'feature':
      return <TrophyIcon className={className} />
    case 'bug':
      return <BugIcon className={className} />
    case 'story':
      return <StoryIcon className={className} />
    default:
      return <DocIcon className={className} />
  }
}

interface ItemCardProps {
  item: ReleaseItem
  workItem?: WorkItemInfo
}

export function ItemCard({ item, workItem }: ItemCardProps) {
  const [open, setOpen] = useState(false)
  // Live work item data wins over what was parsed from the page.
  const type = workItem?.type && workItem.type !== 'other' ? workItem.type : item.type
  const title = item.title || workItem?.title || ''
  const meta = typeMeta(type)
  const hasBody = item.body.length > 0

  return (
    <article
      className="group rounded-2xl border border-charcoal/8 bg-white shadow-card transition-shadow hover:shadow-card-hover"
      data-testid="item-card"
    >
      <div
        className={`flex items-start gap-4 p-4 sm:p-5 ${hasBody ? 'cursor-pointer' : ''}`}
        onClick={hasBody ? () => setOpen((o) => !o) : undefined}
      >
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
          <TypeIcon type={type} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={`text-[11px] font-semibold tracking-wide uppercase ${meta.accent}`}>{meta.label}</span>
            {item.id && (
              <a
                href={workItemUrl(item.id)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-xs text-slate-brand hover:text-magenta-deep"
                title="Open work item in Azure DevOps"
              >
                #{item.id}
                <ExternalIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            )}
            {workItem?.state && <StatusPill state={workItem.state} />}
          </div>
          <h3 className="mt-1 text-[15px] leading-snug font-semibold text-charcoal">{title}</h3>
        </div>
        {hasBody && (
          <ChevronIcon
            className={`mt-1 h-4 w-4 shrink-0 text-stone-brand transition-transform ${open ? 'rotate-90' : ''}`}
          />
        )}
      </div>
      {hasBody && open && (
        <div className="border-t border-charcoal/6 px-4 pt-3 pb-4 sm:px-5">
          <Markdown className="prose-brand text-slate-brand">{item.body}</Markdown>
        </div>
      )}
    </article>
  )
}
