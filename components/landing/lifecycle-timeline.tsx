'use client'

import { useEffect, useState } from 'react'
import { GavelIcon } from '@/components/brand'
import { cn } from '@/lib/utils'

const STATES = [
  { key: 'LOCKED', label: 'Buyer locks USDT in escrow.' },
  { key: 'DELIVERED', label: 'Seller submits proof of work.' },
  { key: 'JUDGING', label: 'GAVEL reads both sides.' },
  { key: 'JUDGED', label: 'A written verdict is issued.' },
  { key: 'SETTLED', label: 'Funds split on Arbitrum.' },
]

export function LifecycleTimeline() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % STATES.length), 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/* horizontal on desktop, vertical on mobile */}
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-2">
        {STATES.map((s, i) => {
          const isActive = i === active
          const isPast = i < active
          return (
            <div key={s.key} className="relative flex items-start gap-4 md:flex-1 md:flex-col md:items-center md:text-center">
              {/* connector line (desktop) */}
              {i < STATES.length - 1 && (
                <div className="absolute left-[15px] top-8 h-[calc(100%+1rem)] w-px bg-border md:left-auto md:right-[-50%] md:top-4 md:h-px md:w-full" />
              )}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500',
                  isActive
                    ? 'border-gold bg-gold/15 text-gold gold-glow'
                    : isPast
                      ? 'border-gold/60 bg-gold/10 text-gold/80'
                      : 'border-border bg-surface text-muted-foreground',
                )}
              >
                {s.key === 'JUDGING' && isActive ? (
                  <GavelIcon className="h-4 w-4 animate-gavel" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
                {isActive && <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-40" />}
              </div>
              <div className="md:mt-4">
                <div
                  className={cn(
                    'font-mono text-xs font-semibold uppercase tracking-widest transition-colors',
                    isActive ? 'text-gold' : isPast ? 'text-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {s.key}
                </div>
                <div className="mt-1 max-w-[180px] text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
