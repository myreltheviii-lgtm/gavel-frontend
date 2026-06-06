// Core domain types for GAVEL

export type DealStatus =
  | 'LOCKED'
  | 'DELIVERED'
  | 'JUDGING'
  | 'JUDGED'
  | 'SETTLED'
  | 'EXPIRED'
  | 'CANCELLED'

export type Verdict = 'RELEASE' | 'RETURN' | 'PARTIAL'

export type PartyRole = 'buyer' | 'seller'

export interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  gavelScore?: number
}

export interface Attachment {
  id: string
  dealId: string
  filename: string
  size: number
  uploadedAt: string
}

export interface AuditEvent {
  id: string
  type:
    | 'CREATED'
    | 'DELIVERED'
    | 'JUDGMENT_REQUESTED'
    | 'VERDICT_ISSUED'
    | 'SETTLED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'PARTY_CONFIRMED'
    | 'PARTY_DELIVERED'
    | 'PARTY_INVITED'
    | 'PARTY_ACCEPTED'
    | 'APPEAL_SUBMITTED'
    | 'MESSAGE'
  description: string
  timestamp: string
  /** Optional party context */
  role?: PartyRole
  partyEmail?: string
}

/** A single participant on one side of a deal. */
export interface Party {
  id: string
  userId?: string
  email: string
  role: PartyRole
  /** Percentage allocation of their side, 0-100. Buyers sum to 100, sellers sum to 100. */
  allocation: number
  /** Whether this party has accepted the invitation. The creator is auto-accepted. */
  accepted: boolean
  /** Buyer: confirmed the judgment request. */
  confirmed?: boolean
  /** Seller: submitted their own delivery proof. */
  deliveryProof?: string
  delivered?: boolean
  /** Per-seller verdict breakdown after judgment. */
  verdict?: Verdict
  /** Seller payout percentage of their own allocation (PARTIAL). */
  payoutPct?: number
  /** Resolved dollar amounts post-verdict. */
  payout?: number
  refund?: number
  settled?: boolean
  gavelScore?: number
}

export interface Milestone {
  id: string
  title: string
  description: string
  amount: number
  deadline: string
  status: DealStatus
  /** Party id of the seller who owns this milestone (multi-party). */
  sellerPartyId?: string
}

export interface Witness {
  email: string
  /** Notification status keyed by lifecycle stage. */
  notified: Record<string, boolean>
}

export interface Appeal {
  /** When the 24h appeal window opened. */
  openedAt: string
  /** When it closes. */
  closesAt: string
  submitted: boolean
  submittedBy?: string
  evidence?: string
  resolved: boolean
}

export interface DealMessage {
  id: string
  dealId: string
  content: string
  senderId: string
  senderEmail: string
  senderRole: string
  timestamp: string
}

export interface Deal {
  id: string
  title: string
  terms: string
  amount: number // USD / USDT
  status: DealStatus
  buyerId: string
  buyerEmail: string
  sellerId: string
  sellerEmail: string
  createdAt: string
  expiresAt: string
  deliveryProof?: string
  verdict?: Verdict
  confidence?: number // 0-100
  reasoning?: string
  sellerPayout?: number
  buyerRefund?: number
  judgmentMs?: number
  escrowTxHash?: string
  judgedAt?: string
  settledAt?: string
  auditTrail: AuditEvent[]

  // ---- multi-party + extended features ----
  /** All participants. When present and length > 2 (or any side has >1), the deal is multi-party. */
  parties?: Party[]
  milestones?: Milestone[]
  witness?: Witness
  insured?: boolean
  insuranceFee?: number
  appeal?: Appeal
}

export interface HealthStatus {
  status: 'ok' | 'down'
  time: string
  escrow: string
}

export interface PublicVerdict {
  dealId: string
  title: string
  verdict: Verdict
  amount: number
  confidence: number
  reasoning: string
  sellerPayout: number
  buyerRefund: number
  judgedAt: string
}

export interface GavelStats {
  dealsJudged: number
  usdtSettled: number
  avgConfidence: number
  avgJudgmentMs: number
  distribution: { verdict: Verdict; count: number }[]
  confidenceBuckets: { range: string; count: number }[]
  monthlyVolume: { month: string; count: number }[]
}

export interface DealTemplate {
  id: string
  name: string
  category: 'Design' | 'Development' | 'Writing' | 'Video' | 'Marketing' | 'Other'
  terms: string
  uses: number
  rating: number
  authorEmail: string
  authorScore: number
  createdAt: string
  /** Optional recommended multi-party configuration. */
  partyConfig?: { buyers: number; sellers: number }
}

export interface ScorePoint {
  date: string
  score: number
}

export interface GavelScoreDetail {
  score: number
  history: ScorePoint[]
  asBuyer: { clarity: number; fairness: number; paymentHistory: number }
  asSeller: { deliveryRate: number; onTimeRate: number; favorableRate: number }
}
