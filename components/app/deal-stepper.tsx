'use client'

import { GavelIcon } from '@/components/brand'
import { cn } from '@/lib/utils'
import type { DealStatus } from '@/lib/types'

const STEPS: DealStatus[] = ['LOCKED', 'DELIVERED', 'JUDGING', 'JUDGED', 'SETTLED']

/** Progress stepper for a deal. Highlights the current step with a pulsing gold ring. */
export function DealStepper({ status }: { status: DealStatus }) {
  // map terminal/abnormal statuses onto the rail
  const idx =
    status === 'CANCELLED' || status === 'EXPIRED'
      ? -1
      : STEPS.indexOf(status)

  return (
    <div className="flex w-full items-center">
      {STEPS.map((s, i) => {
        const isActive = i === idx
        const isPast = idx >= 0 && i < idx
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-500',
                  isActive
                    ? 'border-gold bg-gold/15 text-gold gold-glow'
                    : isPast
                      ? 'border-gold/60 bg-gold/10 text-gold/80'
                      : 'border-border bg-surface text-muted-foreground',
                )}
              >
                {s === 'JUDGING' && isActive ? (
                  <GavelIcon className="h-4 w-4 animate-gavel" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
                {isActive && <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-40" />}
              </div>
              <span
                className={cn(
                  'mt-2 hidden font-mono text-[10px] uppercase tracking-widest sm:block',
                  isActive ? 'text-gold' : isPast ? 'text-foreground/70' : 'text-muted-foreground',
                )}
              >
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-1 h-px flex-1 transition-colors duration-500 sm:mx-2', isPast ? 'bg-gold/50' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
