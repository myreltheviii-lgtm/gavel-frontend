'use client'

import { useState } from 'react'
import { Plus, X, GripVertical, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatUSD } from '@/lib/utils'

export interface MilestoneDraft {
  id: string
  title: string
  description: string
  amount: number
  deadline: string
  sellerPartyId?: string
}

const MAX = 10

function uid() {
  return 'm_' + Math.random().toString(36).slice(2, 9)
}

export function makeDefaultMilestone(): MilestoneDraft {
  return { id: uid(), title: '', description: '', amount: 0, deadline: '' }
}

/**
 * Multi-milestone builder. Up to 10 milestones with drag-and-drop reorder.
 * Total auto-sums. Optionally assigns a seller party per milestone.
 */
export function MilestoneBuilder({
  milestones,
  onChange,
  sellerOptions,
}: {
  milestones: MilestoneDraft[]
  onChange: (next: MilestoneDraft[]) => void
  sellerOptions?: { id: string; label: string }[]
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const total = milestones.reduce((s, m) => s + (m.amount || 0), 0)

  function add() {
    if (milestones.length >= MAX) return
    onChange([...milestones, makeDefaultMilestone()])
  }
  function update(id: string, patch: Partial<MilestoneDraft>) {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  function remove(id: string) {
    onChange(milestones.filter((m) => m.id !== id))
  }
  function reorder(from: number, to: number) {
    if (from === to) return
    const next = milestones.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {milestones.map((m, i) => (
          <div
            key={m.id}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) reorder(dragIndex, i)
              setDragIndex(null)
            }}
            className={cn(
              'glass rounded-lg border border-border p-3 transition-opacity',
              dragIndex === i && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="cursor-grab text-muted-foreground active:cursor-grabbing" aria-hidden="true">
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/40 bg-gold/10 font-mono text-[11px] text-gold">
                {i + 1}
              </span>
              <input
                value={m.title}
                onChange={(e) => update(m.id, { title: e.target.value })}
                placeholder="Milestone title"
                className="flex-1 border-0 border-b border-border bg-transparent pb-1 text-sm text-foreground outline-none focus:border-gold"
              />
              {milestones.length > 1 && (
                <button type="button" onClick={() => remove(m.id)} aria-label={`Remove milestone ${i + 1}`} className="text-muted-foreground hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <textarea
              value={m.description}
              onChange={(e) => update(m.id, { description: e.target.value })}
              rows={2}
              placeholder="What does this milestone deliver?"
              className="mt-3 w-full rounded-md border border-border bg-surface/60 p-2 text-sm text-foreground outline-none focus:border-gold"
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Amount (USDT)</label>
                <div className="mt-1 flex items-center gap-1 border-b border-border focus-within:border-gold">
                  <span className="pb-1 font-mono text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    min={0}
                    value={m.amount === 0 ? '' : m.amount}
                    onChange={(e) => update(m.id, { amount: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="0"
                    className="w-full bg-transparent pb-1 font-mono text-sm text-foreground outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Deadline</label>
                <div className="mt-1 flex items-center gap-1 border-b border-border focus-within:border-gold">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="date"
                    value={m.deadline}
                    onChange={(e) => update(m.id, { deadline: e.target.value })}
                    className="w-full bg-transparent pb-1 font-mono text-sm text-foreground outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {sellerOptions && sellerOptions.length > 1 && (
              <div className="mt-3">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Assigned seller</label>
                <select
                  value={m.sellerPartyId ?? ''}
                  onChange={(e) => update(m.id, { sellerPartyId: e.target.value || undefined })}
                  className="mt-1 w-full rounded-md border border-border bg-surface/60 p-2 text-sm text-foreground outline-none focus:border-gold"
                >
                  <option value="">Any seller</option>
                  {sellerOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={add}
          disabled={milestones.length >= MAX}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-gold hover:underline disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add milestone ({milestones.length}/{MAX})
        </button>
        <span className="font-mono text-sm text-foreground">
          Total <span className="font-semibold text-gold">{formatUSD(total)}</span>
        </span>
      </div>
    </div>
  )
}
