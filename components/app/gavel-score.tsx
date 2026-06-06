'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScorePoint } from '@/lib/types'

const SIZE_MAP = { sm: 24, md: 48, lg: 96 } as const
export type GavelScoreSize = keyof typeof SIZE_MAP

/**
 * GAVEL Score — a gold circular gauge badge with the number centered.
 * Three variants: sm (deal cards), md (deal detail), lg (profile, with sparkline).
 * Below 50 shows an amber warning; above 90 shows a gold star.
 */
export function GavelScore({
  score,
  size = 'md',
  history,
  showLabel = false,
  animate = true,
  className,
}: {
  score: number
  size?: GavelScoreSize | number
  /** Score history for the lg sparkline (last ~10 deals). */
  history?: ScorePoint[]
  showLabel?: boolean
  animate?: boolean
  className?: string
}) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size]
  const isLg = size === 'lg' || (typeof size === 'number' && size >= 96)
  const [val, setVal] = useState(animate ? 0 : score)
  const stroke = Math.max(3, px * 0.09)
  const r = (px - stroke) / 2
  const c = 2 * Math.PI * r
  const low = score < 50
  const high = score >= 90

  useEffect(() => {
    if (!animate) {
      setVal(score)
      return
    }
    const t = setTimeout(() => setVal(score), 120)
    return () => clearTimeout(t)
  }, [score, animate])

  const dash = (val / 100) * c
  const color = low ? 'var(--danger)' : score < 85 ? 'var(--gold)' : 'var(--success)'

  return (
    <span className={cn('inline-flex flex-col items-center gap-2', className)} title={`GAVEL Score: ${score}`}>
      <span className="inline-flex items-center gap-2">
        <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: px, height: px }}>
          <svg width={px} height={px} className="-rotate-90">
            <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            <circle
              cx={px / 2}
              cy={px / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
            />
          </svg>
          <span className="absolute font-mono font-semibold tabular-nums" style={{ fontSize: px * 0.32, color }}>
            {Math.round(val)}
          </span>
          {low && (
            <span
              className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-amber-400 text-[#0a0a0f]"
              style={{ width: Math.max(14, px * 0.28), height: Math.max(14, px * 0.28) }}
              aria-label="Low score warning"
            >
              <AlertTriangle style={{ width: px * 0.16, height: px * 0.16 }} />
            </span>
          )}
          {high && (
            <span
              className="absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-gold text-[#0a0a0f]"
              style={{ width: Math.max(14, px * 0.28), height: Math.max(14, px * 0.28) }}
              aria-label="Excellent score"
            >
              <Star className="fill-current" style={{ width: px * 0.16, height: px * 0.16 }} />
            </span>
          )}
        </span>
        {showLabel && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">GAVEL Score</span>
        )}
      </span>

      {isLg && history && history.length > 1 && <Sparkline history={history} />}
    </span>
  )
}

/** Small gold line chart of score history over recent deals. */
function Sparkline({ history }: { history: ScorePoint[] }) {
  const pts = history.slice(-10)
  const w = 120
  const h = 32
  const min = Math.min(...pts.map((p) => p.score))
  const max = Math.max(...pts.map((p) => p.score))
  const range = Math.max(1, max - min)
  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * w
    const y = h - ((p.score - min) / range) * (h - 4) - 2
    return [x, y] as const
  })
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`

  return (
    <span className="mt-1 inline-flex flex-col items-center">
      <svg width={w} height={h} className="overflow-visible" aria-label="Score history">
        <path d={area} fill="var(--gold)" opacity={0.08} />
        <path d={path} fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        {coords.length > 0 && (
          <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={2.5} fill="var(--gold)" />
        )}
      </svg>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">last {pts.length} deals</span>
    </span>
  )
}

/** Compact inline pill version for tight spaces (deal cards next to counterparty). */
export function GavelScorePill({ score, className }: { score: number; className?: string }) {
  const low = score < 50
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-medium tabular-nums',
        low ? 'border-amber-400/40 bg-amber-400/10 text-amber-300' : score < 85 ? 'border-gold/40 bg-gold/10 text-gold' : 'border-success/40 bg-success/10 text-success',
        className,
      )}
      title={`GAVEL Score: ${score}`}
    >
      {low && <AlertTriangle className="h-2.5 w-2.5" />}
      {score >= 90 && <Star className="h-2.5 w-2.5 fill-current" />}
      {score}
    </span>
  )
}
