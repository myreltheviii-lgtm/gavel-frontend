'use client'

import { useEffect, useRef, useState } from 'react'
import type { Deal } from './types'
import { BACKEND_URL } from './api'
import { subscribeDeal, store } from './mock-store'

type WsStatus = 'connecting' | 'connected' | 'disconnected'

/**
 * useWebSocket — subscribes to live deal updates.
 * Attempts a real WebSocket (http -> ws) against the backend; if that fails,
 * falls back to the in-memory mock pub/sub so the preview stays live.
 *
 * On connect: send { type: 'SUBSCRIBE', dealId }
 * Server replies { type: 'DEAL_UPDATE', deal } immediately and on each change.
 * Client pings { type: 'PING' } every 25s. Closes on unmount.
 */
export function useWebSocket(dealId: string | null, onUpdate: (deal: Deal) => void) {
  const [status, setStatus] = useState<WsStatus>('connecting')
  const cbRef = useRef(onUpdate)
  cbRef.current = onUpdate

  useEffect(() => {
    if (!dealId) return
    let socket: WebSocket | null = null
    let pingTimer: ReturnType<typeof setInterval> | null = null
    let unsubMock: (() => void) | null = null
    let cancelled = false

    const startMock = () => {
      if (cancelled) return
      setStatus('connected')
      const existing = store.getDeal(dealId)
      if (existing) cbRef.current(existing) // immediate snapshot
      unsubMock = subscribeDeal(dealId, (d) => cbRef.current(d))
    }

    try {
      const wsUrl = BACKEND_URL.replace(/^http/, 'ws')
      socket = new WebSocket(wsUrl)
      const failTimer = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
          socket.close()
          startMock()
        }
      }, 1500)

      socket.onopen = () => {
        clearTimeout(failTimer)
        if (cancelled) return
        setStatus('connected')
        socket!.send(JSON.stringify({ type: 'SUBSCRIBE', dealId }))
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'PING' }))
        }, 25000)
      }
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'DEAL_UPDATE' && msg.deal) cbRef.current(msg.deal)
        } catch {}
      }
      socket.onerror = () => {
        clearTimeout(failTimer)
        if (socket?.readyState !== WebSocket.OPEN) startMock()
      }
      socket.onclose = () => setStatus((s) => (s === 'connected' ? s : 'disconnected'))
    } catch {
      startMock()
    }

    return () => {
      cancelled = true
      if (pingTimer) clearInterval(pingTimer)
      unsubMock?.()
      socket?.close()
    }
  }, [dealId])

  return { status }
}
