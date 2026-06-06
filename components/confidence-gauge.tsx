'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** Animated confidence arc gauge — draws itself from 0 to `value` (0-100). */
export function ConfidenceGauge({
  value,
  size = 180,
  label = 'Confidence',
  className,
}: {
  value: number
  size?: number
  label?: string
  className?: string
}) {
  const [animated, setAnimated] = useState(0)
  const stroke = size * 0.07
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  // 270-degree arc
  const arc = 0.75
  const circumference = 2 * Math.PI * r
  const dash = circumference * arc

  useEffect(() => {
    const t = setTimeout(() => setAnimated(value), 200)
    return () => clearTimeout(t)
  }, [value])

  const progress = (animated / 100) * dash

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1.4s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-semibold text-gold tabular-nums">
          {Math.round(animated)}%
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  )
}
