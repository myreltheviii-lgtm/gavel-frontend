'use client'

import { Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Deal Health meter. Aggregates a 0-100 score from funding, agreement clarity,
 * party responsiveness and timeline pressure into a single at-a-glance signal.
 */
export type HealthFactor = {
  label: string
  value: number // 0-100 contribution
  weight: number // 0-1
  detail: string
}

export function computeHealth(factors: HealthFactor[]): number {
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0) || 1
  const score = factors.reduce((s, f) => s + f.value * f.weight, 0) / totalWeight
  return Math.round(score)
}

function band(score: number) {
  if (score >= 75) return { label: 'Healthy', color: 'text-success', ring: 'stroke-success', Icon: CheckCircle2 }
  if (score >= 45) return { label: 'Needs attention', color: 'text-gold', ring: 'stroke-gold', Icon: Clock }
  return { label: 'At risk', color: 'text-destructive', ring: 'stroke-destructive', Icon: AlertTriangle }
}

export function DealHealth({ factors }: { factors: HealthFactor[] }) {
  const score = computeHealth(factors)
  const { label, color, ring, Icon } = band(score)
  const r = 34
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="glass rounded-xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-gold" />
        <h3 className="font-display text-xl font-medium text-foreground">Deal Health</h3>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
            <circle cx="40" cy="40" r={r} className="fill-none stroke-border" strokeWidth="7" />
            <circle
              cx="40"
              cy="40"
              r={r}
              className={cn('fill-none transition-[stroke-dashoffset] duration-1000 ease-out', ring)}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-display text-2xl font-semibold', color)}>{score}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">score</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className={cn('flex items-center gap-1.5 text-sm font-medium', color)}>
            <Icon className="h-4 w-4" />
            {label}
          </div>
          <div className="mt-3 space-y-2">
            {factors.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono text-foreground">{Math.round(f.value)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      f.value >= 75 ? 'bg-success' : f.value >= 45 ? 'bg-gold' : 'bg-destructive',
                    )}
                    style={{ width: `${f.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
