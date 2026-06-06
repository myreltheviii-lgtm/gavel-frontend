import Link from 'next/link'
import { Lock, Package, Scale, ArrowRight } from 'lucide-react'
import { LandingNav } from '@/components/landing/landing-nav'
import { ParticleField } from '@/components/landing/particle-field'
import { HeroTicker } from '@/components/landing/hero-ticker'
import { VerdictMockup } from '@/components/landing/verdict-mockup'
import { LifecycleTimeline } from '@/components/landing/lifecycle-timeline'
import { Reveal } from '@/components/reveal'
import { Logo } from '@/components/brand'

const STEPS = [
  {
    icon: Lock,
    title: 'Lock',
    body: 'The buyer writes deal terms and locks USDT in escrow. Funds are held by the smart contract — not by GAVEL, not by anyone.',
  },
  {
    icon: Package,
    title: 'Deliver',
    body: 'The seller completes the work and submits proof — a description, links, files, screenshots. Whatever the terms require.',
  },
  {
    icon: Scale,
    title: 'Judge',
    body: "GAVEL's AI reads the original terms and the delivery evidence side by side. It issues a written verdict with reasoning and a confidence score in under 45 seconds.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Section 1 — Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ParticleField />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
        </div>
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <h1 className="font-display text-7xl font-semibold leading-none tracking-tight text-foreground sm:text-8xl md:text-[10rem]">
            GAVEL
          </h1>
          <p className="mt-6 text-balance font-sans text-lg text-muted-foreground sm:text-xl">
            AI-judged escrow. On-chain settlement. No lawyers.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="btn-press inline-flex items-center gap-2 rounded-md bg-gold px-7 py-3 text-base font-medium text-primary-foreground gold-glow"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="btn-press inline-flex items-center gap-2 rounded-md border border-border px-7 py-3 text-base font-medium text-foreground hover:border-gold/50"
            >
              See How It Works
            </a>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10">
          <HeroTicker />
        </div>
      </section>

      {/* Section 2 — How It Works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-28">
        <Reveal className="mb-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">How It Works</p>
          <h2 className="mt-4 text-balance font-display text-5xl font-medium text-foreground md:text-6xl">
            Three steps. No committees.
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 150}>
              <div className="glass group h-full rounded-2xl border border-border p-8 transition-colors hover:border-gold/30">
                <div className="flex items-center justify-between">
                  <step.icon className="h-8 w-8 text-gold" />
                  <span className="font-display text-6xl font-semibold text-border transition-colors group-hover:text-gold/20">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-3xl font-medium text-foreground">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Section 3 — Live Verdict Mockup */}
      <section className="border-y border-border bg-surface/30 px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mb-14 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">The Output</p>
            <h2 className="mt-4 text-balance font-display text-5xl font-medium text-foreground md:text-6xl">
              This is what GAVEL produces.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              A written verdict, a confidence score, and an automatic split of the funds — in under 45 seconds.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <VerdictMockup />
          </Reveal>
        </div>
      </section>

      {/* Section 4 — Deal Lifecycle */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <Reveal className="mb-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">The Lifecycle</p>
          <h2 className="mt-4 text-balance font-display text-5xl font-medium text-foreground md:text-6xl">
            From locked to settled.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <LifecycleTimeline />
        </Reveal>
      </section>

      {/* Section 5 — Closing CTA */}
      <section className="border-t border-border bg-surface/30 px-6 py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance font-display text-5xl font-medium text-foreground md:text-6xl">
            Settle your next deal in under 2 minutes.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            No lawyers. No committees. No waiting. Just a verdict you can trust.
          </p>
          <Link
            href="/register"
            className="btn-press mt-10 inline-flex items-center gap-2 rounded-md bg-gold px-8 py-3.5 text-base font-medium text-primary-foreground gold-glow"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <Logo />
          <nav className="flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#how" className="transition-colors hover:text-foreground">How It Works</a>
            <Link href="/verdicts" className="transition-colors hover:text-foreground">Public Verdicts</Link>
            <Link href="/stats" className="transition-colors hover:text-foreground">Stats</Link>
          </nav>
          <p className="text-sm text-muted-foreground">AI-judged escrow for any agreement.</p>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-border pt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Built on Arbitrum. Powered by QVAC.
          </p>
        </div>
      </footer>
    </div>
  )
}
