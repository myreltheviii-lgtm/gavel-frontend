'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Plus, X, BadgeCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { PublicNav } from '@/components/public-nav'
import { GavelScorePill } from '@/components/app/gavel-score'
import { sanitizeText, trimInput } from '@/lib/security'
import { cn } from '@/lib/utils'
import type { DealTemplate } from '@/lib/types'

const CATEGORIES = ['All', 'Design', 'Development', 'Writing', 'Video', 'Marketing', 'Other'] as const
type Category = (typeof CATEGORIES)[number]
type SortKey = 'used' | 'rating' | 'newest'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'used', label: 'Most Used' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'newest', label: 'Newest' },
]

export function TemplatesClient() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [templates, setTemplates] = useState<DealTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>('All')
  const [sort, setSort] = useState<SortKey>('used')
  const [publishing, setPublishing] = useState(false)

  function load() {
    api.templates().then((t) => { setTemplates(t); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let list = templates.filter((t) => category === 'All' || t.category === category)
    list = [...list].sort((a, b) => {
      if (sort === 'rating') return b.rating - a.rating
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return b.uses - a.uses
    })
    return list
  }, [templates, category, sort])

  function useTemplate(t: DealTemplate) {
    const params = new URLSearchParams({ terms: t.terms, title: t.name })
    router.push(`/deals/new?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Marketplace</p>
            <h1 className="mt-3 font-display text-5xl font-medium text-foreground md:text-6xl">Deal Templates</h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Community-verified agreement templates. One click to start your deal.
            </p>
          </div>
          {token && (
            <button
              onClick={() => setPublishing(true)}
              className="btn-press inline-flex shrink-0 items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Publish Template
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-1 border-b border-border">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'relative px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors',
                category === c ? 'text-gold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {c}
              {category === c && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold" />}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">No templates in this category yet.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => (
              <article
                key={t.id}
                className="glass group flex flex-col rounded-xl border border-border p-5 transition-all hover:-translate-y-1 hover:border-gold/50 hover:gold-glow"
                style={{ animation: `fadeIn 0.4s ease ${i * 40}ms both` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-medium leading-tight text-foreground">{t.name}</h2>
                  {t.uses > 100 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-border bg-surface/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t.category}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{t.uses} uses</span>
                  <Stars rating={t.rating} />
                </div>
                <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {t.terms.slice(0, 200)}
                  {t.terms.length > 200 ? '…' : ''}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <GavelScorePill score={t.authorScore} />
                    <span className="truncate font-mono text-[10px] text-muted-foreground">{t.authorEmail}</span>
                  </span>
                </div>
                <button
                  onClick={() => useTemplate(t)}
                  className="btn-press mt-4 w-full rounded-md bg-gold py-2 text-sm font-medium text-primary-foreground"
                >
                  Use This Template
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {publishing && (
        <PublishModal
          authorEmail={user?.email ?? ''}
          authorScore={user?.gavelScore ?? 75}
          onClose={() => setPublishing(false)}
          onPublished={() => { setPublishing(false); load() }}
        />
      )}
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn('h-3 w-3', i < Math.round(rating) ? 'fill-gold text-gold' : 'text-border')}
        />
      ))}
      <span className="ml-1 font-mono text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
    </span>
  )
}

function PublishModal({
  authorEmail,
  authorScore,
  onClose,
  onPublished,
}: {
  authorEmail: string
  authorScore: number
  onClose: () => void
  onPublished: () => void
}) {
  const { token } = useAuth()
  const toast = useToast()
  const [name, setName] = useState('')
  const [cat, setCat] = useState<DealTemplate['category']>('Design')
  const [terms, setTerms] = useState('')
  const [multiParty, setMultiParty] = useState(false)
  const [buyers, setBuyers] = useState(1)
  const [sellers, setSellers] = useState(2)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!token) return
    const cleanName = trimInput(name)
    const cleanTerms = sanitizeText(terms)
    if (!cleanName) { toast.error('Add a template name.'); return }
    if (cleanTerms.length < 20) { toast.error('Terms must be at least 20 characters.'); return }
    setBusy(true)
    try {
      await api.publishTemplate(token, {
        name: cleanName,
        category: cat,
        terms: cleanTerms,
        authorEmail,
        authorScore,
        ...(multiParty ? { partyConfig: { buyers, sellers } } : {}),
      })
      toast.success('Template published.')
      onPublished()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to publish template.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="glass relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border p-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl font-medium text-foreground">Publish a template</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brand Identity Package"
          className="mt-2 w-full border-0 border-b border-border bg-transparent pb-1.5 text-foreground outline-none focus:border-gold"
        />

        <label className="mt-4 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Category</label>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value as DealTemplate['category'])}
          className="mt-2 w-full rounded-md border border-border bg-surface/60 p-2 text-sm text-foreground outline-none focus:border-gold"
        >
          {(['Design', 'Development', 'Writing', 'Video', 'Marketing', 'Other'] as const).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="mt-4 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Terms</label>
        <textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={6}
          placeholder="Describe the deliverables, formats, revisions, deadline, acceptance criteria…"
          className="mt-2 w-full rounded-lg border border-border bg-surface/60 p-3 text-sm text-foreground outline-none focus:border-gold"
        />

        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface/40 p-3">
          <div>
            <p className="text-sm text-foreground">Multi-party template</p>
            <p className="text-xs text-muted-foreground">Recommend a buyer/seller configuration.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={multiParty}
            onClick={() => setMultiParty((v) => !v)}
            className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', multiParty ? 'bg-gold' : 'bg-border')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform', multiParty ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
        </div>

        {multiParty && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Buyers</span>
              <input type="number" min={1} max={5} value={buyers} onChange={(e) => setBuyers(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-md border border-border bg-surface/60 p-2 font-mono text-sm text-foreground outline-none focus:border-gold" />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Sellers</span>
              <input type="number" min={1} max={5} value={sellers} onChange={(e) => setSellers(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-md border border-border bg-surface/60 p-2 font-mono text-sm text-foreground outline-none focus:border-gold" />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish
          </button>
        </div>
      </div>
    </div>
  )
}
