'use client'

import { useEffect, useRef, useState } from 'react'
import { ConfidenceGauge } from '@/components/confidence-gauge'
import { VerdictBadge } from '@/components/status-badge'
import { formatUSDT } from '@/lib/utils'

const REASONING =
  'The seller delivered a complete logo suite matching all specifications in the deal terms. All file formats were provided. Verdict: full release.'

export function VerdictMockup() {
  const ref = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [phase, setPhase] = useState(0) // 0 badge, 1 gauge, 2 typing, 3 payouts
  const [typed, setTyped] = useState('')

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    const t1 = setTimeout(() => setPhase(1), 500)
    const t2 = setTimeout(() => setPhase(2), 1700)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [started])

  useEffect(() => {
    if (phase < 2) return
    let i = 0
    const id = setInterval(() => {
      i++
      setTyped(REASONING.slice(0, i))
      if (i >= REASONING.length) {
        clearInterval(id)
        setTimeout(() => setPhase(3), 300)
      }
    }, 22)
    return () => clearInterval(id)
  }, [phase])

  return (
    <div ref={ref} className="mx-auto w-full max-w-2xl">
      <div className="glass rounded-2xl border border-border p-8 md:p-10">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Verdict · Deal #4821
          </div>
          {started && phase >= 0 && (
            <div className="animate-fade-in">
              <VerdictBadge verdict="RELEASE" size="lg" />
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-10">
          <div className="shrink-0">
            {phase >= 1 ? (
              <ConfidenceGauge value={87} />
            ) : (
              <div className="h-[180px] w-[180px]" />
            )}
          </div>
          <div className="min-h-[120px] flex-1">
            <p className="font-sans text-lg leading-relaxed text-foreground/90">
              {typed}
              {phase === 2 && <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-gold align-middle" />}
            </p>
          </div>
        </div>

        {phase >= 3 && (
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 animate-fade-in">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Seller payout</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-success">{formatUSDT(1200)}</div>
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Buyer refund</div>
              <div className="mt-1 font-mono text-2xl font-semibold text-foreground/70">{formatUSDT(0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
