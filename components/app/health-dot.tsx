'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Polls /health every 30s. Green dot when ok, red when not. */
export function HealthDot() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const h = await api.health()
        if (active) setOk(h.status === 'ok')
      } catch {
        if (active) setOk(false)
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          ok === null ? 'bg-muted-foreground' : ok ? 'bg-success animate-pulse-dot' : 'bg-danger',
        )}
      />
      {ok === null ? 'Checking' : ok ? 'System healthy' : 'System down'}
    </div>
  )
}
