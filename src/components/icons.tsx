/** Minimal line-icon set in the brand's simple line-drawn style. */

type IconProps = { className?: string }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
    </svg>
  )
}

export function BugIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <rect x="8" y="7" width="8" height="11" rx="4" />
      <path d="M9 8a3 3 0 0 1 6 0M3 13h5M16 13h5M5 19l3.2-2.4M19 19l-3.2-2.4M5 7l3.2 2.4M19 7l-3.2 2.4" />
    </svg>
  )
}

export function StoryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M6 4h12v16l-6-3.5L6 20V4Z" />
    </svg>
  )
}

export function DocIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </svg>
  )
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.8-4.8" />
    </svg>
  )
}

export function ExternalIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8M19 14v5H5V5h5" />
    </svg>
  )
}

export function CopyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  )
}

export function PrintIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M7 8V3h10v5M7 17H4v-9h16v9h-3" />
      <rect x="7" y="14" width="10" height="7" />
    </svg>
  )
}

export function CompareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M8 3v18M16 3v18M8 7h8M8 17h8" opacity="0" />
      <path d="M9 5H4v14h5M15 5h5v14h-5M12 2v20" />
    </svg>
  )
}

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  )
}

/** Official four-square Microsoft mark. */
export function MicrosoftIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 21 21" className={className} aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}
