import { Navigate, useOutletContext } from 'react-router-dom'
import { ReleaseSkeleton } from '../components/Skeletons'
import { EmptyState } from '../components/States'
import type { ShellContext } from './AppShell'

/** Index route: jump straight to the newest release. */
export function Home() {
  const { versions, versionsLoading } = useOutletContext<ShellContext>()
  if (versionsLoading) return <ReleaseSkeleton />
  const latest = versions[0]
  if (!latest) {
    return (
      <EmptyState title="No releases found">
        The wiki root has no version pages yet. Once a release page is added under Vast Online
        Core, it will show up here.
      </EmptyState>
    )
  }
  return <Navigate to={`/release/${encodeURIComponent(latest.name)}`} replace />
}
