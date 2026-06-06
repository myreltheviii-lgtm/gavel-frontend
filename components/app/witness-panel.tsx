'use client'

import { Eye, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Witness } from '@/lib/types'

const STAGES = ['LOCKED', 'DELIVERED', 'JUDGED', 'SETTLED'] as const

/** Create Deal: optional witness email input. */
export function WitnessInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="glass rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-gold" />
        <h3 className="font-display text-lg font-medium text-foreground">GAVEL Witness</h3>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Optional</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        A witness receives notifications at every stage and has read-only access to the deal.
      </p>
      <input
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="witness@example.com"
        className="mt-3 w-full border-0 border-b border-border bg-transparent pb-1.5 text-sm text-foreground outline-none focus:border-gold"
      />
    </div>
  )
}

/** Deal Detail: read-only witness notification status. */
export function WitnessPanel({ witness }: { witness: Witness }) {
  return (
    <section className="glass rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-gold" />
        <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Witness</h2>
      </div>
      <p className="mt-3 break-all font-mono text-sm text-foreground/90">{witness.email}</p>
      <ul className="mt-4 space-y-2">
        {STAGES.map((stage) => {
          const notified = witness.notified[stage]
          return (
            <li key={stage} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full',
                  notified ? 'bg-success/15 text-success' : 'bg-accent text-muted-foreground',
                )}
              >
                {notified ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{stage}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {notified ? 'Notified' : 'Pending'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
