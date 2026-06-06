// In-memory mock backend for GAVEL.
// Used as a fallback when no real VITE/NEXT_PUBLIC backend is reachable.
// All data lives in module scope so it persists across navigations in the SPA.

import type {
  Attachment,
  AuditEvent,
  Deal,
  DealMessage,
  DealStatus,
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

const DAY = 24 * 60 * 60 * 1000

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

function iso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString()
}

// ---- Seed users (with GAVEL scores) ----
export const SEED_USERS: (User & { password: string })[] = [
  { id: 'u_demo', email: 'demo@gavel.court', password: 'password', role: 'user', gavelScore: 92 },
  { id: 'u_admin', email: 'admin@gavel.court', password: 'password', role: 'admin', gavelScore: 99 },
  { id: 'u_maya', email: 'maya@studio.co', password: 'password', role: 'user', gavelScore: 94 },
  { id: 'u_arjun', email: 'arjun@devhouse.io', password: 'password', role: 'user', gavelScore: 81 },
  { id: 'u_lena', email: 'lena@writes.com', password: 'password', role: 'user', gavelScore: 88 },
  { id: 'u_theo', email: 'theo@motion.tv', password: 'password', role: 'user', gavelScore: 67 },
]

export function scoreFor(emailOrId: string): number {
  const u = SEED_USERS.find((s) => s.id === emailOrId || s.email === emailOrId)
  if (u?.gavelScore != null) return u.gavelScore
  // Deterministic pseudo-score for unknown emails so the UI is stable.
  let h = 0
  for (let i = 0; i < emailOrId.length; i++) h = (h * 31 + emailOrId.charCodeAt(i)) % 1000
  return 55 + (h % 44)
}

const REASONINGS: Record<Verdict, string> = {
  RELEASE:
    'The seller delivered a complete logo suite matching all specifications in the deal terms. Primary logo, wordmark, icon variant, and color palette were all provided in SVG, PNG, and PDF formats. All required deliverables were present and matched the agreed scope. Verdict: full release of escrowed funds to the seller.',
  RETURN:
    'The submitted delivery did not meet the core requirements set out in the deal terms. Required file formats were missing and the deliverable did not match the agreed specification. No evidence of completed work matching the brief was provided. Verdict: full refund issued to the buyer.',
  PARTIAL:
    'The seller delivered the primary deliverable and the majority of required assets, but several specified items were incomplete and one revision round was not honored. Weighing completed work against the original terms, a proportional split is warranted. Verdict: partial release.',
}

function buildAudit(deal: Partial<Deal>, status: DealStatus): AuditEvent[] {
  const base = new Date(deal.createdAt ?? iso(-3 * DAY)).getTime()
  const events: AuditEvent[] = [
    {
      id: uid('ev_'),
      type: 'CREATED',
      description: 'Deal created and USDT locked in escrow.',
      timestamp: new Date(base).toISOString(),
    },
  ]
  const reached = (s: DealStatus) =>
    ['DELIVERED', 'JUDGING', 'JUDGED', 'SETTLED'].indexOf(status) >=
    ['DELIVERED', 'JUDGING', 'JUDGED', 'SETTLED'].indexOf(s)

  if (reached('DELIVERED'))
    events.push({
      id: uid('ev_'),
      type: 'DELIVERED',
      description: 'Seller submitted delivery proof.',
      timestamp: new Date(base + 1 * DAY).toISOString(),
    })
  if (reached('JUDGING'))
    events.push({
      id: uid('ev_'),
      type: 'JUDGMENT_REQUESTED',
      description: 'Buyer requested AI judgment.',
      timestamp: new Date(base + 1 * DAY + 3600_000).toISOString(),
    })
  if (reached('JUDGED'))
    events.push({
      id: uid('ev_'),
      type: 'VERDICT_ISSUED',
      description: `GAVEL issued a verdict: ${deal.verdict}.`,
      timestamp: new Date(base + 1 * DAY + 3640_000).toISOString(),
    })
  if (status === 'SETTLED')
    events.push({
      id: uid('ev_'),
      type: 'SETTLED',
      description: 'Funds settled on Arbitrum.',
      timestamp: new Date(base + 1 * DAY + 3700_000).toISOString(),
    })
  if (status === 'CANCELLED')
    events.push({
      id: uid('ev_'),
      type: 'CANCELLED',
      description: 'Deal cancelled by administrator.',
      timestamp: new Date(base + 2 * DAY).toISOString(),
    })
  return events
}

