'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useDeals } from '@/lib/use-deals'
import { useAuth } from '@/lib/auth-context'
import { DealCard } from '@/components/app/deal-card'
import { OnboardingGate } from '@/components/app/onboarding-gate'
import { Plus, Gavel } from 'lucide-react'
import type { Deal } from '@/lib/types'
import { cn } from '@/lib/utils'

type FilterKey = 'all' | 'buyer' | 'seller' | 'active' | 'settled'
const FILTERS: { label: string; value: FilterKey }[] = [
  { label: 'All', value: 'all' },
  { label: 'As Buyer', value: 'buyer' },
  { label: 'As Seller', value: 'seller' },
  { label: 'Active', value: 'active' },
  { label: 'Settled', value: 'settled' },
]

const ACTIVE_STATUSES = ['LOCKED', 'DELIVERED', 'JUDGING', 'JUDGED']

export function DealsClient() {
  const { user } = useAuth()
  const { deals, isLoading } = useDeals()
  const [filter, setFilter] = useState<FilterKey>('all')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [underline, setUnderline] = useState({ left: 0, width: 0 })

  const activeIndex = FILTERS.findIndex((f) => f.value === filter)

  useEffect(() => {
    const el = tabRefs.current[activeIndex]
    if (el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeIndex, isLoading])

  const filtered = useMemo<Deal[]>(() => {
    return deals.filter((d) => {
      switch (filter) {
        case 'buyer':
          return d.buyerId === user?.id
        case 'seller':
          return d.sellerId === user?.id
        case 'active':
          return ACTIVE_STATUSES.includes(d.status)
        case 'settled':
          return d.status === 'SETTLED'
        default:
          return true
      }
    })
  }, [deals, filter, user?.id])

  return (
    <div className="w-full">
      <OnboardingGate />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-4xl font-medium text-foreground md:text-5xl">My Deals</h1>
        <Link
          href="/deals/new"
          className="btn-press inline-flex items-center justify-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground gold-glow"
        >
          <Plus className="h-4 w-4" /> Create Deal
        </Link>
      </header>

      {/* Filter tabs with sliding underline */}
      <div className="relative mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {FILTERS.map((f, i) => (
          <button
            key={f.value}
            ref={(el) => { tabRefs.current[i] = el }}
            onClick={() => setFilter(f.value)}
            className={cn(
              'whitespace-nowrap px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors',
              filter === f.value ? 'text-gold' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
        <span
          className="absolute bottom-0 h-0.5 bg-gold transition-all duration-300"
          style={{ left: underline.left, width: underline.width }}
        />
      </div>

      <section className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground" />
            <p className="mt-5 font-display text-3xl text-foreground">No deals yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lock funds and let GAVEL settle your first agreement.
            </p>
            <Link
              href="/deals/new"
              className="btn-press mt-6 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Create Deal
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d, i) => (
              <DealCard key={d.id} deal={d} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
