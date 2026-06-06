'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { Deal } from '@/lib/types'

export function useDeals() {
  const { token } = useAuth()
  const { data, error, isLoading, mutate } = useSWR(
    token ? ['deals', token] : null,
    () => api.deals(token!),
    { refreshInterval: 0 },
  )
  return { deals: data ?? [], error, isLoading, mutate }
}

export interface Notification {
  id: string
  dealId: string
  dealTitle: string
  description: string
  timestamp: string
  icon: 'verdict' | 'delivered' | 'expiring' | 'created' | 'settled'
}

export function deriveNotifications(deals: Deal[], userId?: string): Notification[] {
  const items: Notification[] = []
  for (const d of deals) {
    for (const e of d.auditTrail) {
      let icon: Notification['icon'] = 'created'
      let description = e.description
      if (e.type === 'VERDICT_ISSUED') {
        icon = 'verdict'
        description = `Your deal "${d.title}" was judged — ${d.verdict}`
      } else if (e.type === 'DELIVERED') {
        icon = 'delivered'
        description = `Seller submitted delivery proof on "${d.title}"`
      } else if (e.type === 'SETTLED') {
        icon = 'settled'
        description = `"${d.title}" settled on Arbitrum`
      } else if (e.type === 'CREATED') {
        icon = 'created'
        description = `Deal "${d.title}" was created`
      }
      items.push({ id: e.id, dealId: d.id, dealTitle: d.title, description, timestamp: e.timestamp, icon })
    }
    // expiring soon
    const msLeft = new Date(d.expiresAt).getTime() - Date.now()
    if (['LOCKED', 'DELIVERED'].includes(d.status) && msLeft > 0 && msLeft < 3 * 86_400_000) {
      const hrs = Math.round(msLeft / 3_600_000)
      items.push({
        id: 'exp_' + d.id,
        dealId: d.id,
        dealTitle: d.title,
        description: `Deal "${d.title}" expires in ${hrs > 24 ? Math.round(hrs / 24) + ' days' : hrs + ' hours'}`,
        timestamp: new Date().toISOString(),
        icon: 'expiring',
      })
    }
  }
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
