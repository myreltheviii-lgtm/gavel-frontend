'use client'

import { useEffect, useRef, useState } from 'react'
import { ConfidenceGauge } from '@/components/confidence-gauge'
import { VerdictBadge } from '@/components/status-badge'
import { formatUSDT } from '@/lib/utils'
import type { Deal } from '@/lib/types'

/** Hook: counts a number up from 0 to target over a duration. */
function useCountUp(target: number, run: boolean, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, duration])
  return val
}

/** Full verdict card: gauge draws itself, % bar fills, reasoning types, payouts count up. */
export function VerdictCard({ deal }: { deal: Deal }) {
  const [phase, setPhase] = useState(0) // 0 badge+gauge, 1 typing, 2 payouts
  const [typed, setTyped] = useState('')
  const reasoning = deal.reasoning ?? ''
  const verdict = deal.verdict!
  const sellerPct = deal.amount > 0 ? Math.round(((deal.sellerPayout ?? 0) / deal.amount) * 100) : 0

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (phase < 1) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(reasoning.slice(0, i))
      if (i >= reasoning.length) {
        clearInterval(id)
        setTimeout(() => setPhase(2), 250)
      }
    }, 12)
    return () => clearInterval(id)
  }, [phase, reasoning])

  const sellerCount = useCountUp(deal.sellerPayout ?? 0, phase >= 2)
  const buyerCount = useCountUp(deal.buyerRefund ?? 0, phase >= 2)
  const barRef = useRef<HTMLDivElement>(null)

  return (
    <div className="glass rounded-2xl border border-border p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          GAVEL Verdict
          {deal.judgmentMs && <span className="ml-2 text-gold">· {(deal.judgmentMs / 1000).toFixed(1)}s</span>}
        </div>
        <div className="animate-fade-in">
          <VerdictBadge verdict={verdict} size="lg" />
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:gap-10">
        <div className="shrink-0">
          <ConfidenceGauge value={deal.confidence ?? 0} />
        </div>
        <div className="min-h-[120px] flex-1">
          <p className="font-sans leading-relaxed text-foreground/90">
            {typed}
            {phase === 1 && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gold align-middle" />}
          </p>
        </div>
      </div>

      {/* split percentage bar */}
      <div className="mt-8">
        <div className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>Seller {sellerPct}%</span>
          <span>Buyer {100 - sellerPct}%</span>
        </div>
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-border" ref={barRef}>
          <div
            className="h-full bg-success transition-all duration-1000 ease-out"
            style={{ width: phase >= 2 ? `${sellerPct}%` : '0%' }}
          />
          <div
            className="h-full bg-danger transition-all duration-1000 ease-out"
            style={{ width: phase >= 2 ? `${100 - sellerPct}%` : '0%' }}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Seller payout</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-success tabular-nums">
            {formatUSDT(Math.round(sellerCount))}
          </div>
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Buyer refund</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-foreground/70 tabular-nums">
            {formatUSDT(Math.round(buyerCount))}
          </div>
        </div>
      </div>
    </div>
  )
}