function makeDeal(input: {
  title: string
  terms: string
  amount: number
  status: DealStatus
  buyer: User & { password: string }
  seller: User & { password: string }
  createdOffset: number
  verdict?: Verdict
  confidence?: number
  parties?: Party[]
  milestones?: Milestone[]
  witnessEmail?: string
  insured?: boolean
}): Deal {
  const createdAt = iso(input.createdOffset)
  const verdict = input.verdict
  let sellerPayout: number | undefined
  let buyerRefund: number | undefined
  if (verdict === 'RELEASE') {
    sellerPayout = input.amount
    buyerRefund = 0
  } else if (verdict === 'RETURN') {
    sellerPayout = 0
    buyerRefund = input.amount
  } else if (verdict === 'PARTIAL') {
    sellerPayout = Math.round(input.amount * 0.6)
    buyerRefund = input.amount - sellerPayout
  }
  const settled = input.status === 'SETTLED'
  const deal: Deal = {
    id: uid('deal_'),
    title: input.title,
    terms: input.terms,
    amount: input.amount,
    status: input.status,
    buyerId: input.buyer.id,
    buyerEmail: input.buyer.email,
    sellerId: input.seller.id,
    sellerEmail: input.seller.email,
    createdAt,
    expiresAt: iso(input.createdOffset + 30 * DAY),
    deliveryProof:
      ['DELIVERED', 'JUDGING', 'JUDGED', 'SETTLED'].includes(input.status)
        ? 'Delivered the complete package as agreed. Files attached: assets.zip, preview.pdf. Repository link included with deployment notes.'
        : undefined,
    verdict,
    confidence: input.confidence,
    reasoning: verdict ? REASONINGS[verdict] : undefined,
    sellerPayout,
    buyerRefund,
    judgmentMs: verdict ? 30000 + Math.floor(Math.random() * 14000) : undefined,
    judgedAt: verdict ? iso(input.createdOffset + DAY) : undefined,
    settledAt: settled ? iso(input.createdOffset + DAY + 3700_000) : undefined,
    escrowTxHash: settled
      ? '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      : undefined,
    auditTrail: [],
    parties: input.parties,
    milestones: input.milestones,
    insured: input.insured,
    insuranceFee: input.insured ? Math.round(input.amount * 0.01 * 100) / 100 : undefined,
    witness: input.witnessEmail
      ? { email: input.witnessEmail, notified: { LOCKED: true, DELIVERED: ['DELIVERED', 'JUDGING', 'JUDGED', 'SETTLED'].includes(input.status), JUDGED: ['JUDGED', 'SETTLED'].includes(input.status), SETTLED: settled } }
      : undefined,
    // JUDGED deals expose a live 24h appeal window; SETTLED deals' windows have closed.
    appeal:
      input.status === 'JUDGED'
        ? { openedAt: iso(-4 * 3600_000), closesAt: iso(20 * 3600_000), submitted: false, resolved: false }
        : undefined,
  }
  deal.auditTrail = buildAudit(deal, input.status)
  return deal
}

const TEMPLATE_TERMS = {
  logo: 'Seller will design a complete logo suite including primary logo, wordmark, icon variant, and color palette. All files delivered in SVG, PNG (transparent background), and PDF. Revisions: up to 2 rounds. Delivery within the agreed timeframe.',
  web: 'Seller will build and deliver a fully functional web application matching the specifications discussed. Code delivered via GitHub repository. Includes deployment instructions. All features listed in the project brief must be implemented and working.',
  content:
    'Seller will write and deliver original content matching the word count, topic, and tone specified. Content must pass a plagiarism check. One revision round included. Delivered as a Google Doc or plain text file.',
}

export const TEMPLATES = [
  { id: 'logo', name: 'Logo Design', terms: TEMPLATE_TERMS.logo },
  { id: 'web', name: 'Web Development', terms: TEMPLATE_TERMS.web },
  { id: 'content', name: 'Content Writing', terms: TEMPLATE_TERMS.content },
]

const [demo, admin, maya, arjun, lena, theo] = SEED_USERS

// ---- helper: build a party set ----
function parties(spec: { email: string; role: 'buyer' | 'seller'; allocation: number; userId?: string }[]): Party[] {
  return spec.map((s) => ({
    id: uid('p_'),
    userId: s.userId,
    email: s.email,
    role: s.role,
    allocation: s.allocation,
    accepted: true,
    confirmed: s.role === 'buyer' ? true : undefined,
    delivered: s.role === 'seller' ? false : undefined,
    gavelScore: scoreFor(s.userId ?? s.email),
  }))
}

