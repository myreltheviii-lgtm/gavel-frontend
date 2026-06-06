'use client'

import { useMemo, useState } from 'react'
import { Check, Clock, Loader2, Scale } from 'lucide-react'
import { cn, formatUSD } from '@/lib/utils'
import { partyLabel } from '@/lib/party-utils'
import type { Deal, Party } from '@/lib/types'

/**
 * Settlement payout splitter for multi-party deals during settlement (JUDGED).
 * - Breakdown table where each seller payout is adjusted independently.
 * - The remaining amount flows to the buyers proportionally by allocation.
 * - All parties must confirm before settlement can execute.
 * - Confirmation checklist shows who has confirmed and who is pending.
 */
export function SettlementSplitter({
  deal,
  currentUserId,
  currentUserEmail,
  busy,
  onSettle,
}: {
  deal: Deal
  currentUserId?: string
  currentUserEmail?: string
  busy?: boolean
  onSettle: () => void
}) {
  const parties = deal.parties ?? []
  const sellers = parties.filter((p) => p.role === 'seller')
  const buyers = parties.filter((p) => p.role === 'buyer')

  // Initial seller payouts come from the AI verdict breakdown (or full allocation).
  const sellerAmount = (p: Party) => Math.round((deal.amount * p.allocation) / 100)
  const [payouts, setPayouts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const s of sellers) init[s.id] = s.payout ?? sellerAmount(s)
    return init
  })

  // Local confirmation tracking. Buyers who already confirmed during the deal
  // start confirmed; everyone must confirm the final split here.
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})

  const totalSellerPayout = useMemo(
    () => sellers.reduce((sum, s) => sum + (payouts[s.id] ?? 0), 0),
    [sellers, payouts],
  )
  const buyerRemaining = Math.max(0, deal.amount - totalSellerPayout)
  const buyerAllocTotal = buyers.reduce((s, b) => s + b.allocation, 0) || 100

  function setSellerPayout(id: string, value: number, max: number) {
    const v = Math.max(0, Math.min(max, Math.round(value) || 0))
    setPayouts((prev) => ({ ...prev, [id]: v }))
    // Re-confirmation required after any change to the split.
    setConfirmed({})
  }

  function isYou(p: Party) {
    return p.userId === currentUserId || p.email === currentUserEmail
  }

  function toggleConfirm(p: Party) {
    if (!isYou(p)) return
    setConfirmed((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
  }

  const allConfirmed = parties.length > 0 && parties.every((p) => confirmed[p.id])
  const confirmedCount = parties.filter((p) => confirmed[p.id]).length

  return (
    <section className="glass rounded-2xl border border-gold/30 p-6">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-gold" />
        <h2 className="font-display text-2xl font-medium text-foreground">Settlement Split</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Adjust each seller&apos;s payout. The remaining balance is refunded to the buyers
        proportionally. All parties must confirm before funds settle on-chain.
      </p>

      {/* Seller payout breakdown table */}
      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2 font-medium">Seller</th>
              <th className="px-3 py-2 font-medium">Verdict</th>
              <th className="px-3 py-2 text-right font-medium">Max</th>
              <th className="px-3 py-2 text-right font-medium">Payout</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => {
              const max = sellerAmount(s)
              const value = payouts[s.id] ?? 0
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-foreground">{partyLabel(s, parties)}</div>
                    <div className="break-all font-mono text-[11px] text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    {s.verdict ? (
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gold">{s.verdict}</span>
                    ) : (
                      <span className="font-mono text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">{formatUSD(max)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="range"
                        min={0}
                        max={max}
                        step={1}
                        value={value}
                        onChange={(e) => setSellerPayout(s.id, Number(e.target.value), max)}
                        aria-label={`Payout for ${partyLabel(s, parties)}`}
                        className="hidden w-28 accent-[var(--gold)] sm:block"
                      />
                      <div className="flex items-center gap-1 border-b border-border focus-within:border-gold">
                        <span className="pb-0.5 font-mono text-xs text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={value}
                          onChange={(e) => setSellerPayout(s.id, Number(e.target.value), max)}
                          aria-label={`Payout amount for ${partyLabel(s, parties)}`}
                          className="w-20 bg-transparent pb-0.5 text-right font-mono text-sm text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface/60 font-mono text-xs">
              <td className="px-3 py-2 uppercase tracking-wider text-muted-foreground" colSpan={3}>
                Total to sellers
              </td>
              <td className="px-3 py-2 text-right font-semibold text-gold">{formatUSD(totalSellerPayout)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Buyer refund (remaining flows proportionally) */}
      <div className="mt-4 rounded-lg border border-border bg-surface/40 p-4">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-widest">
          <span className="text-muted-foreground">Refunded to buyers</span>
          <span className="text-success">{formatUSD(buyerRemaining)}</span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {buyers.map((b) => {
            const share = Math.round((buyerRemaining * b.allocation) / buyerAllocTotal)
            return (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span className="break-all text-foreground/90">
                  {partyLabel(b, parties)}
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{b.allocation}%</span>
                </span>
                <span className="font-mono text-sm text-success">{formatUSD(share)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Confirmation checklist */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-gold">Confirmations</h3>
          <span className="font-mono text-[11px] text-muted-foreground">
            {confirmedCount}/{parties.length} confirmed
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {parties.map((p) => {
            const ok = !!confirmed[p.id]
            const you = isYou(p)
            return (
              <li
                key={p.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3',
                  ok ? 'border-success/30 bg-success/5' : 'border-border bg-surface/40',
                )}
              >
                <div className="min-w-0">
                  <span className="text-sm text-foreground">
                    {partyLabel(p, parties)} {you && <span className="text-muted-foreground">· you</span>}
                  </span>
                  <p className="break-all font-mono text-[11px] text-muted-foreground">{p.email}</p>
                </div>
                {you ? (
                  <button
                    type="button"
                    onClick={() => toggleConfirm(p)}
                    className={cn(
                      'btn-press inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                      ok
                        ? 'bg-success/15 text-success'
                        : 'border border-gold/40 text-gold hover:bg-gold/10',
                    )}
                  >
                    {ok ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {ok ? 'Confirmed' : 'Confirm split'}
                  </button>
                ) : (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider',
                      ok ? 'text-success' : 'text-amber-400',
                    )}
                  >
                    {ok ? <Check className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                    {ok ? 'Confirmed' : 'Pending'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 text-center">
        <button
          onClick={onSettle}
          disabled={busy || !allConfirmed}
          className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-primary-foreground gold-glow disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Execute Settlement
        </button>
        {!allConfirmed && (
          <p className="font-mono text-[11px] text-muted-foreground">
            All parties must confirm the split before funds release.
          </p>
        )}
      </div>
    </section>
  )
}
