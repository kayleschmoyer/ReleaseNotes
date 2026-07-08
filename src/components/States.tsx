import type { ReactNode } from 'react'
import { LockIcon, SearchIcon } from './icons'

interface StateProps {
  title: string
  children?: ReactNode
  icon?: 'lock' | 'search'
  action?: ReactNode
}

function StateShell({ title, children, icon, action }: StateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center" data-testid="state">
      {icon === 'lock' && <LockIcon className="mb-4 h-10 w-10 text-stone-brand" />}
      {icon === 'search' && <SearchIcon className="mb-4 h-10 w-10 text-stone-brand" />}
      <h2 className="text-lg font-bold text-charcoal">{title}</h2>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-brand">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const status = (error as { status?: number })?.status
  const message = error instanceof Error ? error.message : String(error)

  if (status === 401 || status === 403) {
    return (
      <StateShell title="You don't have access to these notes" icon="lock">
        Your Microsoft account signed in fine, but Azure DevOps wouldn't share the wiki. Ask your admin
        to give you read access to the Vast Online project, then try again.
      </StateShell>
    )
  }
  return (
    <StateShell
      title="Something went wrong"
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="rounded-full bg-magenta px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-magenta-deep"
          >
            Try again
          </button>
        )
      }
    >
      {message}
    </StateShell>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <StateShell title={title} icon="search">
      {children}
    </StateShell>
  )
}
