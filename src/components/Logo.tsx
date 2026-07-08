interface MarqueProps {
  className?: string
  stroke?: string
}

/** Two interlocking diamonds — the brand marque. */
export function Marque({ className, stroke = '#ED017F' }: MarqueProps) {
  return (
    <svg viewBox="0 0 48 32" className={className} aria-hidden="true" fill="none">
      <rect x="6" y="6" width="20" height="20" rx="5.5" transform="rotate(45 16 16)" stroke={stroke} strokeWidth="4.5" />
      <rect x="22" y="6" width="20" height="20" rx="5.5" transform="rotate(45 32 16)" stroke={stroke} strokeWidth="4.5" opacity="0.55" />
    </svg>
  )
}

interface LogoProps {
  /** 'dark' for light backgrounds, 'light' for the magenta panel */
  tone?: 'dark' | 'light'
  size?: 'sm' | 'lg'
}

/** Autowork One wordmark (SVG-free recreation; swap for the official asset when available). */
export function Logo({ tone = 'dark', size = 'sm' }: LogoProps) {
  const primary = tone === 'dark' ? 'text-charcoal' : 'text-white'
  const secondary = tone === 'dark' ? 'text-stone-brand' : 'text-white/70'
  const stroke = tone === 'dark' ? '#ED017F' : '#FFFFFF'
  const text = size === 'lg' ? 'text-4xl' : 'text-xl'
  const marque = size === 'lg' ? 'h-7' : 'h-4'

  return (
    <span className="inline-flex flex-col leading-none select-none" data-testid="logo">
      <span className={`inline-flex items-start gap-1 ${text}`}>
        <span className={`font-bold tracking-tight ${primary}`}>Autowork</span>
        <Marque className={`${marque} mt-0.5`} stroke={stroke} />
      </span>
      <span className={`${text} font-light tracking-tight ${secondary}`}>One</span>
    </span>
  )
}
