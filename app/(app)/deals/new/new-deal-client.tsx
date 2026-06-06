'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Palette, Code, PenLine, FileText, Loader2, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { TEMPLATES } from '@/lib/mock-store'
import { formatUSD, formatDate, cn } from '@/lib/utils'

const TEMPLATE_ICONS: Record<string, typeof Palette> = {
  logo: Palette,
  web: Code,
  content: PenLine,
}

const STEP_LABELS = ['Template', 'Terms', 'Details', 'Review']

export function NewDealClient() {
  const router = useRouter()
  const { token } = useAuth()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd')
  const [submitting, setSubmitting] = useState(false)

  const [title, setTitle] = useState('')
  const [terms, setTerms] = useState('')
  const [amount, setAmount] = useState('')
  const [seller, setSeller] = useState('')

  const expiry = useMemo(() => new Date(Date.now() + 30 * 86_400_000).toISOString(), [])

  function go(next: number) {
    setDir(next > step ? 'fwd' : 'back')
    setStep(next)
  }

  function pickTemplate(t?: { name: string; terms: string }) {
    if (t) {
      setTitle((cur) => cur || t.name)
      setTerms(t.terms)
    }
    go(1)
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!title.trim()) return 'Add a deal title.'
      if (!terms.trim()) return 'Add the deal terms.'
    }
    if (step === 2) {
      const amt = Number(amount)
      if (!amt || amt <= 0) return 'Enter a valid amount.'
      if (!seller.trim()) return 'Enter the seller email or ID.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { toast.error(err); return }
    go(step + 1)
  }

  async function submit() {
    if (!token) return
    setSubmitting(true)
    try {
      const deal = await api.createDeal(token, {
        title: title.trim(),
        terms: terms.trim(),
        amount: Number(amount),
        sellerId: seller.trim(),
      })
      toast.success('Deal created and funds locked.')
      router.push(`/deals/${deal.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create deal.')
      setSubmitting(false)
    }
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

      <div className="relative mt-8 overflow-hidden">
        <div key={step} className={dir === 'fwd' ? 'animate-slide-fwd' : 'animate-slide-back'}>
          {step === 0 && (
            <div>
              <h2 className="font-display text-2xl font-medium text-foreground">Start from a template</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pick a common deal type or start from scratch.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {TEMPLATES.map((t) => {
                  const Icon = TEMPLATE_ICONS[t.id] ?? FileText
                  return (
                    <button
                      key={t.id}
                      onClick={() => pickTemplate(t)}
                      className="glass group flex flex-col items-start gap-3 rounded-xl border border-border p-5 text-left transition-colors hover:border-gold/40"
                    >
                      <Icon className="h-7 w-7 text-gold" />
                      <span className="font-display text-xl font-medium text-foreground">{t.name}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{t.terms}</span>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => pickTemplate()}
                className="mt-4 w-full rounded-xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
              >
                Start blank
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-medium text-foreground">Title &amp; terms</h2>
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Brand Logo Suite"
                  className="mt-2 w-full border-0 border-b border-border bg-transparent pb-2 text-lg text-foreground outline-none focus:border-gold"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Terms</label>
                  <span className="font-mono text-[11px] text-muted-foreground">{terms.length}/2000</span>
                </div>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value.slice(0, 2000))}
                  rows={8}
                  placeholder="Describe exactly what the seller must deliver, formats, revisions, deadlines…"
                  className="mt-2 w-full rounded-lg border border-border bg-surface/60 p-3 text-foreground outline-none focus:border-gold"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-medium text-foreground">Amount &amp; counterparty</h2>
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
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Seller email or ID</label>
                <input
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  placeholder="seller@example.com"
                  className="mt-2 w-full border-0 border-b border-border bg-transparent pb-2 text-foreground outline-none focus:border-gold"
                />
              </div>
              <div className="rounded-lg border border-border bg-surface/50 p-4">
                <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Expires</span>
                <p className="mt-1 text-foreground">{formatDate(expiry)} <span className="text-muted-foreground">(30 days from today)</span></p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-medium text-foreground">Review &amp; lock</h2>
              <ReviewRow label="Title" value={title} onEdit={() => go(1)} />
              <ReviewRow label="Terms" value={terms} onEdit={() => go(1)} multiline />
              <ReviewRow label="Amount" value={formatUSD(Number(amount))} onEdit={() => go(2)} />
              <ReviewRow label="Seller" value={seller} onEdit={() => go(2)} />
              <ReviewRow label="Expires" value={formatDate(expiry)} onEdit={() => go(2)} />
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      {step > 0 && (
        <div className="mt-10 flex items-center justify-between">
          <button onClick={() => go(step - 1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
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
      )}
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
