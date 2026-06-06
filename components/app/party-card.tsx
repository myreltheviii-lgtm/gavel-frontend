'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleBadgeClass } from '@/lib/party-utils'
import { GavelScorePill } from '@/components/app/gavel-score'
import { store } from '@/lib/mock-store'

export interface PartyDraft {
  id: string
  email: string
  role: 'buyer' | 'seller'
  allocation: number
  /** The creator's own buyer row cannot be removed. */
  locked?: boolean
}

/**
 * Editable party row used inside the Create Deal "Deal Parties" section.
 * Shows email input, role badge, allocation input, score pill, and remove button.
 */
export function PartyCard({
  party,
  amount,
  index,
  removable,
  onChange,
  onRemove,
}: {
  party: PartyDraft
  amount: number
  index: number
  removable: boolean
  onChange: (patch: Partial<PartyDraft>) => void
  onRemove: () => void
}) {
  const roleLabel = party.role === 'buyer' ? 'Buyer' : 'Seller'
  const lockedAmount = amount > 0 ? Math.round((amount * party.allocation) / 100) : 0
  const score = party.email.includes('@') ? store.scoreFor(party.email) : null

  return (
    <div className="glass rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
            roleBadgeClass(party.role),
          )}
        >
          {roleLabel} {index + 1}
        </span>
        {score != null && <GavelScorePill score={score} />}
        <div className="ml-auto flex items-center gap-2">
          {party.locked && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">you</span>
          )}
          {removable && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${roleLabel} ${index + 1}`}
              className="text-muted-foreground transition-colors hover:text-danger"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Email or user ID</label>
          <input
            value={party.email}
            disabled={party.locked}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder={party.role === 'buyer' ? 'buyer@example.com' : 'seller@example.com'}
            className={cn(
              'mt-1 w-full border-0 border-b border-border bg-transparent pb-1.5 text-sm text-foreground outline-none focus:border-gold',
              party.locked && 'opacity-70',
            )}
          />
        </div>
        <div className="sm:w-28">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Allocation</label>
          <div className="mt-1 flex items-center gap-1 border-b border-border focus-within:border-gold">
            <input
              type="number"
              min={0}
              max={100}
              value={party.allocation === 0 ? '' : party.allocation}
              onChange={(e) => onChange({ allocation: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              placeholder="0"
              className="w-full bg-transparent pb-1.5 font-mono text-sm text-foreground outline-none"
            />
            <span className="pb-1.5 font-mono text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {amount > 0 && party.allocation > 0 && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Locks {lockedAmount.toLocaleString()} USDT ({party.allocation}% of {amount.toLocaleString()})
        </p>
      )}
    </div>
  )
}
