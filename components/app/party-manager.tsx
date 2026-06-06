'use client'

import { UserPlus, Users } from 'lucide-react'
import { PartyCard, type PartyDraft } from '@/components/app/party-card'
import { PayoutSplitter } from '@/components/app/payout-splitter'

const MAX_PER_SIDE = 5

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9)
}

export function makeDefaultParties(creatorEmail: string): PartyDraft[] {
  return [
    { id: uid(), email: creatorEmail, role: 'buyer', allocation: 100, locked: true },
    { id: uid(), email: '', role: 'seller', allocation: 100 },
  ]
}

/**
 * Deal Parties manager. Renders buyer and seller rows, add buttons (max 5 each),
 * and a live validation bar per side. Parent owns the state.
 */
export function PartyManager({
  parties,
  amount,
  onChange,
}: {
  parties: PartyDraft[]
  amount: number
  onChange: (next: PartyDraft[]) => void
}) {
  const buyers = parties.filter((p) => p.role === 'buyer')
  const sellers = parties.filter((p) => p.role === 'seller')
  const buyerTotal = buyers.reduce((s, p) => s + p.allocation, 0)
  const sellerTotal = sellers.reduce((s, p) => s + p.allocation, 0)

  function addParty(role: 'buyer' | 'seller') {
    const side = role === 'buyer' ? buyers : sellers
    if (side.length >= MAX_PER_SIDE) return
    onChange([...parties, { id: uid(), email: '', role, allocation: 0 }])
  }

  function updateParty(id: string, patch: Partial<PartyDraft>) {
    onChange(parties.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removeParty(id: string) {
    onChange(parties.filter((p) => p.id !== id))
  }

  function renderSide(role: 'buyer' | 'seller', list: PartyDraft[], total: number) {
    const sideLabel = role === 'buyer' ? 'Buyers' : 'Sellers'
    return (
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{sideLabel}</h3>
          <button
            type="button"
            onClick={() => addParty(role)}
            disabled={list.length >= MAX_PER_SIDE}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-gold transition-opacity hover:underline disabled:opacity-40"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add {role === 'buyer' ? 'Buyer' : 'Seller'}
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {list.map((p) => {
            const idx = list.findIndex((x) => x.id === p.id)
            return (
              <PartyCard
                key={p.id}
                party={p}
                amount={amount}
                index={idx}
                removable={!p.locked && list.length > 1}
                onChange={(patch) => updateParty(p.id, patch)}
                onRemove={() => removeParty(p.id)}
              />
            )
          })}
        </div>
        <div className="mt-3">
          <PayoutSplitter total={total} label={`${sideLabel} total`} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-gold" />
        <h2 className="font-display text-2xl font-medium text-foreground">Deal Parties</h2>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">
        Add up to {MAX_PER_SIDE} buyers and {MAX_PER_SIDE} sellers. Allocations on each side must total exactly 100%.
      </p>
      {renderSide('buyer', buyers, buyerTotal)}
      {renderSide('seller', sellers, sellerTotal)}
    </div>
  )
}

/** Validity check the parent uses to gate the submit button. */
export function partiesValid(parties: PartyDraft[]): boolean {
  const buyers = parties.filter((p) => p.role === 'buyer')
  const sellers = parties.filter((p) => p.role === 'seller')
  if (buyers.length === 0 || sellers.length === 0) return false
  const buyerTotal = buyers.reduce((s, p) => s + p.allocation, 0)
  const sellerTotal = sellers.reduce((s, p) => s + p.allocation, 0)
  const allHaveEmail = parties.every((p) => p.email.trim().length > 0)
  return buyerTotal === 100 && sellerTotal === 100 && allHaveEmail
}
