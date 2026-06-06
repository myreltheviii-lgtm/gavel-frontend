import { cn } from '@/lib/utils'
import type { DealStatus, Verdict } from '@/lib/types'

const STATUS_STYLES: Record<DealStatus, string> = {
  LOCKED: 'text-amber-300 border-amber-400/30 bg-amber-400/10',
  DELIVERED: 'text-blue border-blue/30 bg-blue/10',
  JUDGING: 'text-[#a67be8] border-[#a67be8]/40 bg-[#a67be8]/10 animate-judging',
  JUDGED: 'text-success border-success/30 bg-success/10',
  SETTLED: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10',
  EXPIRED: 'text-muted-foreground border-border bg-muted',
  CANCELLED: 'text-danger border-danger/30 bg-danger/10',
}

export function StatusBadge({ status, className }: { status: DealStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider',
        STATUS_STYLES[status],
        className,
      )}
    >
      {status === 'JUDGING' && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />
      )}
      {status}
    </span>
  )
}

const VERDICT_STYLES: Record<Verdict, string> = {
  RELEASE: 'text-success border-success/40 bg-success/10',
  RETURN: 'text-danger border-danger/40 bg-danger/10',
  PARTIAL: 'text-gold border-gold/40 bg-gold/10',
}

export function VerdictBadge({
  verdict,
  className,
  size = 'md',
}: {
  verdict: Verdict
  className?: string
  size?: 'md' | 'lg'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-mono font-semibold uppercase tracking-widest',
        VERDICT_STYLES[verdict],
        size === 'lg' ? 'px-5 py-2 text-lg' : 'px-3 py-1 text-xs',
        className,
      )}
    >
      {verdict}
    </span>
  )
}
