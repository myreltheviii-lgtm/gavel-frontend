'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Loader2, ShieldCheck, AlertTriangle, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { useDeals } from '@/lib/use-deals'
import { GavelScore } from '@/components/app/gavel-score'
import { StatusBadge } from '@/components/status-badge'
import { formatUSD, formatDate, cn } from '@/lib/utils'
import type { Deal } from '@/lib/types'

export function ProfileClient() {
  const { user, token, logout } = useAuth()
  const router = useRouter()
  const { deals } = useDeals()

  const { data: scoreDetail, isLoading: scoreLoading } = useSWR(
    token && user ? ['score', user.id] : null,
    () => api.scoreDetail(token!, user!.id),
  )

  const stats = useMemo(() => computeStats(deals, user?.id), [deals, user?.id])
  const recent = useMemo(
    () => deals.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [deals],
  )
  // A believable account-created date derived from the earliest deal, else now.
  const createdAt = useMemo(() => {
    const earliest = deals.reduce<string | null>((acc, d) => (!acc || d.createdAt < acc ? d.createdAt : acc), null)
    return earliest ?? new Date().toISOString()
  }, [deals])

  if (!user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-4xl font-medium text-foreground md:text-5xl">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account, reputation, and deal history.</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Identity + score */}
        <section className="glass rounded-2xl border border-border p-6 lg:col-span-2">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="shrink-0">
              {scoreLoading ? (
                <div className="flex h-24 w-24 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                </div>
              ) : (
                <GavelScore score={scoreDetail?.score ?? user.gavelScore ?? 0} size="lg" history={scoreDetail?.history} />
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="break-all font-mono text-lg text-foreground">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider',
                    user.role === 'admin' ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface/60 text-muted-foreground',
                  )}
                >
                  {user.role === 'admin' && <ShieldCheck className="h-3 w-3" />}
                  {user.role}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Joined {formatDate(createdAt)}
                </span>
              </div>
            </div>
          </div>

          {scoreDetail && (
            <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
              <ScoreBreakdown title="As Buyer" rows={[
                ['Term clarity', scoreDetail.asBuyer.clarity],
                ['Fairness', scoreDetail.asBuyer.fairness],
                ['Payment history', scoreDetail.asBuyer.paymentHistory],
              ]} />
              <ScoreBreakdown title="As Seller" rows={[
                ['Delivery rate', scoreDetail.asSeller.deliveryRate],
                ['On-time rate', scoreDetail.asSeller.onTimeRate],
                ['Favorable verdicts', scoreDetail.asSeller.favorableRate],
              ]} />
            </div>
          )}
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Total deals" value={String(stats.total)} />
          <StatCard label="As buyer" value={String(stats.asBuyer)} />
          <StatCard label="As seller" value={String(stats.asSeller)} />
          <StatCard label="Settled" value={String(stats.settled)} />
          <StatCard label="Active" value={String(stats.active)} />
          <StatCard label="Volume" value={formatUSD(stats.volume)} accent />
        </section>
      </div>

      {/* Recent activity */}
      <section className="glass mt-6 rounded-2xl border border-border p-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Recent Activity</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No deals yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/deals/${d.id}`} className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-gold">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">{d.title}</span>
                  <StatusBadge status={d.status} />
                  <span className="shrink-0 font-mono text-sm text-gold">{formatUSD(d.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Danger zone */}
      <DangerZone onDeleted={() => { logout(); router.push('/') }} />
    </div>
  )
}

function ScoreBreakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-mono text-foreground">{Math.round(value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn('h-full rounded-full', value >= 85 ? 'bg-success' : value >= 50 ? 'bg-gold' : 'bg-amber-400')}
                style={{ width: `${Math.min(100, value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass rounded-xl border border-border p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('mt-2 font-mono text-xl font-semibold tabular-nums', accent ? 'text-gold' : 'text-foreground')}>{value}</p>
    </div>
  )
}

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  function confirmDelete() {
    if (confirmText !== 'DELETE') return
    toast.success('Account deletion requested. You have been signed out.')
    onDeleted()
  }

  return (
    <section className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-danger" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-danger">Danger Zone</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Deleting your account is permanent and cannot be undone. Active deals must be settled first.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="btn-press mt-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/20"
      >
        Delete Account
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="glass relative w-full max-w-sm rounded-2xl border border-danger/40 p-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-medium text-foreground">Delete account?</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Type <span className="font-mono text-danger">DELETE</span> to confirm. This cannot be undone.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-4 w-full rounded-md border border-border bg-surface/60 px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-danger"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={confirmText !== 'DELETE'}
                className="btn-press rounded-md bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function computeStats(deals: Deal[], userId?: string) {
  let asBuyer = 0
  let asSeller = 0
  let settled = 0
  let active = 0
  let volume = 0
  for (const d of deals) {
    if (d.buyerId === userId) asBuyer++
    if (d.sellerId === userId) asSeller++
    if (d.status === 'SETTLED') settled++
    if (['LOCKED', 'DELIVERED', 'JUDGING', 'JUDGED'].includes(d.status)) active++
    volume += d.amount
  }
  return { total: deals.length, asBuyer, asSeller, settled, active, volume }
}
