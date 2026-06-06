'use client'

import { useEffect, useState } from 'react'
import { countdown } from '@/lib/utils'
import { cn } from '@/lib/utils'

/** Live countdown that ticks every second. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const [label, setLabel] = useState(() => countdown(to))

  useEffect(() => {
    const t = setInterval(() => setLabel(countdown(to)), 1000)
    return () => clearInterval(t)
  }, [to])

  const expired = label === 'Expired'
  return (
    <span className={cn('font-mono tabular-nums', expired && 'text-danger', className)}>
      {label}
    </span>
  )
}
