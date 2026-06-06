'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Eye, X, Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VerdictBadge } from '@/components/status-badge'
import { partyLabel } from '@/lib/party-utils'
import type { Deal } from '@/lib/types'

/**
 * Dispute Replay — a "View Reasoning Replay" button that opens a full-screen
 * modal with a 5-step animated reconstruction of how GAVEL reached its verdict.
 * Only rendered on JUDGED and SETTLED deals.
 */
export function DisputeReplay({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false)
  if (!deal.verdict) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-press inline-flex items-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/20"
      >
        <Eye className="h-4 w-4" /> View Reasoning Replay
      </button>
      {open && <ReplayModal deal={deal} onClose={() => setOpen(false)} />}
    </>
  )
}

const STEP_TITLES = ['Terms Read', 'Evidence Weighed', 'Key Clauses Flagged', 'Reasoning Built', 'Verdict Issued']

function ReplayModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  // per-step animation progress
  const [termWords, setTermWords] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const [verdictIn, setVerdictIn] = useState(false)
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const words = useMemo(() => deal.terms.split(/\s+/).filter(Boolean), [deal.terms])
  const reasoning = deal.reasoning ?? ''
  const sellers = deal.parties?.filter((p) => p.role === 'seller') ?? []
  const clauses = useMemo(() => extractClauses(deal.terms), [deal.terms])

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Reset per-step state whenever the step changes.
  useEffect(() => {
    setTermWords(0)
    setTypedChars(0)
    setVerdictIn(false)
  }, [step])

  // Step 1 — terms highlight word by word (50ms/word).
  useEffect(() => {
    if (step !== 0 || !playing) return
    if (termWords >= words.length) return
    const t = setTimeout(() => setTermWords((w) => w + 1), 50)
    return () => clearTimeout(t)
  }, [step, playing, termWords, words.length])

  // Step 4 — reasoning typewriter (30ms/char).
  useEffect(() => {
    if (step !== 3 || !playing) return
    if (typedChars >= reasoning.length) return
    const t = setTimeout(() => setTypedChars((c) => c + 1), 30)
    return () => clearTimeout(t)
  }, [step, playing, typedChars, reasoning.length])

  // Step 5 — verdict spring in + gavel strike sound.
  useEffect(() => {
    if (step !== 4) return
    const t = setTimeout(() => {
      setVerdictIn(true)
      playGavelStrike()
    }, 200)
    return () => clearTimeout(t)
  }, [step])

  // Auto-advance through steps when playing.
  useEffect(() => {
    if (!playing) return
    if (advanceRef.current) clearTimeout(advanceRef.current)
    const stepDone =
      step === 0
        ? termWords >= words.length
        : step === 3
          ? typedChars >= reasoning.length
          : step === 4
            ? verdictIn
            : true
    if (!stepDone) return
    if (step >= 4) {
      setPlaying(false)
      return
    }
    const dwell = step === 2 ? 1600 : 800
    advanceRef.current = setTimeout(() => setStep((s) => Math.min(s + 1, 4)), dwell)
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current)
    }
  }, [playing, step, termWords, typedChars, verdictIn, words.length, reasoning.length])

  function togglePlay() {
    if (step >= 4 && verdictIn) {
      setStep(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  function back() {
    setPlaying(false)
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative mx-auto flex h-full w-full max-w-3xl flex-col px-5 py-6 md:py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-gold" />
            <h2 className="font-display text-2xl font-medium text-foreground">Reasoning Replay</h2>
          </div>
          <button onClick={onClose} aria-label="Close replay" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="mt-5 flex gap-2">
          {STEP_TITLES.map((title, i) => (
            <div key={title} className="flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div className={cn('h-full rounded-full bg-gold transition-all duration-500', i <= step ? 'w-full' : 'w-0')} />
              </div>
              <p className={cn('mt-1.5 hidden font-mono text-[9px] uppercase tracking-wider sm:block', i === step ? 'text-gold' : 'text-muted-foreground')}>
                {i + 1}. {title}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-gold sm:hidden">
          Step {step + 1} — {STEP_TITLES[step]}
        </p>

        {/* Stage */}
        <div className="mt-5 flex-1 overflow-y-auto rounded-2xl border border-border bg-surface/40 p-5 md:p-8">
          {step === 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 1 — Terms Read</h3>
              <p className="mt-4 text-lg leading-relaxed">
                {words.map((w, i) => (
                  <span key={i} className={cn('transition-colors duration-100', i < termWords ? 'text-gold' : 'text-muted-foreground/40')}>
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 2 — Evidence Weighed</h3>
              {sellers.length > 1 ? (
                <div className="mt-4 space-y-4">
                  {sellers.map((s, i) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-gold/30 bg-gold/5 p-4 animate-fade-in"
                      style={{ animationDelay: `${i * 400}ms` }}
                    >
                      <p className="font-mono text-[11px] uppercase tracking-wider text-gold">
                        {partyLabel(s, deal.parties ?? [])} · {s.email}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                        {s.deliveryProof || 'Delivery proof reviewed against this seller’s allocation.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4 text-base leading-relaxed text-foreground/90 animate-fade-in">
                  {deal.deliveryProof || 'Delivery proof reviewed against the deal terms.'}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 3 — Key Clauses Flagged</h3>
              <div className="mt-5 flex flex-wrap gap-3">
                {clauses.map((c, i) => (
                  <span
                    key={c + i}
                    className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-sm text-gold animate-clause-pulse"
                    style={{ animationDelay: `${i * 220}ms` }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 4 — Reasoning Built</h3>
              <p className="mt-4 font-sans text-base leading-relaxed text-foreground/90">
                {reasoning.slice(0, typedChars)}
                {typedChars < reasoning.length && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gold align-middle" />
                )}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 5 — Verdict Issued</h3>
              <div
                className="mt-6 transition-all duration-500"
                style={{
                  transform: verdictIn ? 'scale(1)' : 'scale(0)',
                  transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <VerdictBadge verdict={deal.verdict!} size="lg" />
              </div>
              {verdictIn && (
                <p className="mt-6 max-w-md text-sm text-muted-foreground animate-fade-in">
                  GAVEL issued this verdict with {deal.confidence ?? 0}% confidence
                  {deal.judgmentMs ? ` in ${(deal.judgmentMs / 1000).toFixed(1)} seconds` : ''}.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={back}
            disabled={step === 0}
            className="btn-press inline-flex items-center justify-center rounded-md border border-border p-2.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Previous step"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={togglePlay}
            className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? 'Pause' : step >= 4 && verdictIn ? 'Replay' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Pull a few short, telling phrases from the terms to "flag". */
function extractClauses(terms: string): string[] {
  const candidates = terms
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && s.length < 90)
  const keyworded = candidates.filter((s) => /deliver|format|revision|deadline|within|accept|criteria|svg|png|pdf|repository/i.test(s))
  const chosen = (keyworded.length ? keyworded : candidates).slice(0, 4)
  return chosen.length ? chosen : ['Deliverables match the agreed scope']
}

/** Gavel strike sound effect via the Web Audio API. */
function playGavelStrike() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    // Two quick knocks.
    for (const offset of [0, 0.12]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(180, now + offset)
      osc.frequency.exponentialRampToValueAtTime(70, now + offset + 0.08)
      gain.gain.setValueAtTime(0.0001, now + offset)
      gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + offset)
      osc.stop(now + offset + 0.2)
    }
    setTimeout(() => ctx.close(), 600)
  } catch {
    /* audio not available — silent */
  }
}
