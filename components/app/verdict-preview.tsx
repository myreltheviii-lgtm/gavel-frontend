'use client'

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Handshake, X, Check, Clock } from 'lucide-react'
import { cn, formatUSD } from '@/lib/utils'
import { isMultiParty, partyLabel } from '@/lib/party-utils'
import type { Deal, Party } from '@/lib/types'

type Prediction = { release: number; partial: number; return: number }

const TERM_KEYWORDS = ['deliver', 'format', 'deadline', 'revision', 'accept', 'criteria', 'within', 'include']
const PROOF_KEYWORDS = ['completed', 'attached', 'link', 'file', 'repo', 'delivered', 'screenshot', 'final']

/** Heuristic client-side verdict prediction from terms vs proof specificity. */
export function predict(deal: Deal): Prediction {
  const terms = (deal.terms || '').toLowerCase()
  const proof = (deal.deliveryProof || '').toLowerCase()

  const termSpec = TERM_KEYWORDS.filter((k) => terms.includes(k)).length
  const proofSpec = PROOF_KEYWORDS.filter((k) => proof.includes(k)).length
  const proofLen = Math.min(1, proof.length / 280)
  const termLen = Math.min(1, terms.length / 280)

  // Coverage ratio: how well the proof matches the demands of the terms.
  const demand = Math.max(1, termSpec)
  const coverage = Math.min(1.15, (proofSpec / demand) * 0.7 + proofLen * 0.3)

  let release = Math.round(coverage * 70 + proofLen * 15)
  let ret = Math.round((1 - coverage) * 55 + (1 - proofLen) * 10)
  release = Math.max(8, Math.min(88, release))
  ret = Math.max(6, Math.min(70, ret))
  let partial = 100 - release - ret
  if (partial < 8) {
    partial = 8
    const overflow = release + ret + partial - 100
    if (release >= ret) release -= overflow
    else ret -= overflow
  }
  // normalize to exactly 100
  const sum = release + partial + ret
  release = Math.round((release / sum) * 100)
  ret = Math.round((ret / sum) * 100)
  partial = 100 - release - ret
  void termLen
  return { release, partial, return: ret }
}

