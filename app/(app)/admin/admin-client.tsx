'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, X, Loader2, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { StatusBadge } from '@/components/status-badge'
import { formatUSDT, formatDate, shortId, cn } from '@/lib/utils'
import type { Deal, Verdict } from '@/lib/types'

const PAGE_SIZE = 8

export function AdminClient() {
  const { user, token } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Deal | null>(null)
  const [verdictTarget, setVerdictTarget] = useState<Deal | null>(null)

  // Admin route guard.
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/deals')
  }, [user, router])

  const load = useMemo(
    () => async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await api.adminDeals(token, PAGE_SIZE, page * PAGE_SIZE)
        setDeals(res.deals)
        setTotal(res.total)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load deals.')
      } finally {
        setLoading(false)
      }
    },
    [token, page, toast],
  )

  useEffect(() => { load() }, [load])

  if (user && user.role !== 'admin') return null

  const pages = Math.ceil(total / PAGE_SIZE) || 1

  async function doCancel() {
    if (!token || !cancelTarget) return
    try {
      await api.adminCancel(token, cancelTarget.id)
      toast.success('Deal cancelled.')
      setCancelTarget(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel.')
    }
  }

  return (
    <div className="w-full">
      <header className="flex items-center gap-3 border-b border-border pb-6">
        <ShieldCheck className="h-7 w-7 text-gold" />
        <div>
          <h1 className="font-display text-3xl font-medium text-foreground">Admin Terminal</h1>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{total} deals on record</p>
        </div>
      </header>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-border bg-surface/60 text-left uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-3 font-medium">ID</th>
              <th className="px-3 py-3 font-medium">Title</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Amount</th>
              <th className="px-3 py-3 font-medium">Buyer</th>
              <th className="px-3 py-3 font-medium">Seller</th>
              <th className="px-3 py-3 font-medium">Created</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" /></td></tr>
            ) : deals.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No deals.</td></tr>
            ) : (
              deals.map((d) => (
                <Fragment key={d.id}>
                  <tr
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-accent/30"
                  >
                    <td className="px-3 py-3 text-gold">{shortId(d.id)}</td>
                    <td className="max-w-[160px] truncate px-3 py-3 font-sans text-foreground">{d.title}</td>
                    <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-3 py-3 text-gold">{formatUSDT(d.amount)}</td>
                    <td className="max-w-[120px] truncate px-3 py-3 text-muted-foreground">{d.buyerEmail}</td>
                    <td className="max-w-[120px] truncate px-3 py-3 text-muted-foreground">{d.sellerEmail}</td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(d.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setCancelTarget(d)} className="rounded border border-danger/40 px-2 py-1 uppercase tracking-wider text-danger hover:bg-danger/10">Cancel</button>
                        <button onClick={() => setVerdictTarget(d)} className="rounded border border-gold/40 px-2 py-1 uppercase tracking-wider text-gold hover:bg-gold/10">Override</button>
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded === d.id && 'rotate-180')} />
                      </div>
                    </td>
                  </tr>
                  {expanded === d.id && (
                    <tr className="border-b border-border bg-surface/40">
                      <td colSpan={8} className="px-6 py-4">
                        <ol className="space-y-3">
                          {d.auditTrail.map((e, i) => (
                            <li key={e.id} className="relative flex gap-3 pb-3 last:pb-0">
                              {i < d.auditTrail.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-border" />}
                              <span className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-gold bg-surface" />
                              <div>
                                <p className="font-sans text-sm text-foreground/90">{e.description}</p>
                                <p className="mt-0.5 uppercase tracking-wider text-muted-foreground">{formatDate(e.timestamp)}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                        <Link href={`/deals/${d.id}`} className="mt-3 inline-block uppercase tracking-wider text-gold hover:underline">Open deal →</Link>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>Page {page + 1} of {pages}</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-border px-3 py-1.5 uppercase tracking-wider disabled:opacity-40 hover:border-gold/40">Prev</button>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-3 py-1.5 uppercase tracking-wider disabled:opacity-40 hover:border-gold/40">Next</button>
        </div>
      </div>

      {cancelTarget && (
        <ConfirmModal
          title="Cancel deal?"
          body={`This will cancel "${cancelTarget.title}" and cannot be undone.`}
          confirmLabel="Cancel Deal"
          onConfirm={doCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {verdictTarget && (
        <OverrideModal
          deal={verdictTarget}
          onClose={() => setVerdictTarget(null)}
          onDone={() => { setVerdictTarget(null); load() }}
        />
      )}
    </div>
  )
}

function ConfirmModal({ title, body, confirmLabel, onConfirm, onClose }: {
  title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="glass relative w-full max-w-sm rounded-2xl border border-border p-6 animate-fade-in">
        <h2 className="font-display text-2xl font-medium text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Keep deal</button>
          <button onClick={onConfirm} className="btn-press rounded-md bg-danger px-4 py-2 text-sm font-medium text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function OverrideModal({ deal, onClose, onDone }: { deal: Deal; onClose: () => void; onDone: () => void }) {
  const { token } = useAuth()
  const toast = useToast()
  const [verdict, setVerdict] = useState<Verdict>('RELEASE')
  const [percentage, setPercentage] = useState(60)
  const [reasoning, setReasoning] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!token) return
    if (!reasoning.trim()) { toast.error('Add reasoning for the override.'); return }
    setBusy(true)
    try {
      await api.adminVerdict(token, deal.id, verdict, percentage, reasoning.trim())
      toast.success('Verdict overridden.')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Override failed.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="glass relative w-full max-w-md rounded-2xl border border-border p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-medium text-foreground">Override verdict</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{deal.title}</p>

        <label className="mt-5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Verdict</label>
        <div className="mt-2 flex gap-2">
          {(['RELEASE', 'RETURN', 'PARTIAL'] as Verdict[]).map((v) => (
            <button
              key={v}
              onClick={() => setVerdict(v)}
              className={cn(
                'flex-1 rounded-md border py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                verdict === v ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {verdict === 'PARTIAL' && (
          <div className="mt-4">
            <label className="flex justify-between font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>Seller percentage</span><span className="text-gold">{percentage}%</span>
            </label>
            <input type="range" min={0} max={100} value={percentage} onChange={(e) => setPercentage(Number(e.target.value))} className="mt-2 w-full accent-[#e8c44a]" />
          </div>
        )}

        <label className="mt-4 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Reasoning</label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={4}
          placeholder="Explain the override decision…"
          className="mt-2 w-full rounded-lg border border-border bg-surface/60 p-3 text-sm text-foreground outline-none focus:border-gold"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save Verdict
          </button>
        </div>
      </div>
    </div>
  )
}
