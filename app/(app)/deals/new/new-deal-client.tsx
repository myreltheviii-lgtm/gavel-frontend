'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, Eye, ListChecks } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { TEMPLATES } from '@/lib/mock-store'
import { sanitizeText, trimInput } from '@/lib/security'
import { formatUSD, formatDate, cn } from '@/lib/utils'
import { AgreementBuilder } from '@/components/app/agreement-builder'
import { PartyManager, makeDefaultParties, partiesValid } from '@/components/app/party-manager'
import { MilestoneBuilder, type MilestoneDraft } from '@/components/app/milestone-builder'
import { WitnessInput } from '@/components/app/witness-panel'
import { InsurancePanel } from '@/components/app/insurance-panel'
import type { PartyDraft } from '@/components/app/party-card'
import type { Milestone, Party } from '@/lib/types'

const STEP_LABELS = ['Agreement', 'Parties', 'Milestones', 'Witness', 'Review']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9)
}

export function NewDealClient() {
  const router = useRouter()
  const { token, user } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [submitting, setSubmitting] = useState(false)

  // Step 0 — agreement
  const [title, setTitle] = useState('')
  const [terms, setTerms] = useState('')
  const [amount, setAmount] = useState('')

  // Step 1 — parties
  const [parties, setParties] = useState<PartyDraft[]>(() => makeDefaultParties(user?.email ?? 'you@gavel.court'))

  // Step 2 — milestones (optional)
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([])

  // Step 3 — witness (optional)
  const [witnessOn, setWitnessOn] = useState(false)
  const [witnessEmail, setWitnessEmail] = useState('')

  // Review — insurance (only > $500)
  const [insured, setInsured] = useState(false)

  const expiry = useMemo(() => new Date(Date.now() + 30 * 86_400_000).toISOString(), [])
  const amountNum = Number(amount) || 0

  const sellers = parties.filter((p) => p.role === 'seller')
  const buyers = parties.filter((p) => p.role === 'buyer')
  const isMulti = buyers.length > 1 || sellers.length > 1
  const sellerOptions = sellers
    .filter((s) => s.email.trim())
    .map((s, i) => ({ id: s.id, label: sellers.length > 1 ? `Seller ${i + 1} · ${s.email}` : s.email }))

  function go(next: number) {
    setDir(next > step ? 'fwd' : 'back')
    setStep(next)
  }

  function quickFill(t: { name: string; terms: string }) {
    setTitle((cur) => cur || t.name)
    setTerms(t.terms)
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!title.trim()) return 'Add a deal title.'
      if (!terms.trim()) return 'Generate or write the deal terms.'
      if (!amountNum || amountNum <= 0) return 'Enter a valid amount.'
    }
    if (step === 1) {
      if (!partiesValid(parties)) {
        return 'Each side needs a valid email and allocations must total exactly 100%.'
      }
    }
    if (step === 2) {
      const partial = milestones.find((m) => (m.title.trim() || m.amount > 0) && !m.title.trim())
      if (partial) return 'Give every milestone a title, or remove it.'
    }
    if (step === 3) {
      if (witnessOn && !EMAIL_RE.test(witnessEmail.trim())) return 'Enter a valid witness email, or turn the witness off.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) {
      toast.error(err)
      return
    }
    go(step + 1)
  }

  function buildParties(): Party[] | undefined {
    if (!isMulti) return undefined
    return parties.map((p) => {
      const isCreator = !!p.locked || p.email.trim().toLowerCase() === user?.email?.toLowerCase()
      return {
        id: p.id,
        email: trimInput(p.email),
        role: p.role,
        allocation: p.allocation,
        accepted: isCreator,
        confirmed: p.role === 'buyer' ? isCreator : undefined,
        delivered: p.role === 'seller' ? false : undefined,
      }
    })
  }

  function buildMilestones(): Milestone[] | undefined {
    const valid = milestones.filter((m) => m.title.trim())
    if (valid.length === 0) return undefined
    return valid.map((m) => ({
      id: m.id || uid('m_'),
      title: m.title.trim(),
      description: m.description.trim(),
      amount: m.amount,
      deadline: m.deadline || expiry,
      status: 'LOCKED' as const,
      sellerPartyId: m.sellerPartyId,
    }))
  }

  async function submit() {
    if (!token) return
    // Re-validate every gated step before locking funds.
    for (let s = 0; s <= 3; s++) {
      const err = validateAt(s)
      if (err) {
        go(s)
        toast.error(err)
        return
      }
    }
    setSubmitting(true)
    try {
      const sellerId = trimInput(sellers[0]?.email ?? '')
      const deal = await api.createDeal(token, {
        title: trimInput(title),
        terms: sanitizeText(terms),
        amount: amountNum,
        sellerId,
        parties: buildParties(),
        milestones: buildMilestones(),
        witnessEmail: witnessOn ? trimInput(witnessEmail) : undefined,
        insured: amountNum > 500 ? insured : false,
      })
      toast.success('Deal created and funds locked.')
      router.push(`/deals/${deal.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create deal.')
      setSubmitting(false)
    }
  }

  // Pure validation for an arbitrary step, used by the final submit guard.
  function validateAt(s: number): string | null {
    if (s === 0) {
      if (!title.trim()) return 'Add a deal title.'
      if (!terms.trim()) return 'Generate or write the deal terms.'
      if (!amountNum || amountNum <= 0) return 'Enter a valid amount.'
    }
    if (s === 1 && !partiesValid(parties)) {
      return 'Each side needs a valid email and allocations must total exactly 100%.'
    }
    if (s === 3 && witnessOn && !EMAIL_RE.test(witnessEmail.trim())) {
      return 'Enter a valid witness email, or turn the witness off.'
    }
    return null
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/deals" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>

      <h1 className="mt-6 font-display text-4xl font-medium text-foreground md:text-5xl">Create a deal</h1>

      {/* Step indicator */}
      <div className="mt-6 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs transition-colors',
                i < step ? 'border-gold bg-gold text-primary-foreground'
                  : i === step ? 'border-gold text-gold'
                  : 'border-border text-muted-foreground',
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && <div className={cn('h-px flex-1', i < step ? 'bg-gold/50' : 'bg-border')} />}
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-gold">
        Step {step + 1} — {STEP_LABELS[step]}
      </p>

      <div className="relative mt-6 overflow-hidden">
        <div key={step} className={dir === 'fwd' ? 'animate-slide-fwd' : 'animate-slide-back'}>
          {/* STEP 0 — Agreement */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Brand Logo Suite"
                  className="mt-2 w-full border-0 border-b border-border bg-transparent pb-2 text-lg text-foreground outline-none focus:border-gold"
                />
              </div>

              <AgreementBuilder sellerCount={Math.max(1, sellers.length)} onUse={(t) => setTerms(t)} />

              <div>
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Terms</label>
                  <span className="font-mono text-[11px] text-muted-foreground">{terms.length}/2000</span>
                </div>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value.slice(0, 2000))}
                  rows={7}
                  placeholder="Generate above, or describe exactly what the seller must deliver, formats, revisions, deadlines…"
                  className="mt-2 w-full rounded-lg border border-border bg-surface/60 p-3 text-foreground outline-none focus:border-gold"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Quick fill:</span>
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => quickFill(t)}
                      className="rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Amount (USD / USDT)</label>
                <div className="mt-2 flex items-center gap-2 border-b border-border focus-within:border-gold">
                  <span className="font-mono text-lg text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1200"
                    className="w-full bg-transparent pb-2 font-mono text-lg text-foreground outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — Parties */}
          {step === 1 && (
            <PartyManager parties={parties} amount={amountNum} onChange={setParties} />
          )}

          {/* STEP 2 — Milestones */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-gold" />
                <h2 className="font-display text-2xl font-medium text-foreground">Milestones</h2>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>
              </div>
              <p className="-mt-2 text-sm text-muted-foreground">
                Break the deal into phases that release funds independently. Drag to reorder
                {sellers.length > 1 ? ', and assign each milestone to a seller.' : '.'}
              </p>
              <MilestoneBuilder milestones={milestones} onChange={setMilestones} sellerOptions={sellerOptions} />
            </div>
          )}

          {/* STEP 3 — Witness */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-gold" />
                <h2 className="font-display text-2xl font-medium text-foreground">Witness</h2>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>
              </div>
              <div className="glass flex items-center justify-between rounded-lg border border-border p-4">
                <div className="pr-4">
                  <p className="font-medium text-foreground">Add a GAVEL Witness</p>
                  <p className="mt-1 text-sm text-muted-foreground">A neutral third party gets read-only access and stage notifications.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={witnessOn}
                  onClick={() => setWitnessOn((v) => !v)}
                  className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', witnessOn ? 'bg-gold' : 'bg-border')}
                >
                  <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform', witnessOn ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
              </div>
              {witnessOn && <WitnessInput value={witnessEmail} onChange={setWitnessEmail} />}
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-medium text-foreground">Review &amp; lock</h2>
              <ReviewRow label="Title" value={title} onEdit={() => go(0)} />
              <ReviewRow label="Terms" value={terms} onEdit={() => go(0)} multiline />
              <ReviewRow label="Amount" value={formatUSD(amountNum)} onEdit={() => go(0)} />
              <ReviewRow
                label={isMulti ? 'Parties' : 'Seller'}
                value={
                  isMulti
                    ? `${buyers.length} buyer${buyers.length === 1 ? '' : 's'} · ${sellers.length} seller${sellers.length === 1 ? '' : 's'}`
                    : sellers[0]?.email ?? '—'
                }
                onEdit={() => go(1)}
              />
              {milestones.filter((m) => m.title.trim()).length > 0 && (
                <ReviewRow
                  label="Milestones"
                  value={`${milestones.filter((m) => m.title.trim()).length} phase${milestones.filter((m) => m.title.trim()).length === 1 ? '' : 's'}`}
                  onEdit={() => go(2)}
                />
              )}
              <ReviewRow label="Witness" value={witnessOn ? witnessEmail : 'None'} onEdit={() => go(3)} />
              <ReviewRow label="Expires" value={formatDate(expiry)} onEdit={() => go(0)} />

              {/* Insurance — only above $500 */}
              {amountNum > 500 && (
                <InsurancePanel
                  amount={amountNum}
                  enabled={insured}
                  onToggle={setInsured}
                  buyers={isMulti ? buyers.map((b) => ({ email: b.email, allocation: b.allocation })) : undefined}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < STEP_LABELS.length - 1 ? (
          <button onClick={next} className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-6 py-3 text-sm font-medium text-primary-foreground gold-glow disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create Deal &amp; Lock Funds
          </button>
        )}
      </div>
    </div>
  )
}

function ReviewRow({ label, value, onEdit, multiline }: { label: string; value: string; onEdit: () => void; multiline?: boolean }) {
  return (
    <div className="glass flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div className="min-w-0">
        <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className={cn('mt-1 text-foreground', multiline ? 'whitespace-pre-wrap text-sm leading-relaxed' : 'truncate')}>
          {value || <span className="text-muted-foreground">—</span>}
        </div>
      </div>
      <button onClick={onEdit} className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-gold hover:underline">
        <Pencil className="h-3 w-3" /> Edit
      </button>
    </div>
  )
}
