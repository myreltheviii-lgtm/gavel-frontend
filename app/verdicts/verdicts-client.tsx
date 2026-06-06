'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { VerdictBadge } from '@/components/status-badge'
import { PublicNav } from '@/components/public-nav'
import { formatUSDT, timeAgo, cn } from '@/lib/utils'
import type { PublicVerdict, Verdict } from '@/lib/types'

type VerdictFilter = 'ALL' | Verdict
type SortKey = 'recent' | 'confidence' | 'amount'

const FILTERS: VerdictFilter[] = ['ALL', 'RELEASE', 'RETURN', 'PARTIAL']
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Most Recent' },
  { key: 'confidence', label: 'Highest Confidence' },
  { key: 'amount', label: 'Largest Amount' },
]

const PAGE = 6

export function VerdictsClient() {
  const [all, setAll] = useState<PublicVerdict[]>([])
  const [filter, setFilter] = useState<VerdictFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('recent')
  const [count, setCount] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.verdicts().then(setAll).catch(() => setAll([]))
  }, [])

  const filtered = useMemo(() => {
    let list = all.filter((v) => filter === 'ALL' || v.verdict === filter)
    list = [...list].sort((a, b) => {
      if (sort === 'confidence') return b.confidence - a.confidence
      if (sort === 'amount') return b.amount - a.amount
      return new Date(b.judgedAt).getTime() - new Date(a.judgedAt).getTime()
    })
    return list
  }, [all, filter, sort])

  useEffect(() => setCount(PAGE), [filter, sort])

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setCount((c) => Math.min(c + PAGE, filtered.length))
    }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [filtered.length])

  const totalSettled = all.reduce((s, v) => s + v.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Public Ledger</p>
        <h1 className="mt-3 font-display text-5xl font-medium text-foreground md:text-6xl">Verdict Explorer</h1>
        <p className="mt-4 font-mono text-sm text-muted-foreground">
          <span className="text-gold">4,821</span> verdicts issued · <span className="text-gold">$2.8M</span> settled
        </p>

        {/* Controls */}
        <div className="mt-8 flex flex-col gap-4 border-y border-border py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-colors',
                  filter === f ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold"
            >
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, count).map((v, i) => (
            <Link
              key={v.dealId}
              href={`/verdicts/${v.dealId}`}
              className="glass group flex flex-col rounded-xl border border-border p-5 transition-colors hover:border-gold/40"
              style={{ animation: `fadeIn 0.4s ease ${(i % PAGE) * 40}ms both` }}
            >
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={v.verdict} />
                <span className="font-mono text-sm text-gold">{formatUSDT(v.amount)}</span>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-foreground/80">{v.reasoning}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <span>{v.confidence}% confidence</span>
                <span>{timeAgo(v.judgedAt)}</span>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-20 text-center text-muted-foreground">No verdicts match this filter.</p>
        )}
        <div ref={sentinel} className="h-10" />
      </main>
    </div>
  )
}
