'use client'

import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeText } from '@/lib/security'

/**
 * AI Agreement Builder. Turns a plain-English description into a professional
 * agreement with deliverables, formats, revisions, acceptance criteria and a
 * deadline. For multi-seller deals it generates per-seller sections.
 */
export function AgreementBuilder({
  sellerCount = 1,
  onUse,
}: {
  sellerCount?: number
  onUse: (terms: string) => void
}) {
  const [desc, setDesc] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState('')
  const [used, setUsed] = useState(false)

  function generate() {
    const clean = sanitizeText(desc)
    if (!clean) return
    setGenerating(true)
    setUsed(false)
    setTimeout(() => {
      setGenerated(buildAgreement(clean, sellerCount))
      setGenerating(false)
    }, 1400)
  }

  function use() {
    onUse(generated)
    setUsed(true)
  }

  return (
    <div className="glass rounded-xl border border-gold/30 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <h3 className="font-display text-xl font-medium text-foreground">AI Agreement Builder</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe your deal in plain English. GAVEL drafts a complete, judgable agreement.
      </p>

      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        placeholder="e.g. I need a logo and brand kit for my coffee startup, delivered in two weeks with source files…"
        className="mt-4 w-full rounded-lg border border-border bg-surface/60 p-3 text-sm text-foreground outline-none focus:border-gold"
      />

      <button
        type="button"
        onClick={generate}
        disabled={generating || !desc.trim()}
        className="btn-press mt-3 inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? 'Drafting…' : 'Generate Agreement'}
      </button>

      {generated && (
        <div className="mt-5 animate-fade-in">
          <div className="rounded-lg border border-border bg-surface/40 p-4">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{generated}</p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={use}
              className={cn(
                'btn-press inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
                used ? 'bg-success/15 text-success' : 'bg-gold text-primary-foreground',
              )}
            >
              {used ? <Check className="h-4 w-4" /> : null}
              {used ? 'Added to terms' : 'Use these terms'}
            </button>
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function buildAgreement(desc: string, sellers: number): string {
  const summary = desc.charAt(0).toUpperCase() + desc.slice(1)
  const base = `SCOPE OF WORK
${summary}.

DELIVERABLES
- All final assets delivered in their native source formats plus exported production-ready files.
- A short written handoff describing the contents of the delivery and how to use them.

FILE FORMATS
Source files and exported formats appropriate to the work (e.g. SVG/PDF/PNG for design, a Git repository for code, or a shared document for writing).

REVISIONS
Up to 2 rounds of revisions are included. Additional rounds may be negotiated separately.

ACCEPTANCE CRITERIA
The delivery is accepted when every item listed above is present and matches this agreement. Missing or incomplete items may result in a partial or full refund.

DEADLINE
Delivery is due within 14 days of the funds being locked, unless both parties agree otherwise in writing.`

  if (sellers <= 1) return base

  let perSeller = '\n\nPER-SELLER DELIVERABLES\nThis deal is delivered by multiple sellers. Each seller is judged independently against their own section.'
  for (let i = 1; i <= sellers; i++) {
    perSeller += `\n\nSeller ${i}
- Owns a distinct, clearly-scoped portion of the deliverables above.
- Submits their own delivery proof and is judged against their allocation.
- Acceptance and payout are determined for this seller's work specifically.`
  }
  return base + perSeller
}