let DEALS: Deal[] = [
  makeDeal({ title: 'Brand Logo Suite', terms: TEMPLATE_TERMS.logo, amount: 1200, status: 'SETTLED', buyer: demo, seller: maya, createdOffset: -12 * DAY, verdict: 'RELEASE', confidence: 94 }),
  makeDeal({ title: 'Marketing Site Rebuild', terms: TEMPLATE_TERMS.web, amount: 4800, status: 'JUDGED', buyer: demo, seller: arjun, createdOffset: -4 * DAY, verdict: 'PARTIAL', confidence: 78, insured: true }),
  makeDeal({ title: 'Whitepaper Copywriting', terms: TEMPLATE_TERMS.content, amount: 650, status: 'DELIVERED', buyer: demo, seller: lena, createdOffset: -2 * DAY }),
  makeDeal({ title: 'Mobile App UI Kit', terms: TEMPLATE_TERMS.logo, amount: 2200, status: 'LOCKED', buyer: maya, seller: demo, createdOffset: -1 * DAY, witnessEmail: 'witness@trust.co' }),
  makeDeal({ title: 'Landing Page Build', terms: TEMPLATE_TERMS.web, amount: 1500, status: 'JUDGING', buyer: arjun, seller: demo, createdOffset: -1 * DAY }),
  makeDeal({ title: 'Product Launch Blog', terms: TEMPLATE_TERMS.content, amount: 420, status: 'SETTLED', buyer: lena, seller: demo, createdOffset: -20 * DAY, verdict: 'RETURN', confidence: 88 }),
  makeDeal({ title: 'Icon Pack — 40 glyphs', terms: TEMPLATE_TERMS.logo, amount: 900, status: 'SETTLED', buyer: maya, seller: arjun, createdOffset: -25 * DAY, verdict: 'RELEASE', confidence: 91 }),
  makeDeal({ title: 'E-commerce Checkout Flow', terms: TEMPLATE_TERMS.web, amount: 5200, status: 'SETTLED', buyer: arjun, seller: maya, createdOffset: -30 * DAY, verdict: 'PARTIAL', confidence: 72 }),
  makeDeal({ title: 'SEO Article Series', terms: TEMPLATE_TERMS.content, amount: 1100, status: 'JUDGED', buyer: lena, seller: maya, createdOffset: -6 * DAY, verdict: 'RELEASE', confidence: 96 }),
  makeDeal({ title: 'Dashboard Redesign', terms: TEMPLATE_TERMS.web, amount: 3400, status: 'SETTLED', buyer: demo, seller: arjun, createdOffset: -45 * DAY, verdict: 'RELEASE', confidence: 89 }),
]

// ---- Multi-party seed deals ----
// 1 buyer, 3 sellers (multi-seller)
const multiSeller = makeDeal({
  title: 'Full Product Launch Bundle',
  terms: 'Three specialists collaborate on a coordinated product launch. Seller 1 delivers the brand identity and logo suite. Seller 2 delivers the marketing website. Seller 3 delivers the launch video. Each deliverable judged against its own brief.',
  amount: 9000,
  status: 'LOCKED',
  buyer: demo,
  seller: maya,
  createdOffset: -1 * DAY,
  parties: parties([
    { email: demo.email, role: 'buyer', allocation: 100, userId: demo.id },
    { email: maya.email, role: 'seller', allocation: 40, userId: maya.id },
    { email: arjun.email, role: 'seller', allocation: 35, userId: arjun.id },
    { email: theo.email, role: 'seller', allocation: 25, userId: theo.id },
  ]),
})
// 2 buyers pooling, 1 seller (multi-buyer)
const multiBuyer = makeDeal({
  title: 'Shared Office Rebrand',
  terms: 'Two co-founders pool funds to commission a complete rebrand for their shared studio. Includes logo, brand guidelines, and stationery. Both buyers must confirm before judgment is requested.',
  amount: 3000,
  status: 'LOCKED',
  buyer: arjun,
  seller: maya,
  createdOffset: -2 * DAY,
  parties: parties([
    { email: arjun.email, role: 'buyer', allocation: 60, userId: arjun.id },
    { email: lena.email, role: 'buyer', allocation: 40, userId: lena.id },
    { email: maya.email, role: 'seller', allocation: 100, userId: maya.id },
  ]),
})
// mark one buyer as not yet confirmed
if (multiBuyer.parties) {
  const second = multiBuyer.parties.find((p) => p.role === 'buyer' && p.userId === lena.id)
  if (second) second.confirmed = false
}

