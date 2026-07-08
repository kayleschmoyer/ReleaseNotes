export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      <div className="skeleton h-3 w-16" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skeleton h-9 w-full" />
      ))}
    </div>
  )
}

export function ReleaseSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10" aria-hidden="true">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-12 w-56" />
      <div className="flex gap-3">
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-24 rounded-full" />
      </div>
      <div className="skeleton h-4 w-40" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton h-20 w-full rounded-2xl" />
      ))}
    </div>
  )
}