export function VerdictPreview({ deal }: { deal: Deal }) {
  const prediction = useMemo(() => predict(deal), [deal])
  const [mounted, setMounted] = useState(false)
  const [negotiating, setNegotiating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  const bars: { label: string; value: number; color: string; track: string }[] = [
    { label: 'RELEASE', value: prediction.release, color: 'bg-success', track: 'text-success' },
    { label: 'PARTIAL', value: prediction.partial, color: 'bg-gold', track: 'text-gold' },
    { label: 'RETURN', value: prediction.return, color: 'bg-danger', track: 'text-danger' },
  ]

  return (
    <section className="glass rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Verdict Prediction</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Based on how closely the delivery proof matches the deal terms.
      </p>

      <div className="mt-5 space-y-4">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider">
              <span className="text-muted-foreground">{b.label}</span>
              <span className={cn('tabular-nums', b.track)}>{b.value}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn('h-full rounded-full transition-[width] duration-1000 ease-out', b.color)}
                style={{ width: mounted ? `${b.value}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 font-display text-sm italic text-gold">
        This is a prediction only. Actual verdict may differ.
      </p>

      <button
        type="button"
        onClick={() => setNegotiating(true)}
        className="btn-press mt-4 inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/20"
      >
        <Handshake className="h-4 w-4" /> Negotiate Settlement
      </button>

      {negotiating && <SettlementModal deal={deal} onClose={() => setNegotiating(false)} />}
    </section>
  )
}

function SettlementModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const multi = isMultiParty(deal)
  const sellers = useMemo(() => deal.parties?.filter((p) => p.role === 'seller') ?? [], [deal.parties])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="glass relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-medium text-foreground">Negotiate settlement</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Agree on a manual split now to settle without a verdict. All parties must confirm.
        </p>

        {multi && sellers.length > 1 ? (
          <MultiPartySettlement deal={deal} sellers={sellers} />
        ) : (
          <SinglePartySettlement deal={deal} />
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function SinglePartySettlement({ deal }: { deal: Deal }) {
  const [pct, setPct] = useState(60)
  const [parties, setParties] = useState({ buyer: false, seller: false })
  const sellerPayout = Math.round((deal.amount * pct) / 100)
  const buyerRefund = deal.amount - sellerPayout
  const allConfirmed = parties.buyer && parties.seller

  return (
    <div className="mt-5">
      <label className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        <span>Seller payout</span>
        <span className="text-gold">{pct}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        className="mt-2 w-full accent-[#e8c44a]"
      />
      <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm">
        <div className="rounded-lg border border-border bg-surface/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Seller payout</p>
          <p className="mt-1 text-success">{formatUSD(sellerPayout)}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Buyer refund</p>
          <p className="mt-1 text-danger">{formatUSD(buyerRefund)}</p>
        </div>
      </div>

      <ConfirmList
        rows={[
          { label: deal.buyerEmail, role: 'Buyer', confirmed: parties.buyer, onToggle: () => setParties((p) => ({ ...p, buyer: !p.buyer })) },
          { label: deal.sellerEmail, role: 'Seller', confirmed: parties.seller, onToggle: () => setParties((p) => ({ ...p, seller: !p.seller })) },
        ]}
      />

      <button
        type="button"
        disabled={!allConfirmed}
        className="btn-press mt-4 w-full rounded-md bg-gold py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {allConfirmed ? 'Execute manual settlement' : 'Awaiting all confirmations'}
      </button>
    </div>
  )
}

function MultiPartySettlement({ deal, sellers }: { deal: Deal; sellers: Party[] }) {
  const all = deal.parties ?? []
  const [payouts, setPayouts] = useState<Record<string, number>>(() =>
    Object.fromEntries(sellers.map((s) => [s.id, Math.round((deal.amount * s.allocation) / 100)])),
  )
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})

  const totalSeller = Object.values(payouts).reduce((s, v) => s + v, 0)
  const buyerPool = Math.max(0, deal.amount - totalSeller)
  const everyone = all.every((p) => confirmed[p.id])

  return (
    <div className="mt-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Per-seller payout</p>
      <div className="mt-2 space-y-3">
        {sellers.map((s) => {
          const max = Math.round((deal.amount * s.allocation) / 100)
          return (
            <div key={s.id} className="rounded-lg border border-border bg-surface/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono text-foreground">{partyLabel(s, all)}</span>
                <span className="font-mono text-gold">{formatUSD(payouts[s.id] ?? 0)}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.email}</p>
              <input
                type="range"
                min={0}
                max={max}
                value={payouts[s.id] ?? 0}
                onChange={(e) => setPayouts((p) => ({ ...p, [s.id]: Number(e.target.value) }))}
                className="mt-2 w-full accent-[#e8c44a]"
              />
            </div>
          )
        })}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-surface/40 p-3 font-mono text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Remaining to buyers (proportional)</span>
          <span className="text-danger">{formatUSD(buyerPool)}</span>
        </div>
      </div>

      <ConfirmList
        rows={all.map((p) => ({
          label: p.email,
          role: partyLabel(p, all),
          confirmed: !!confirmed[p.id],
          onToggle: () => setConfirmed((c) => ({ ...c, [p.id]: !c[p.id] })),
        }))}
      />

      <button
        type="button"
        disabled={!everyone}
        className="btn-press mt-4 w-full rounded-md bg-gold py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {everyone ? 'Execute manual settlement' : 'Awaiting all confirmations'}
      </button>
    </div>
  )
}

function ConfirmList({
  rows,
}: {
  rows: { label: string; role: string; confirmed: boolean; onToggle: () => void }[]
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Confirmations</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.label + r.role} className="flex items-center gap-3">
            <button
              type="button"
              onClick={r.onToggle}
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                r.confirmed ? 'border-success bg-success/15 text-success' : 'border-border text-muted-foreground',
              )}
              aria-label={`Toggle confirmation for ${r.label}`}
            >
              {r.confirmed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            </button>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{r.label}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{r.role}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
