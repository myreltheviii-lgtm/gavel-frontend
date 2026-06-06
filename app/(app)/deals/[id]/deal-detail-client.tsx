'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Gavel, ExternalLink, FileText, Download, Loader2, MessageSquare, Shield, Check, Clock, ListChecks, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useWebSocket } from '@/lib/use-websocket'
import { useToast } from '@/lib/toast'
import { DealStepper } from '@/components/app/deal-stepper'
import { VerdictCard } from '@/components/app/verdict-card'
import { StatusBadge } from '@/components/status-badge'
import { Countdown, useCountdown } from '@/components/countdown'
import { GavelIcon } from '@/components/brand'
import { GavelScore } from '@/components/app/gavel-score'
import { DealHealth, type HealthFactor } from '@/components/app/deal-health'
import { VerdictPreview } from '@/components/app/verdict-preview'
import { AppealPanel } from '@/components/app/appeal-panel'
import { DisputeReplay } from '@/components/app/dispute-replay'
import { WitnessPanel } from '@/components/app/witness-panel'
import { SettlementSplitter } from '@/components/app/settlement-splitter'
import { validateFile } from '@/lib/security'
import { formatUSDT, formatUSD, formatDate, shortId, cn } from '@/lib/utils'
import { isMultiParty, partyLabel, roleBadgeClass, deterministicScore, buyersConfirmed } from '@/lib/party-utils'
import type { Attachment, Deal, Party } from '@/lib/types'

/** Build deal-health factors from the terms string (heuristic clarity analysis). */
function termsHealthFactors(deal: Deal): HealthFactor[] {
  const t = (deal.terms || '').toLowerCase()
  const len = deal.terms?.length ?? 0
  const has = (...words: string[]) => words.some((w) => t.includes(w))
  const score = (ok: boolean) => (ok ? 100 : 25)
  const factors: HealthFactor[] = [
    { label: 'Detail & length', value: Math.max(20, Math.min(100, Math.round((len / 280) * 100))), weight: 0.8, detail: 'Longer, specific terms are easier to judge.' },
    { label: 'Deliverable format', value: score(has('format', 'svg', 'png', 'pdf', 'file', 'repository', 'document')), weight: 1, detail: 'Specifies the file or deliverable format.' },
    { label: 'Deadline / timeframe', value: score(has('deadline', 'within', 'days', 'timeframe', 'due')), weight: 1, detail: 'States a clear delivery window.' },
    { label: 'Revision rounds', value: score(has('revision', 'rounds', 'revisions')), weight: 0.7, detail: 'Defines how many revisions are included.' },
    { label: 'Acceptance criteria', value: score(has('accept', 'criteria', 'must', 'pass', 'match')), weight: 0.9, detail: 'Defines when the work is considered done.' },
  ]
  if (isMultiParty(deal) && (deal.parties?.filter((p) => p.role === 'seller').length ?? 0) > 1) {
    factors.push({ label: 'Per-seller breakdown', value: score(has('seller 1', 'seller 2', 'each seller', 'per-seller')), weight: 0.8, detail: 'Breaks down deliverables per seller.' })
  }
  return factors
}

