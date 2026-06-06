'use client'

import { cn } from '@/lib/utils'

/**
 * Live allocation validation bar. Shows the running total for one side and
 * turns green at exactly 100%, red when over/under.
 */
export function PayoutSplitter({
  total,
  label,
}: {
  total: number
  label: string
}) {
  const exact = total === 100
  const over = total > 100
  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('tabular-nums', exact ? 'text-success' : 'text-danger')}>{total}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={cn('h-full transition-all duration-300', exact ? 'bg-success' : 'bg-danger')}
          style={{ width: `${Math.min(100, total)}%` }}
        />
      </div>
      {!exact && (
        <p className="mt-1.5 font-mono text-[11px] text-danger">
          {over ? 'Allocations must total 100%.' : 'Allocations must total 100%.'}
        </p>
      )}
    </div>
  )
}