// Multi-milestone deal
const milestoneDeal = makeDeal({
  title: 'SaaS MVP — Phased Build',
  terms: 'A phased build of a SaaS MVP delivered across five milestones, each with its own acceptance criteria and deadline. Funds release per milestone as each is judged.',
  amount: 10000,
  status: 'LOCKED',
  buyer: demo,
  seller: arjun,
  createdOffset: -3 * DAY,
  milestones: [
    { id: uid('m_'), title: 'Design system & wireframes', description: 'Figma file with full design system and all screen wireframes.', amount: 2000, deadline: iso(7 * DAY), status: 'SETTLED' },
    { id: uid('m_'), title: 'Authentication & accounts', description: 'Email auth, sessions, account settings.', amount: 2000, deadline: iso(14 * DAY), status: 'SETTLED' },
    { id: uid('m_'), title: 'Core dashboard', description: 'Primary dashboard with live data.', amount: 2500, deadline: iso(21 * DAY), status: 'DELIVERED' },
    { id: uid('m_'), title: 'Billing integration', description: 'Stripe billing and plan management.', amount: 2000, deadline: iso(28 * DAY), status: 'LOCKED' },
    { id: uid('m_'), title: 'Polish & launch', description: 'QA, polish, production deploy.', amount: 1500, deadline: iso(35 * DAY), status: 'LOCKED' },
  ],
})

DEALS = [multiSeller, multiBuyer, milestoneDeal, ...DEALS]

const ATTACHMENTS: Attachment[] = [
  { id: uid('att_'), dealId: DEALS[4].id, filename: 'final-build.zip', size: 8_421_000, uploadedAt: iso(-3 * DAY) },
  { id: uid('att_'), dealId: DEALS[4].id, filename: 'deployment-notes.pdf', size: 240_400, uploadedAt: iso(-3 * DAY) },
]

// ---- Deal room messages ----
const MESSAGES: DealMessage[] = [
  { id: uid('msg_'), dealId: multiSeller.id, content: 'Kicking off — I will start on the brand identity today.', senderId: maya.id, senderEmail: maya.email, senderRole: 'Seller 1', timestamp: iso(-20 * 3600_000) },
  { id: uid('msg_'), dealId: multiSeller.id, content: 'Great. I will scaffold the site once the colors are locked.', senderId: arjun.id, senderEmail: arjun.email, senderRole: 'Seller 2', timestamp: iso(-18 * 3600_000) },
  { id: uid('msg_'), dealId: multiSeller.id, content: 'Looking forward to all of it. Ping me with any questions on the brief.', senderId: demo.id, senderEmail: demo.email, senderRole: 'Buyer 1', timestamp: iso(-12 * 3600_000) },
]

// ---- Community templates ----
const TEMPLATE_MARKETPLACE: DealTemplate[] = [
  { id: uid('tpl_'), name: 'Logo & Brand Identity', category: 'Design', terms: TEMPLATE_TERMS.logo, uses: 248, rating: 4.8, authorEmail: maya.email, authorScore: 94, createdAt: iso(-60 * DAY) },
  { id: uid('tpl_'), name: 'Full-Stack Web App', category: 'Development', terms: TEMPLATE_TERMS.web, uses: 187, rating: 4.7, authorEmail: arjun.email, authorScore: 81, createdAt: iso(-45 * DAY) },
  { id: uid('tpl_'), name: 'Long-Form Article', category: 'Writing', terms: TEMPLATE_TERMS.content, uses: 96, rating: 4.5, authorEmail: lena.email, authorScore: 88, createdAt: iso(-30 * DAY) },
  { id: uid('tpl_'), name: 'Explainer Video Production', category: 'Video', terms: 'Seller produces a 60-90 second explainer video including script, storyboard, animation, and licensed music. Delivered in 1080p and 4K. Two revision rounds included.', uses: 142, rating: 4.9, authorEmail: theo.email, authorScore: 67, createdAt: iso(-25 * DAY) },
  { id: uid('tpl_'), name: 'Launch Marketing Campaign', category: 'Marketing', terms: 'Seller plans and delivers a multi-channel launch campaign: 10 social posts, 3 email sequences, and an ad creative set. Includes a content calendar and performance tracking plan.', uses: 73, rating: 4.4, authorEmail: lena.email, authorScore: 88, createdAt: iso(-15 * DAY) },
  { id: uid('tpl_'), name: 'Multi-Seller Product Bundle', category: 'Other', terms: 'A coordinated bundle delivered by multiple specialists. Each seller owns a distinct deliverable judged against its own brief, with allocations split by scope.', uses: 119, rating: 4.6, authorEmail: maya.email, authorScore: 94, createdAt: iso(-10 * DAY), partyConfig: { buyers: 1, sellers: 3 } },
  { id: uid('tpl_'), name: 'Two-Founder Shared Commission', category: 'Design', terms: 'Two buyers pool funds to commission a single deliverable. Both buyers confirm before judgment. Costs split by allocation.', uses: 41, rating: 4.3, authorEmail: arjun.email, authorScore: 81, createdAt: iso(-8 * DAY), partyConfig: { buyers: 2, sellers: 1 } },
]

