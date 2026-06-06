'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useWebSocket } from '@/lib/use-websocket'
import { DealRoom } from '@/components/app/deal-room'
import { StatusBadge } from '@/components/status-badge'
import { shortId } from '@/lib/utils'
import type { Deal } from '@/lib/types'

export function DealRoomClient({ id }: { id: string }) {
  const { token } = useAuth()
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const { status: wsStatus } = useWebSocket(id, (updated) => setDeal(updated))

  useEffect(() => {
    let active = true
    if (!token) return
    api
      .deal(token, id)
      .then((d) => {
        if (active) {
          setDeal(d)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setNotFound(true)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [token, id])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    )
  }

  if (notFound || !deal) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-display text-3xl text-foreground">Deal not found</p>
        <Link href="/deals" className="mt-4 text-sm text-gold hover:underline">
          Back to deals
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Link
        href={`/deals/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to deal
      </Link>

      <header className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-gold">
            <Users className="h-4 w-4" />
            <span className="font-mono text-xs uppercase tracking-widest">Deal Room</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium text-foreground md:text-4xl">{deal.title}</h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Deal {shortId(deal.id)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${wsStatus === 'connected' ? 'bg-success animate-pulse-dot' : 'bg-muted-foreground'}`}
            />
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {wsStatus === 'connected' ? 'Live' : wsStatus}
            </span>
          </div>
          <StatusBadge status={deal.status} />
        </div>
      </header>

      <div className="mt-6">
        <DealRoom deal={deal} />
      </div>
    </div>
  )
}
