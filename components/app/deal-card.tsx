'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ScrollText, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '@/components/status-badge'
import { Countdown } from '@/components/countdown'
import { GavelScorePill } from '@/components/app/gavel-score'
import { useWebSocket } from '@/lib/use-websocket'
import { formatUSDT } from '@/lib/utils'
import { deterministicScore, isMultiParty, partyConfigLabel } from '@/lib/party-utils'
import type { Deal } from '@/lib/types'

export function DealCard({ deal: initial, index = 0 }: { deal: Deal; index?: number }) {
  const [deal, setDeal] = useState(initial)
  const [flash, setFlash] = useState(false)
  const firstRef = useRef(true)

  // Subscribe to live updates; flash gold when the card updates.
  useWebSocket(deal.id, (updated) => {
    setDeal(updated)
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    setFlash(true)
    setTimeout(() => setFlash(false), 1100)
  })

  const isSettleable = ['LOCKED', 'DELIVERED', 'JUDGING'].includes(deal.status)
  const sellerScore =
    deal.parties?.find((p) => p.role === 'seller')?.gavelScore ?? deterministicScore(deal.sellerEmail)
  const multi = isMultiParty(deal)
  const configLabel = partyConfigLabel(deal)

  return (
    <Link href={`/deals/${deal.id}`}>
      <article
        className={`glass relative h-full rounded-xl border border-border p-5 transition-all hover:border-gold/30 ${flash ? 'animate-flash-gold' : ''}`}
        style={{ animation: firstRef.current ? `fadeIn 0.5s ease ${index * 50}ms both` : undefined }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-medium leading-tight text-foreground">{deal.title}</h3>
          <StatusBadge status={deal.status} />
        </div>

        {/* Trust badges + multi-party config */}
        {(deal.witness || deal.insured || multi) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]">
            {multi && configLabel && (
              <span className="font-mono uppercase tracking-wider text-muted-foreground">{configLabel}</span>
            )}
            {deal.witness && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#a67be8]/40 bg-[#a67be8]/10 px-1.5 py-0.5 font-medium text-[#c9a8f0]">
                <ScrollText className="h-2.5 w-2.5" /> Witnessed
              </span>
            )}
            {deal.insured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 font-medium text-gold">
                <ShieldCheck className="h-2.5 w-2.5" /> Insured
              </span>
            )}
          </div>
        )}

        <div className="mt-4 font-mono text-2xl font-semibold text-gold">{formatUSDT(deal.amount)}</div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="font-mono">{deal.sellerEmail}</span>
            <GavelScorePill score={sellerScore} />
          </span>
          {isSettleable ? (
            <Countdown to={deal.expiresAt} className="text-xs" />
          ) : (
            <span className="font-mono uppercase tracking-wider">{deal.verdict ?? '—'}</span>
          )}
        </div>
      </article>
    </Link>
  )
}