export function DealDetailClient({ id }: { id: string }) {
  const { user, token } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [proof, setProof] = useState('')
  const [partyProof, setPartyProof] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const { status: wsStatus } = useWebSocket(id, (updated) => setDeal(updated))

  const loadAttachments = useCallback(async () => {
    if (!token) return
    try {
      setAttachments(await api.attachments(token, id))
    } catch {
      /* ignore */
    }
  }, [token, id])

  useEffect(() => {
    let active = true
    if (!token) return
    api
      .deal(token, id)
      .then((d) => { if (active) { setDeal(d); setLoading(false) } })
      .catch(() => { if (active) { setNotFound(true); setLoading(false) } })
    loadAttachments()
    return () => { active = false }
  }, [token, id, loadAttachments])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    )
  }

  if (notFound || !deal) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-display text-3xl text-foreground">Deal not found</p>
        <Link href="/deals" className="mt-4 text-sm text-gold hover:underline">Back to deals</Link>
      </div>
    )
  }

  const isBuyer = deal.buyerId === user?.id
  const isSeller = deal.sellerId === user?.id
  const multi = isMultiParty(deal)
  const allParties = deal.parties ?? []
  const sellerParties = allParties.filter((p) => p.role === 'seller')
  const buyerParties = allParties.filter((p) => p.role === 'buyer')
  const multiSeller = sellerParties.length > 1
  const multiBuyer = buyerParties.length > 1
  const pendingBuyers = buyerParties.filter((p) => !p.confirmed)
  const isWitness = deal.witness?.email === user?.email
  const sellerScore = allParties.find((p) => p.role === 'seller')?.gavelScore ?? deterministicScore(deal.sellerEmail)
  const buyerScore = allParties.find((p) => p.role === 'buyer')?.gavelScore ?? deterministicScore(deal.buyerEmail)
  const buyerStatus = buyersConfirmed(deal)
  const isPartySeller = (p: Party) => p.userId === user?.id || p.email === user?.email
  const milestones = deal.milestones ?? []
  const multiMilestone = milestones.length > 1
  const milestonesComplete = milestones.filter((m) => m.status === 'SETTLED').length

  async function handleDeliver() {
    if (!token || !proof.trim()) { toast.error('Add delivery details first.'); return }
    setBusy(true)
    try {
      const updated = await api.deliver(token, deal!.id, proof.trim())
      setDeal(updated)
      setProof('')
      toast.success('Delivery submitted.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit delivery.')
    } finally { setBusy(false) }
  }

  async function handleDeliverParty(partyId: string) {
    const text = (partyProof[partyId] ?? '').trim()
    if (!token || !text) { toast.error('Add delivery details first.'); return }
    setBusy(true)
    try {
      const updated = await api.deliver(token, deal!.id, text, partyId)
      setDeal(updated)
      setPartyProof((prev) => ({ ...prev, [partyId]: '' }))
      toast.success('Delivery submitted.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit delivery.')
    } finally { setBusy(false) }
  }

  async function handleConfirmBuyer(partyId: string) {
    if (!token) return
    setBusy(true)
    try {
      const updated = await api.confirmJudgment(token, deal!.id, partyId)
      setDeal(updated)
      toast.success('Confirmation recorded.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to confirm.')
    } finally { setBusy(false) }
  }

  async function handleResend(party: Party) {
    if (!token) return
    setResending(party.id)
    try {
      // Re-issues the pending invitation. The party stays pending until they accept.
      await new Promise((r) => setTimeout(r, 500))
      toast.success(`Invitation resent to ${party.email}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend invitation.')
    } finally { setResending(null) }
  }

  async function handleJudge() {
    if (!token) return
    setBusy(true)
    try {
      const updated = await api.judge(token, deal!.id)
      setDeal(updated)
      toast.info('GAVEL is deliberating…')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to request judgment.')
    } finally { setBusy(false) }
  }

  async function handleSettle() {
    if (!token) return
    setBusy(true)
    try {
      const updated = await api.settle(token, deal!.id)
      setDeal(updated)
      toast.success('Settlement executed on Arbitrum.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to settle.')
    } finally { setBusy(false) }
  }

  async function uploadFiles(files: FileList | null) {
    if (!token || !files?.length) return
    // Validate each file: 10MB max, reject executable extensions.
    const list = Array.from(files)
    for (const f of list) {
      const err = validateFile(f)
      if (err) { toast.error(err); return }
    }
    setBusy(true)
    try {
      for (const f of list) await api.uploadAttachment(token, deal!.id, f)
      await loadAttachments()
      toast.success(`Uploaded ${list.length} file${list.length > 1 ? 's' : ''}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.')
    } finally { setBusy(false) }
  }

  return (
    <div className="w-full">
      <Link href="/deals" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to deals
      </Link>

      {/* Stepper */}
      <div className="glass mt-6 rounded-2xl border border-border p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', wsStatus === 'connected' ? 'bg-success animate-pulse-dot' : 'bg-muted-foreground')} />
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {wsStatus === 'connected' ? 'Live' : wsStatus}
            </span>
          </div>
          <StatusBadge status={deal.status} />
        </div>
        <DealStepper status={deal.status} />
      </div>

      {/* Header */}
      <header className="mt-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-medium text-foreground md:text-5xl">{deal.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Deal {shortId(deal.id)}
            </p>
            {deal.witness && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#a67be8]/40 bg-[#a67be8]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#c9a8f0]">
                Witnessed
              </span>
            )}
            {deal.insured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-gold">
                <Shield className="h-2.5 w-2.5" /> Insured
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="text-left md:text-right">
            <div className="font-mono text-3xl font-semibold text-gold">{formatUSDT(deal.amount)}</div>
            {['LOCKED', 'DELIVERED', 'JUDGING'].includes(deal.status) && (
              <div className="mt-1 text-sm">
                <Countdown to={deal.expiresAt} />
              </div>
            )}
          </div>
          <Link
            href={`/deals/${deal.id}/room`}
            className="btn-press inline-flex items-center gap-2 rounded-md border border-border bg-surface/60 px-4 py-2 text-sm text-foreground hover:border-gold/40"
          >
            <MessageSquare className="h-4 w-4 text-gold" /> Deal Room
          </Link>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: terms + parties */}
        <div className="space-y-6 lg:col-span-2">
          <section className="glass rounded-2xl border border-border p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Deal Terms</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">{deal.terms}</p>
          </section>

          {/* Deal Health — LOCKED only */}
          {deal.status === 'LOCKED' && (
            <DealHealth factors={termsHealthFactors(deal)} />
          )}

          {/* Verdict prediction — DELIVERED only, before judgment */}
          {deal.status === 'DELIVERED' && <VerdictPreview deal={deal} />}

          {deal.deliveryProof && (
            <section className="glass rounded-2xl border border-border p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Delivery Proof</h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">{deal.deliveryProof}</p>
            </section>
          )}
        </div>

        {/* Right: parties + meta */}
        <aside className="h-fit space-y-6">
          {multi ? (
            <section className="glass rounded-2xl border border-border p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-gold">
                Parties ({allParties.length})
              </h2>
              <ul className="mt-4 space-y-3">
                {allParties.map((p) => {
                  const score = p.gavelScore ?? deterministicScore(p.email)
                  const you = p.userId === user?.id || p.email === user?.email
                  return (
                    <li key={p.id} className="rounded-lg border border-border bg-surface/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider', roleBadgeClass(p.role))}>
                          {partyLabel(p, allParties)} {you && '· you'}
                        </span>
                        <GavelScore score={score} size="sm" animate={false} />
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-foreground/90">{p.email}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>{p.allocation}% · {formatUSD(Math.round((deal.amount * p.allocation) / 100))}</span>
                        {p.role === 'buyer' && (
                          <span className={cn('inline-flex items-center gap-1', p.confirmed ? 'text-success' : 'text-amber-300')}>
                            {p.confirmed ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {p.confirmed ? 'Confirmed' : 'Pending'}
                          </span>
                        )}
                        {p.role === 'seller' && (
                          <span className={cn('inline-flex items-center gap-1', p.delivered ? 'text-success' : 'text-muted-foreground')}>
                            {p.delivered ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {p.delivered ? 'Delivered' : 'Awaiting'}
                          </span>
                        )}
                        {p.verdict && <span className="text-gold">{p.verdict}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              {buyerStatus && (
                <p className="mt-4 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {buyerStatus.confirmed.length}/{buyerStatus.confirmed.length + buyerStatus.pending.length} buyers confirmed
                </p>
              )}
            </section>
          ) : (
            <section className="glass rounded-2xl border border-border p-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Parties</h2>
              <div className="mt-4 space-y-5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Buyer {isBuyer && '(you)'}</dt>
                    <dd className="mt-0.5 break-all font-mono text-foreground">{deal.buyerEmail}</dd>
                  </div>
                  <GavelScore score={buyerScore} size="sm" animate={false} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Seller {isSeller && '(you)'}</dt>
                    <dd className="mt-0.5 break-all font-mono text-foreground">{deal.sellerEmail}</dd>
                  </div>
                  <GavelScore score={sellerScore} size="sm" animate={false} />
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Created</dt>
                  <dd className="mt-0.5 text-foreground/80">{formatDate(deal.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expires</dt>
                  <dd className="mt-0.5 text-foreground/80">{formatDate(deal.expiresAt)}</dd>
                </div>
              </div>
            </section>
          )}

          {/* Witness panel */}
          {deal.witness && <WitnessPanel witness={deal.witness} />}
        </aside>
      </div>

      {/* Dynamic action area */}
      <div className="mt-6">
        {/* Seller delivers when LOCKED */}
        {deal.status === 'LOCKED' && isSeller && (
          <section className="glass rounded-2xl border border-border p-6">
            <h2 className="font-display text-2xl font-medium text-foreground">Submit your delivery</h2>
            <p className="mt-1 text-sm text-muted-foreground">Describe what you delivered and attach any supporting files.</p>
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={5}
              placeholder="Describe the delivered work, include links, repos, or notes…"
              className="mt-4 w-full rounded-lg border border-border bg-surface/60 p-3 text-foreground outline-none focus:border-gold"
            />
            <DropZone
              dragging={dragging}
              setDragging={setDragging}
              onFiles={uploadFiles}
              onClick={() => fileInput.current?.click()}
            />
            <input ref={fileInput} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
            <button
              onClick={handleDeliver}
              disabled={busy}
              className="btn-press mt-4 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Submit Delivery
            </button>
          </section>
        )}

        {deal.status === 'LOCKED' && isBuyer && (
          <section className="glass rounded-2xl border border-border p-6 text-center">
            <p className="text-muted-foreground">Waiting for the seller to submit their delivery.</p>
          </section>
        )}

        {/* Buyer requests judgment when DELIVERED */}
        {deal.status === 'DELIVERED' && (
          <section className="glass rounded-2xl border border-border p-6 text-center">
            <h2 className="font-display text-2xl font-medium text-foreground">Delivery submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isBuyer ? 'Review the delivery, then ask GAVEL to judge this deal.' : 'Waiting for the buyer to request judgment.'}
            </p>
            {isBuyer && (
              <button
                onClick={handleJudge}
                disabled={busy}
                className="btn-press mx-auto mt-5 inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-primary-foreground gold-glow disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Request Judgment
              </button>
            )}
          </section>
        )}

        {/* Judging animation */}
        {deal.status === 'JUDGING' && (
          <section className="glass flex flex-col items-center rounded-2xl border border-[#a67be8]/40 p-12 text-center animate-judging">
            <GavelIcon className="h-16 w-16 text-[#a67be8] animate-gavel" />
            <p className="mt-6 font-display text-3xl font-medium text-foreground">GAVEL is deliberating…</p>
            <p className="mt-2 text-sm text-muted-foreground">Reading the terms and delivery evidence side by side.</p>
          </section>
        )}

        {/* Verdict */}
        {(deal.status === 'JUDGED' || deal.status === 'SETTLED') && deal.verdict && (
          <div className="space-y-6">
            <VerdictCard key={deal.verdict + deal.confidence} deal={deal} />

            {/* Reasoning replay + appeal status badge */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <DisputeReplay deal={deal} />
              {deal.appeal?.resolved && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#a67be8]/40 bg-[#a67be8]/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-[#c9a8f0]">
                  Final Verdict — Appeal Considered
                </span>
              )}
            </div>

            {/* Appeal panel — JUDGED only, hidden for witness (read-only) */}
            {deal.status === 'JUDGED' && !isWitness && (
              <AppealPanel deal={deal} onUpdate={(d) => setDeal(d)} />
            )}

            {deal.status === 'JUDGED' && !isWitness && (
              <div className="flex flex-col items-center gap-3 text-center">
                <button
                  onClick={handleSettle}
                  disabled={busy}
                  className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-primary-foreground gold-glow disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm Settlement
                </button>
                <p className="text-xs text-muted-foreground">Executes the on-chain split on Arbitrum.</p>
              </div>
            )}

            {deal.status === 'SETTLED' && deal.escrowTxHash && (
              <section className="glass rounded-2xl border border-success/30 p-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
                  <h2 className="font-mono text-xs uppercase tracking-widest text-success">Settled on Arbitrum</h2>
                </div>
                <a
                  href={`https://arbiscan.io/tx/${deal.escrowTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 break-all font-mono text-sm text-gold hover:underline"
                >
                  {shortId(deal.escrowTxHash)} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </section>
            )}
          </div>
        )}

        {deal.status === 'CANCELLED' && (
          <section className="glass rounded-2xl border border-danger/30 p-6 text-center">
            <p className="text-danger">This deal was cancelled by an administrator.</p>
          </section>
        )}
      </div>

      {/* Attachments */}
      <section className="glass mt-6 rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Attachments</h2>
          <button
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => uploadFiles(e.target.files)} />
        {attachments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No files attached.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <span className="flex items-center gap-3 text-sm text-foreground/90">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {a.filename}
                  <span className="font-mono text-[11px] text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                </span>
                <a
                  href={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attachments/${a.id}`}
                  className="text-muted-foreground transition-colors hover:text-gold"
                  aria-label={`Download ${a.filename}`}
                >
                  <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audit trail */}
      <section className="glass mt-6 rounded-2xl border border-border p-6">
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Dispute Timeline</h2>
        <ol className="mt-5 space-y-0">
          {deal.auditTrail.map((e, i) => (
            <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < deal.auditTrail.length - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-border" />}
              <span className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gold bg-surface" />
              <div>
                <p className="text-sm text-foreground/90">{e.description}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{formatDate(e.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function DropZone({
  dragging,
  setDragging,
  onFiles,
  onClick,
}: {
  dragging: boolean
  setDragging: (v: boolean) => void
  onFiles: (f: FileList | null) => void
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
      className={cn(
        'mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 text-center transition-colors',
        dragging ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/40',
      )}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">Drag &amp; drop files, or click to browse</p>
    </div>
  )
}
