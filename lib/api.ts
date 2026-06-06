// Single API client for GAVEL.
// Tries the real backend at NEXT_PUBLIC_BACKEND_URL; falls back to the in-memory
// mock store when no backend is reachable so the preview always stays alive.

import type {
  Attachment,
  Deal,
  DealMessage,
  DealTemplate,
  GavelScoreDetail,
  GavelStats,
  HealthStatus,
  Milestone,
  Party,
  PublicVerdict,
  User,
  Verdict,
} from './types'
import { store, SEED_USERS } from './mock-store'

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

let backendReachable: boolean | null = null

// ---- Global 401 handler (security): registered by AuthContext. ----
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn
}

/** Maps raw status codes / errors to safe, user-facing messages. Never leaks server internals. */
export function sanitizeError(status: number | undefined, fallback = 'Something went wrong. Please try again.'): string {
  switch (status) {
    case 401:
      return 'Session expired. Please sign in again.'
    case 403:
      return 'You do not have permission.'
    case 404:
      return 'This resource does not exist.'
    case 429:
      return 'Too many requests. Please slow down.'
    case 500:
    case 502:
    case 503:
      return 'Something went wrong. Please try again.'
    default:
      return fallback
  }
}

async function probeBackend(): Promise<boolean> {
  if (backendReachable !== null) return backendReachable
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1200)
    const res = await fetch(`${BACKEND_URL}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    backendReachable = res.ok
  } catch {
    backendReachable = false
  }
  return backendReachable
}

function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

async function real<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    // Global 401 handling: clear session + redirect.
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || sanitizeError(res.status, `Request failed: ${res.status}`))
  }
  return res.json()
}

// Decode the demo token to recover the user id (mock mode).
function userFromToken(token: string | null): User | null {
  if (!token) return null
  const id = token.replace('gavel.', '')
  const u = SEED_USERS.find((s) => s.id === id)
  return u ? { id: u.id, email: u.email, role: u.role, gavelScore: u.gavelScore } : null
}

export const api = {
  async register(email: string, password: string): Promise<{ token: string; user: User }> {
    if (await probeBackend()) return real('/auth/register', null, { method: 'POST', body: JSON.stringify({ email, password }) })
    const existing = SEED_USERS.find((u) => u.email === email)
    if (existing) throw new Error('An account with that email already exists.')
    const user: User & { password: string } = { id: 'u_' + Math.random().toString(36).slice(2, 9), email, password, role: 'user', gavelScore: 75 }
    SEED_USERS.push(user)
    return delay({ token: 'gavel.' + user.id, user: { id: user.id, email: user.email, role: user.role, gavelScore: user.gavelScore } })
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    if (await probeBackend()) return real('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) })
    const u = SEED_USERS.find((x) => x.email === email)
    if (!u || u.password !== password) throw new Error('Invalid email or password.')
    return delay({ token: 'gavel.' + u.id, user: { id: u.id, email: u.email, role: u.role, gavelScore: u.gavelScore } })
  },

  async me(token: string): Promise<User> {
    if (await probeBackend()) return real('/auth/me', token)
    const u = userFromToken(token)
    if (!u) throw new Error('Not authenticated')
    return delay(u, 100)
  },

  async deals(token: string): Promise<Deal[]> {
    if (await probeBackend()) return real('/api/deals', token)
    const u = userFromToken(token)
    return delay(
      store.getDeals().filter((d) => {
        if (!u) return true
        if (d.buyerId === u.id || d.sellerId === u.id) return true
        // Include multi-party deals where the user is any party.
        return d.parties?.some((p) => p.userId === u.id || p.email === u.email) ?? false
      }),
    )
  },

  async deal(token: string, id: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}`, token)
    const d = store.getDeal(id)
    if (!d) throw new Error('Deal not found')
    return delay(d)
  },

  async createDeal(
    token: string,
    input: {
      title: string
      terms: string
      amount: number
      sellerId: string
      parties?: Party[]
      milestones?: Milestone[]
      witnessEmail?: string
      insured?: boolean
    },
  ): Promise<Deal> {
    if (await probeBackend()) return real('/api/deals', token, { method: 'POST', body: JSON.stringify(input) })
    const u = userFromToken(token)!
    return delay(store.createDeal({ ...input, buyer: u }))
  },

  async deliver(token: string, id: string, proof: string, partyId?: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/deliver`, token, { method: 'POST', body: JSON.stringify({ proof, partyId }) })
    return delay(store.deliver(id, proof, partyId)!)
  },

  async confirmJudgment(token: string, id: string, partyId: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/confirm`, token, { method: 'POST', body: JSON.stringify({ partyId }) })
    return delay(store.confirmJudgment(id, partyId)!)
  },

  async acceptInvite(token: string, id: string, partyId: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/accept`, token, { method: 'POST', body: JSON.stringify({ partyId }) })
    return delay(store.acceptInvite(id, partyId)!)
  },

  async judge(token: string, id: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/judge`, token, { method: 'POST' })
    return delay(store.judge(id)!, 200)
  },

  async appeal(token: string, id: string, evidence: string, by: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/appeal`, token, { method: 'POST', body: JSON.stringify({ evidence, by }) })
    return delay(store.submitAppeal(id, evidence, by)!)
  },

  async settle(token: string, id: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/settle`, token, { method: 'POST' })
    return delay(store.settle(id)!)
  },

  async updateTerms(token: string, id: string, terms: string): Promise<Deal> {
    if (await probeBackend()) return real(`/api/deals/${id}/terms`, token, { method: 'POST', body: JSON.stringify({ terms }) })
    return delay(store.updateTerms(id, terms)!)
  },

  async attachments(token: string, id: string): Promise<Attachment[]> {
    if (await probeBackend()) return real(`/api/deals/${id}/attachments`, token)
    return delay(store.getAttachments(id))
  },

  async uploadAttachment(token: string, id: string, file: File): Promise<Attachment> {
    if (await probeBackend()) {
      const res = await fetch(`${BACKEND_URL}/api/deals/${id}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream', 'X-Filename': file.name },
        body: file,
      })
      if (!res.ok) {
        if (res.status === 401 && onUnauthorized) onUnauthorized()
        throw new Error(sanitizeError(res.status, 'Upload failed'))
      }
      return res.json()
    }
    return delay(store.addAttachment(id, file.name, file.size))
  },

  // ---- deal room messages ----
  async messages(token: string, id: string): Promise<DealMessage[]> {
    if (await probeBackend()) return real(`/api/deals/${id}/messages`, token)
    return delay(store.getMessages(id))
  },

  async sendMessage(token: string, id: string, content: string, sender: { id: string; email: string; role: string }): Promise<DealMessage> {
    if (await probeBackend()) return real(`/api/deals/${id}/messages`, token, { method: 'POST', body: JSON.stringify({ content, sender }) })
    return delay(store.sendMessage(id, content, sender), 120)
  },

  // ---- gavel score ----
  async scoreDetail(token: string, userId?: string): Promise<GavelScoreDetail> {
    if (await probeBackend()) return real(`/api/score${userId ? `?userId=${userId}` : ''}`, token)
    return delay(store.scoreDetail(userId))
  },

  // ---- templates ----
  async templates(): Promise<DealTemplate[]> {
    if (await probeBackend()) return real('/api/templates', null)
    return delay(store.templates())
  },

  async publishTemplate(token: string, t: Omit<DealTemplate, 'id' | 'uses' | 'rating' | 'createdAt'>): Promise<DealTemplate> {
    if (await probeBackend()) return real('/api/templates', token, { method: 'POST', body: JSON.stringify(t) })
    return delay(store.publishTemplate(t))
  },

  async health(): Promise<HealthStatus> {
    if (await probeBackend()) return real('/health', null)
    return delay(store.health(), 80)
  },

  // ---- public ----
  async verdicts(): Promise<PublicVerdict[]> {
    if (await probeBackend()) return real('/api/verdicts', null)
    return delay(store.publicVerdicts())
  },

  async publicVerdict(dealId: string): Promise<PublicVerdict> {
    if (await probeBackend()) return real(`/api/verdicts/${dealId}`, null)
    const v = store.publicVerdict(dealId)
    if (!v) throw new Error('Verdict not found')
    return delay(v)
  },

  async stats(): Promise<GavelStats> {
    if (await probeBackend()) return real('/api/stats', null)
    return delay(store.stats())
  },

  // ---- admin ----
  async adminDeals(token: string, limit = 50, offset = 0): Promise<{ deals: Deal[]; total: number }> {
    if (await probeBackend()) return real(`/admin/deals?limit=${limit}&offset=${offset}`, token)
    const all = store.getDeals()
    return delay({ deals: all.slice(offset, offset + limit), total: all.length })
  },

  async adminDeal(token: string, id: string): Promise<{ deal: Deal; auditTrail: Deal['auditTrail'] }> {
    if (await probeBackend()) return real(`/admin/deals/${id}`, token)
    const d = store.getDeal(id)!
    return delay({ deal: d, auditTrail: d.auditTrail })
  },

  async adminCancel(token: string, id: string): Promise<Deal> {
    if (await probeBackend()) return real(`/admin/deals/${id}/cancel`, token, { method: 'POST' })
    return delay(store.cancel(id)!)
  },

  async adminVerdict(token: string, id: string, verdict: Verdict, percentage: number, reasoning: string): Promise<Deal> {
    if (await probeBackend()) return real(`/admin/deals/${id}/verdict`, token, { method: 'POST', body: JSON.stringify({ verdict, percentage, reasoning }) })
    return delay(store.overrideVerdict(id, verdict, percentage, reasoning)!)
  },
}
