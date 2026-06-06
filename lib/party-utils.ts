import type { Deal, Party } from './types'

/** True when a deal has more than one buyer or more than one seller. */
export function isMultiParty(deal: Pick<Deal, 'parties'>): boolean {
  if (!deal.parties) return false
  const buyers = deal.parties.filter((p) => p.role === 'buyer').length
  const sellers = deal.parties.filter((p) => p.role === 'seller').length
  return buyers > 1 || sellers > 1
}

export function partyCounts(deal: Pick<Deal, 'parties'>): { buyers: number; sellers: number } {
  const buyers = deal.parties?.filter((p) => p.role === 'buyer').length ?? 1
  const sellers = deal.parties?.filter((p) => p.role === 'seller').length ?? 1
  return { buyers, sellers }
}

/** "1 buyer · 3 sellers" — only meaningful for multi-party deals. */
export function partyConfigLabel(deal: Pick<Deal, 'parties'>): string | null {
  if (!isMultiParty(deal)) return null
  const { buyers, sellers } = partyCounts(deal)
  return `${buyers} buyer${buyers === 1 ? '' : 's'} · ${sellers} seller${sellers === 1 ? '' : 's'}`
}

/** Label a party for display: "Buyer 1", "Seller 2", etc. */
export function partyLabel(party: Party, all: Party[]): string {
  const sameRole = all.filter((p) => p.role === party.role)
  const idx = sameRole.findIndex((p) => p.id === party.id)
  const role = party.role === 'buyer' ? 'Buyer' : 'Seller'
  return sameRole.length > 1 ? `${role} ${idx + 1}` : role
}

/** Color class for a party role badge. */
export function roleBadgeClass(role: 'buyer' | 'seller'): string {
  return role === 'buyer'
    ? 'border-blue/40 bg-blue/10 text-blue'
    : 'border-gold/40 bg-gold/10 text-gold'
}

export function buyersConfirmed(deal: Pick<Deal, 'parties'>): { confirmed: Party[]; pending: Party[] } | null {
  if (!deal.parties) return null
  const buyers = deal.parties.filter((p) => p.role === 'buyer')
  if (buyers.length <= 1) return null
  return {
    confirmed: buyers.filter((b) => b.confirmed),
    pending: buyers.filter((b) => !b.confirmed),
  }
}

/**
 * Deterministic GAVEL score for a counterparty by email/id when an explicit
 * score is not attached to the record. Stable across renders so the UI never
 * flickers. Mirrors the backend's scoring range (55-98).
 */
export function deterministicScore(emailOrId: string): number {
  let h = 0
  for (let i = 0; i < emailOrId.length; i++) h = (h * 31 + emailOrId.charCodeAt(i)) % 1000
  return 55 + (h % 44)
}

export function truncateEmail(email: string, max = 22): string {
  if (email.length <= max) return email
  const [name, domain] = email.split('@')
  if (!domain) return email.slice(0, max) + '…'
  const keep = Math.max(3, max - domain.length - 2)
  return `${name.slice(0, keep)}…@${domain}`
}
