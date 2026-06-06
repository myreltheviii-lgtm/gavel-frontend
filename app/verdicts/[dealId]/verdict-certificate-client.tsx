'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Share2, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/lib/toast'
import { ConfidenceGauge } from '@/components/confidence-gauge'
import { VerdictBadge } from '@/components/status-badge'
import { PublicNav } from '@/components/public-nav'
import { GavelIcon } from '@/components/brand'
import { formatUSDT, formatDate } from '@/lib/utils'
import type { PublicVerdict } from '@/lib/types'

export function VerdictCertificateClient({ dealId }: { dealId: string }) {
  const toast = useToast()
  const [v, setV] = useState<PublicVerdict | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api.publicVerdict(dealId)
      .then((res) => { setV(res); setLoading(false) })
      .catch(() => { setMissing(true); setLoading(false) })
  }, [dealId])

  function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (navigator.share) navigator.share({ title: 'GAVEL Verdict', url }).catch(() => {})
    else { navigator.clipboard?.writeText(url); toast.success('Link copied to clipboard.') }
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <Link href="/verdicts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All verdicts
        </Link>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : missing || !v ? (
          <p className="py-24 text-center font-display text-3xl text-foreground">Verdict not found</p>
        ) : (
          <article className="glass mt-8 rounded-2xl border border-border p-8 text-center md:p-12">
            <div className="flex items-center justify-center gap-2 text-gold">
              <GavelIcon className="h-6 w-6" />
              <span className="font-display text-2xl tracking-wide">GAVEL</span>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Certificate of Judgment</p>

            <h1 className="mt-8 font-display text-3xl font-medium text-foreground md:text-4xl">{v.title}</h1>

            <div className="mt-6 flex justify-center">
              <VerdictBadge verdict={v.verdict} size="lg" />
            </div>

            <div className="mt-8 flex justify-center">
              <ConfidenceGauge value={v.confidence} />
            </div>

            <p className="mx-auto mt-8 max-w-xl text-pretty leading-relaxed text-foreground/85">{v.reasoning}</p>

            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 text-left">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Seller payout</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-success">{formatUSDT(v.sellerPayout)}</div>
              </div>
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Buyer refund</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-foreground/70">{formatUSDT(v.buyerRefund)}</div>
              </div>
            </div>

            <p className="mt-8 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Issued {formatDate(v.judgedAt)} · Total {formatUSDT(v.amount)}
            </p>

            <button
              onClick={share}
              className="btn-press mx-auto mt-8 inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm text-foreground hover:border-gold/40"
            >
              <Share2 className="h-4 w-4" /> Share this verdict
            </button>
          </article>
        )}
      </main>
    </div>
  )
}