// ---- pub/sub for simulated websocket ----
type Listener = (deal: Deal) => void
const listeners = new Map<string, Set<Listener>>()

export function subscribeDeal(dealId: string, fn: Listener) {
  if (!listeners.has(dealId)) listeners.set(dealId, new Set())
  listeners.get(dealId)!.add(fn)
  return () => listeners.get(dealId)?.delete(fn)
}

function emit(deal: Deal) {
  listeners.get(deal.id)?.forEach((fn) => fn(deal))
  listeners.get('*')?.forEach((fn) => fn(deal))
}

export function subscribeAll(fn: Listener) {
  return subscribeDeal('*', fn)
}

// ---- message pub/sub ----
type MsgListener = (msg: DealMessage) => void
const msgListeners = new Map<string, Set<MsgListener>>()
export function subscribeMessages(dealId: string, fn: MsgListener) {
  if (!msgListeners.has(dealId)) msgListeners.set(dealId, new Set())
  msgListeners.get(dealId)!.add(fn)
  return () => msgListeners.get(dealId)?.delete(fn)
}
function emitMsg(msg: DealMessage) {
  msgListeners.get(msg.dealId)?.forEach((fn) => fn(msg))
}

// ---- helpers for multi-party math ----
function isMultiParty(d: Deal): boolean {
  if (!d.parties) return false
  const buyers = d.parties.filter((p) => p.role === 'buyer').length
  const sellers = d.parties.filter((p) => p.role === 'seller').length
  return buyers > 1 || sellers > 1
}

