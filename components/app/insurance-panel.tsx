'use client'

import { Shield, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatUSD } from '@/lib/utils'

/**
 * Insurance panel shown on the Create Deal review step for deals above $500.
 * Toggle enables insurance at 1% of deal value.
 */
export function InsurancePanel({
  amount,
  enabled,
  onToggle,
  buyers,
}: {
  amount: number
  enabled: boolean
  onToggle: (v: boolean) => void
  /** Multi-buyer allocations to show the proportional split. */
  buyers?: { email: string; allocation: number }[]
}) {
  if (amount <= 500) return null
  const fee = Math.round(amount * 0.01 * 100) / 100
  const totalLocked = amount + (enabled ? fee : 0)

  return (
    <div className={cn('glass rounded-lg border p-4 transition-colors', enabled ? 'border-gold/40' : 'border-border')}>
      <div className="flex items-start gap-3">
        <Shield className={cn('mt-0.5 h-5 w-5 shrink-0', enabled ? 'text-gold' : 'text-muted-foreground')} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-medium text-foreground">Deal Insurance</h3>
            <span className="group relative">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="pointer-events-none absolute left-1/2 top-6 z-10 w-56 -translate-x-1/2 rounded-md border border-border bg-popover p-2 text-[11px] text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Insurance covers the buyer against a failed settlement or seller default, reimbursing the locked amount.
              </span>
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Protect this deal for 1% of its value. Recommended for high-value agreements.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors',
            enabled ? 'bg-gold' : 'bg-border',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-4 space-y-1 border-t border-border pt-3 font-mono text-sm animate-fade-in">
          <div className="flex justify-between text-muted-foreground">
            <span>Insurance fee (1%)</span>
            <span className="text-gold">{formatUSD(fee)}</span>
          </div>
          <div className="flex justify-between text-foreground">
            <span>Total locked</span>
            <span className="font-semibold text-gold">{formatUSD(totalLocked)}</span>
          </div>
          {buyers && buyers.length > 1 && (
            <div className="mt-2 space-y-0.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
              <p className="uppercase tracking-wider">Fee split by allocation</p>
              {buyers.map((b) => (
                <div key={b.email} className="flex justify-between">
                  <span className="truncate">{b.email}</span>
                  <span>{formatUSD(Math.round(fee * (b.allocation / 100) * 100) / 100)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
