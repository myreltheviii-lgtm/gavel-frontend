import { cn } from '@/lib/utils'

/** GAVEL gavel mark — a clean line-art gavel + sound block. */
export function GavelIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('h-6 w-6', className)} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* hammer head */}
        <rect x="22.5" y="6.5" width="14" height="9" rx="1.5" transform="rotate(45 29.5 11)" />
        {/* handle */}
        <line x1="22" y1="18" x2="11" y2="29" />
        {/* sound block */}
        <line x1="14" y1="40" x2="30" y2="40" />
        <rect x="17" y="34" width="10" height="6" rx="1" />
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display tracking-wide', className)}>GAVEL</span>
  )
}

export function Logo({ className, mark = true }: { className?: string; mark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      {mark && <GavelIcon className="h-6 w-6 text-gold" />}
      <Wordmark className="text-2xl leading-none" />
    </span>
  )
}