// ---- store accessors ----
export const store = {
  users: SEED_USERS,
  getDeals: () => DEALS.slice(),
  getDeal: (id: string) => DEALS.find((d) => d.id === id),
  getAttachments: (dealId: string) => ATTACHMENTS.filter((a) => a.dealId === dealId),
  isMultiParty,

  health(): HealthStatus {
    return { status: 'ok', time: new Date().toISOString(), escrow: 'Arbitrum One · USDT' }
  },

  // Anonymized public verdicts for the explorer & shareable pages.
  publicVerdicts(): PublicVerdict[] {
    return DEALS.filter((d) => d.verdict && (d.status === 'JUDGED' || d.status === 'SETTLED'))
      .map((d) => ({
        dealId: d.id,
        title: d.title,
        verdict: d.verdict!,
        amount: d.amount,
        confidence: d.confidence ?? 0,
        reasoning: d.reasoning ?? '',
        sellerPayout: d.sellerPayout ?? 0,
        buyerRefund: d.buyerRefund ?? 0,
        judgedAt: d.judgedAt ?? d.createdAt,
      }))
      .sort((a, b) => new Date(b.judgedAt).getTime() - new Date(a.judgedAt).getTime())
  },

  publicVerdict(dealId: string): PublicVerdict | undefined {
    return this.publicVerdicts().find((v) => v.dealId === dealId)
  },

  stats(): GavelStats {
    const judged = DEALS.filter((d) => d.verdict)
    const settled = DEALS.filter((d) => d.status === 'SETTLED')
    const usdtSettled = settled.reduce((s, d) => s + (d.sellerPayout ?? 0) + (d.buyerRefund ?? 0), 0)
    const avgConfidence = judged.length
      ? Math.round(judged.reduce((s, d) => s + (d.confidence ?? 0), 0) / judged.length)
      : 0
    const avgJudgmentMs = judged.length
      ? Math.round(judged.reduce((s, d) => s + (d.judgmentMs ?? 0), 0) / judged.length)
      : 0
    const verdicts: Verdict[] = ['RELEASE', 'RETURN', 'PARTIAL']
    const distribution = verdicts.map((v) => ({ verdict: v, count: judged.filter((d) => d.verdict === v).length }))
    const buckets = [
      { range: '70-79', lo: 70, hi: 80 },
      { range: '80-89', lo: 80, hi: 90 },
      { range: '90-100', lo: 90, hi: 101 },
    ]
    const confidenceBuckets = buckets.map((b) => ({
      range: b.range,
      count: judged.filter((d) => (d.confidence ?? 0) >= b.lo && (d.confidence ?? 0) < b.hi).length,
    }))
    const now = new Date()
    const monthlyVolume = Array.from({ length: 6 }, (_, i) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = dt.toLocaleString('en-US', { month: 'short' })
      const count = DEALS.filter((d) => {
        const c = new Date(d.createdAt)
        return c.getMonth() === dt.getMonth() && c.getFullYear() === dt.getFullYear()
      }).length
      return { month: label, count: count + 6 + ((i * 3) % 5) }
    })
    return {
      dealsJudged: 4821,
      usdtSettled: 2847300,
      avgConfidence: avgConfidence || 84,
      avgJudgmentMs: avgJudgmentMs || 38000,
      distribution,
      confidenceBuckets,
      monthlyVolume,
    }
  },

  // ---- GAVEL Score ----
  scoreDetail(userId?: string): GavelScoreDetail {
    const score = userId ? scoreFor(userId) : 84
    // Build a believable 8-point history converging on the score.
    const history = Array.from({ length: 8 }, (_, i) => {
      const drift = Math.round((Math.sin(i * 1.3 + score) * 6))
      const v = Math.max(0, Math.min(100, score - (7 - i) * 1.5 + drift))
      return { date: iso(-(7 - i) * 14 * DAY), score: Math.round(v) }
    })
    history[history.length - 1].score = score
    return {
      score,
      history,
      asBuyer: { clarity: Math.min(100, score + 3), fairness: Math.max(0, score - 4), paymentHistory: Math.min(100, score + 6) },
      asSeller: { deliveryRate: Math.min(100, score + 2), onTimeRate: Math.max(0, score - 7), favorableRate: Math.max(0, score - 2) },
    }
  },

  scoreFor,

  // ---- templates ----
  templates: () => TEMPLATE_MARKETPLACE.slice(),
  publishTemplate(t: Omit<DealTemplate, 'id' | 'uses' | 'rating' | 'createdAt'>): DealTemplate {
    const tpl: DealTemplate = { ...t, id: uid('tpl_'), uses: 0, rating: 0, createdAt: iso() }
    TEMPLATE_MARKETPLACE.unshift(tpl)
    return tpl
  },
  useTemplate(id: string) {
    const t = TEMPLATE_MARKETPLACE.find((x) => x.id === id)
    if (t) t.uses += 1
  },

  // ---- messages ----
  getMessages: (dealId: string) => MESSAGES.filter((m) => m.dealId === dealId),
  sendMessage(dealId: string, content: string, sender: { id: string; email: string; role: string }): DealMessage {
    const msg: DealMessage = {
      id: uid('msg_'),
      dealId,
      content,
      senderId: sender.id,
      senderEmail: sender.email,
      senderRole: sender.role,
      timestamp: iso(),
    }
    MESSAGES.push(msg)
    const deal = this.getDeal(dealId)
    if (deal) {
      deal.auditTrail.push({ id: uid('ev_'), type: 'MESSAGE', description: `${sender.role} sent a message in the deal room.`, timestamp: iso(), partyEmail: sender.email })
    }
    emitMsg(msg)
    return msg
  },

  createDeal(input: {
    title: string
    terms: string
    amount: number
    sellerId: string
    buyer: User
    parties?: Party[]
    milestones?: Milestone[]
    witnessEmail?: string
    insured?: boolean
  }): Deal {
    const seller = SEED_USERS.find((u) => u.id === input.sellerId || u.email === input.sellerId) ?? {
      id: input.sellerId || uid('u_'),
      email: input.sellerId.includes('@') ? input.sellerId : `${input.sellerId}@external.user`,
      password: '',
      role: 'user' as const,
    }
    const deal = makeDeal({
      title: input.title,
      terms: input.terms,
      amount: input.amount,
      status: 'LOCKED',
      buyer: { ...input.buyer, password: '' },
      seller: seller as User & { password: string },
      createdOffset: 0,
      parties: input.parties,
      milestones: input.milestones,
      witnessEmail: input.witnessEmail,
      insured: input.insured,
    })
    // Log party invitations in the audit trail.
    if (input.parties) {
      for (const p of input.parties) {
        if (!p.accepted) {
          deal.auditTrail.push({ id: uid('ev_'), type: 'PARTY_INVITED', description: `Invitation sent to ${p.email} (${p.role}).`, timestamp: iso(), role: p.role, partyEmail: p.email })
        }
      }
    }
    DEALS = [deal, ...DEALS]
    return deal
  },

  deliver(id: string, proof: string, partyId?: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal) return
    if (partyId && deal.parties) {
      const party = deal.parties.find((p) => p.id === partyId)
      if (party) {
        party.deliveryProof = proof
        party.delivered = true
        deal.auditTrail.push({ id: uid('ev_'), type: 'PARTY_DELIVERED', description: `${party.email} submitted delivery proof.`, timestamp: iso(), role: 'seller', partyEmail: party.email })
      }
      const sellers = deal.parties.filter((p) => p.role === 'seller')
      if (sellers.every((s) => s.delivered)) {
        deal.status = 'DELIVERED'
        deal.deliveryProof = sellers.map((s) => `${s.email}: ${s.deliveryProof}`).join('\n\n')
        deal.auditTrail.push({ id: uid('ev_'), type: 'DELIVERED', description: 'All sellers submitted delivery proof.', timestamp: iso() })
      }
      emit(deal)
      return deal
    }
    deal.status = 'DELIVERED'
    deal.deliveryProof = proof
    deal.auditTrail.push({ id: uid('ev_'), type: 'DELIVERED', description: 'Seller submitted delivery proof.', timestamp: iso() })
    emit(deal)
    return deal
  },

  confirmJudgment(id: string, partyId: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal?.parties) return deal
    const party = deal.parties.find((p) => p.id === partyId)
    if (party && party.role === 'buyer') {
      party.confirmed = true
      deal.auditTrail.push({ id: uid('ev_'), type: 'PARTY_CONFIRMED', description: `${party.email} confirmed the judgment request.`, timestamp: iso(), role: 'buyer', partyEmail: party.email })
    }
    emit(deal)
    return deal
  },

  acceptInvite(id: string, partyId: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal?.parties) return deal
    const party = deal.parties.find((p) => p.id === partyId)
    if (party) {
      party.accepted = true
      deal.auditTrail.push({ id: uid('ev_'), type: 'PARTY_ACCEPTED', description: `${party.email} accepted the invitation.`, timestamp: iso(), role: party.role, partyEmail: party.email })
    }
    emit(deal)
    return deal
  },

  // Begins judging, then resolves to a verdict after a delay (simulated AI).
  judge(id: string, onVerdict?: (d: Deal) => void): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal) return
    deal.status = 'JUDGING'
    deal.auditTrail.push({ id: uid('ev_'), type: 'JUDGMENT_REQUESTED', description: 'Buyer requested AI judgment.', timestamp: iso() })
    emit(deal)
    const start = Date.now()
    setTimeout(() => {
      const roll = Math.random()
      const verdict: Verdict = roll > 0.6 ? 'RELEASE' : roll > 0.3 ? 'PARTIAL' : 'RETURN'
      deal.verdict = verdict
      deal.confidence = 70 + Math.floor(Math.random() * 28)
      deal.reasoning = REASONINGS[verdict]
      if (verdict === 'RELEASE') { deal.sellerPayout = deal.amount; deal.buyerRefund = 0 }
      else if (verdict === 'RETURN') { deal.sellerPayout = 0; deal.buyerRefund = deal.amount }
      else { deal.sellerPayout = Math.round(deal.amount * 0.6); deal.buyerRefund = deal.amount - deal.sellerPayout }

      // Per-seller breakdown for multi-seller deals.
      const sellers = deal.parties?.filter((p) => p.role === 'seller') ?? []
      if (sellers.length > 1) {
        for (const s of sellers) {
          const sAmount = Math.round((deal.amount * s.allocation) / 100)
          const sRoll = Math.random()
          const sv: Verdict = sRoll > 0.55 ? 'RELEASE' : sRoll > 0.25 ? 'PARTIAL' : 'RETURN'
          s.verdict = sv
          if (sv === 'RELEASE') { s.payoutPct = 100; s.payout = sAmount; s.refund = 0 }
          else if (sv === 'RETURN') { s.payoutPct = 0; s.payout = 0; s.refund = sAmount }
          else { const pct = 50 + Math.floor(Math.random() * 40); s.payoutPct = pct; s.payout = Math.round((sAmount * pct) / 100); s.refund = sAmount - s.payout }
        }
        deal.sellerPayout = sellers.reduce((sum, s) => sum + (s.payout ?? 0), 0)
        deal.buyerRefund = deal.amount - deal.sellerPayout
      }

      deal.judgmentMs = Date.now() - start
      deal.judgedAt = iso()
      deal.status = 'JUDGED'
      // Open the 24h appeal window automatically.
      deal.appeal = { openedAt: iso(), closesAt: iso(DAY), submitted: false, resolved: false }
      deal.auditTrail.push({ id: uid('ev_'), type: 'VERDICT_ISSUED', description: `GAVEL issued a verdict: ${verdict}.`, timestamp: iso() })
      if (deal.witness) deal.witness.notified.JUDGED = true
      emit(deal)
      onVerdict?.(deal)
    }, 4500)
    return deal
  },

  submitAppeal(id: string, evidence: string, by: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal?.appeal || deal.appeal.submitted) return deal
    deal.appeal.submitted = true
    deal.appeal.submittedBy = by
    deal.appeal.evidence = evidence
    deal.auditTrail.push({ id: uid('ev_'), type: 'APPEAL_SUBMITTED', description: `${by} submitted an appeal with additional evidence.`, timestamp: iso(), partyEmail: by })
    emit(deal)
    // Re-judge after a short delay, then mark resolved (final).
    setTimeout(() => {
      deal.appeal!.resolved = true
      deal.confidence = Math.min(99, (deal.confidence ?? 80) + 4)
      deal.auditTrail.push({ id: uid('ev_'), type: 'VERDICT_ISSUED', description: 'GAVEL re-read all evidence and issued a final verdict.', timestamp: iso() })
      emit(deal)
    }, 4000)
    return deal
  },

  settle(id: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal) return
    deal.status = 'SETTLED'
    deal.settledAt = iso()
    deal.escrowTxHash = '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
    if (deal.parties) deal.parties.forEach((p) => (p.settled = true))
    if (deal.witness) deal.witness.notified.SETTLED = true
    deal.auditTrail.push({ id: uid('ev_'), type: 'SETTLED', description: 'Funds settled on Arbitrum.', timestamp: iso() })
    emit(deal)
    return deal
  },

  cancel(id: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal) return
    deal.status = 'CANCELLED'
    deal.auditTrail.push({ id: uid('ev_'), type: 'CANCELLED', description: 'Deal cancelled by administrator.', timestamp: iso() })
    emit(deal)
    return deal
  },

  overrideVerdict(id: string, verdict: Verdict, percentage: number, reasoning: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal) return
    deal.verdict = verdict
    deal.reasoning = reasoning
    deal.confidence = 100
    if (verdict === 'RELEASE') { deal.sellerPayout = deal.amount; deal.buyerRefund = 0 }
    else if (verdict === 'RETURN') { deal.sellerPayout = 0; deal.buyerRefund = deal.amount }
    else { deal.sellerPayout = Math.round((deal.amount * percentage) / 100); deal.buyerRefund = deal.amount - deal.sellerPayout }
    deal.status = 'JUDGED'
    deal.judgedAt = iso()
    deal.auditTrail.push({ id: uid('ev_'), type: 'VERDICT_ISSUED', description: `Administrator overrode verdict: ${verdict}.`, timestamp: iso() })
    emit(deal)
    return deal
  },

  // Update terms while LOCKED (Deal Health "Improve Terms").
  updateTerms(id: string, terms: string): Deal | undefined {
    const deal = this.getDeal(id)
    if (!deal || deal.status !== 'LOCKED') return deal
    deal.terms = terms
    emit(deal)
    return deal
  },

  addAttachment(dealId: string, filename: string, size: number): Attachment {
    const att: Attachment = { id: uid('att_'), dealId, filename, size, uploadedAt: iso() }
    ATTACHMENTS.push(att)
    return att
  },
}
