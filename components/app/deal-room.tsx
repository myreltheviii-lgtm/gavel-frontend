'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Send, Loader2, Lock } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { api } from '@/lib/api'
import { sanitizeText } from '@/lib/security'
import { subscribeMessages } from '@/lib/mock-store'
import { partyLabel } from '@/lib/party-utils'
import type { Deal, DealMessage } from '@/lib/types'

/** Color a sender role badge by role and index (Buyer 1 blue, Seller 1 gold, Witness purple). */
function roleStyle(role: string): string {
  const r = role.toLowerCase()
  if (r.includes('witness')) return 'border-[#a67be8]/40 bg-[#a67be8]/10 text-[#a67be8]'
  if (r.includes('buyer')) {
    return r.includes('2') || r.includes('3')
      ? 'border-blue/30 bg-blue/5 text-blue/80'
      : 'border-blue/40 bg-blue/10 text-blue'
  }
  // seller
  return r.includes('2') || r.includes('3')
    ? 'border-gold/30 bg-gold/5 text-gold/80'
    : 'border-gold/40 bg-gold/10 text-gold'
}

/** Resolve the current user's display role within this deal. */
function useSelfRole(deal: Deal): { role: string; readOnly: boolean } {
  const { user } = useAuth()
  return useMemo(() => {
    if (!user) return { role: 'Observer', readOnly: true }
    if (deal.witness?.email === user.email) return { role: 'Witness', readOnly: true }
    if (deal.parties?.length) {
      const p = deal.parties.find((x) => x.userId === user.id || x.email === user.email)
      if (p) return { role: partyLabel(p, deal.parties), readOnly: false }
    }
    if (deal.buyerId === user.id) return { role: 'Buyer', readOnly: false }
    if (deal.sellerId === user.id) return { role: 'Seller', readOnly: false }
    return { role: 'Observer', readOnly: true }
  }, [user, deal])
}

export function DealRoom({ deal }: { deal: Deal }) {
  const { token, user } = useAuth()
  const toast = useToast()
  const { role, readOnly } = useSelfRole(deal)
  const [messages, setMessages] = useState<DealMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const closed = deal.status === 'SETTLED' || deal.status === 'CANCELLED'

  // Initial load.
  useEffect(() => {
    let active = true
    if (!token) return
    api
      .messages(token, deal.id)
      .then((m) => {
        if (active) {
          setMessages(m)
          setLoading(false)
        }
      })
      .catch(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [token, deal.id])

  // Live subscription (mock pub/sub mirrors the WebSocket MESSAGE protocol).
  useEffect(() => {
    const unsub = subscribeMessages(deal.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
    })
    return unsub
  }, [deal.id])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function autosize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 112) + 'px'
  }

  async function send() {
    if (!token || !user) return
    const clean = sanitizeText(draft)
    if (!clean) return
    setSending(true)
    try {
      await api.sendMessage(token, deal.id, clean, { id: user.id, email: user.email, role })
      setDraft('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="glass flex h-[600px] flex-col overflow-hidden rounded-2xl border border-border">
      {/* Privacy notice */}
      <div className="flex items-center gap-2 border-b border-border bg-amber-400/5 px-5 py-2.5">
        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300" />
        <p className="text-xs text-amber-300">
          This conversation is private and may be reviewed by GAVEL during judgment.
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Start the conversation with the other parties.</p>
          </div>
        ) : (
          messages.map((m) => {
            const own = m.senderId === user?.id
            return (
              <div key={m.id} className={cn('flex flex-col gap-1', own ? 'items-end' : 'items-start')}>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
                      roleStyle(m.senderRole),
                    )}
                  >
                    {m.senderRole}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{formatDate(m.timestamp)}</span>
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    own
                      ? 'rounded-tr-sm bg-gold/15 text-foreground'
                      : 'rounded-tl-sm border border-border bg-surface/60 text-foreground/90',
                  )}
                >
                  {m.content}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      {closed ? (
        <div className="border-t border-border bg-surface/40 px-5 py-4 text-center text-sm text-muted-foreground">
          This deal has been settled. The deal room is now closed.
        </div>
      ) : readOnly ? (
        <div className="border-t border-border bg-surface/40 px-5 py-4 text-center text-sm text-muted-foreground">
          You have read-only access to this deal room.
        </div>
      ) : (
        <div className="flex items-end gap-2 border-t border-border px-4 py-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              autosize()
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Message the other parties… (Enter to send, Shift+Enter for new line)"
            className="max-h-28 flex-1 resize-none rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="btn-press inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold text-primary-foreground disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  )
}
