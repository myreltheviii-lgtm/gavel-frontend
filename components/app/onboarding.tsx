'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Package, Scale, ArrowRight } from 'lucide-react'
import { GavelIcon } from '@/components/brand'

const STEPS = [
  {
    title: 'Welcome to GAVEL',
    render: () => (
      <>
        <GavelIcon className="mx-auto h-16 w-16 text-gold animate-float" />
        <p className="mt-6 text-balance leading-relaxed text-muted-foreground">
          GAVEL is an AI-powered escrow judge. One person locks money, the other delivers work, and
          GAVEL reads both sides to decide what happens to the funds — with a written verdict in under
          45 seconds.
        </p>
      </>
    ),
  },
  {
    title: 'How a deal works',
    render: () => (
      <div className="flex flex-col gap-4 text-left">
        {[
          { icon: Lock, t: 'Lock', d: 'The buyer writes terms and locks USDT in escrow.' },
          { icon: Package, t: 'Deliver', d: 'The seller completes the work and submits proof.' },
          { icon: Scale, t: 'Judge', d: 'GAVEL reads both sides and issues a binding verdict.' },
        ].map((s) => (
          <div key={s.t} className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-3">
            <s.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div>
              <div className="font-medium text-foreground">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Your first deal',
    render: () => (
      <p className="text-balance leading-relaxed text-muted-foreground">
        Ready to settle something? Create your first deal — write the terms, lock the funds, and let
        GAVEL handle the rest.
      </p>
    ),
  },
]

export function Onboarding({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" onClick={onDismiss} />
      <div
        className="glass relative w-full max-w-md rounded-2xl border border-border p-8 text-center"
        style={{ animation: 'fadeIn 0.4s ease both' }}
      >
        <div className="mb-6 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1 w-8 rounded-full transition-colors ${i <= step ? 'bg-gold' : 'bg-border'}`} />
          ))}
        </div>
        <div key={step} className="page-enter">
          <h2 className="font-display text-3xl font-medium text-foreground">{STEPS[step].title}</h2>
          <div className="mt-6">{STEPS[step].render()}</div>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <button onClick={onDismiss} className="text-sm text-muted-foreground hover:text-foreground">
            Skip for now
          </button>
          {isLast ? (
            <Link
              href="/deals/new"
              onClick={onDismiss}
              className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Create a deal <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
