'use client'

import { useEffect, useState } from 'react'
import { countdown } from '@/lib/utils'
import { cn } from '@/lib/utils'

const HOUR = 3_600_000
const DAY = 86_400_000
const TEN_MIN = 600_000

export type CountdownUrgency = 'normal' | 'soon' | 'urgent' | 'critical' | 'expired'

/** Shared ticking state for any countdown UI. Recomputes every second. */
export function useCountdown(to: string): { label: string; ms: number; urgency: CountdownUrgency } {
  const compute = () => {
    const ms = new Date(to).getTime() - Date.now()
    return { label: countdown(to), ms }
  }
  const [state, setState] = useState(compute)

  useEffect(() => {
    setState(compute())
    const t = setInterval(() => setState(compute()), 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to])

  const { ms } = state
  let urgency: CountdownUrgency = 'normal'
  if (ms <= 0) urgency = 'expired'
  else if (ms < TEN_MIN) urgency = 'critical'
  else if (ms < HOUR) urgency = 'urgent'
  else if (ms < DAY) urgency = 'soon'
  return { ...state, urgency }
}

/**
 * Live countdown that ticks every second.
 * Urgency colors: amber under 24h, red pulsing under 1h, expired in danger.
 */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const { label, urgency } = useCountdown(to)

  return (
    <span
      className={cn(
        'font-mono tabular-nums transition-colors',
        urgency === 'soon' && 'text-amber-400',
        (urgency === 'urgent' || urgency === 'critical') && 'text-danger animate-pulse-dot',
        urgency === 'expired' && 'text-danger',
        className,
      )}
    >
      {label}
    </span>
  )
}
