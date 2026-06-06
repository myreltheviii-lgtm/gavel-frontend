'use client'

const ITEMS = [
  'Deal #4821 — JUDGED — $1,200 RELEASED to seller',
  'Deal #4822 — PARTIAL — $340 to seller · $160 refunded',
  'Deal #4823 — RETURN — Full refund issued',
  'Deal #4824 — JUDGED — $4,800 RELEASED to seller',
  'Deal #4825 — SETTLED on Arbitrum — $900 USDT',
  'Deal #4826 — PARTIAL — $720 to seller · $480 refunded',
  'Deal #4827 — JUDGED — $2,200 RELEASED to seller',
  'Deal #4828 — RETURN — Full refund issued',
]

export function HeroTicker() {
  const row = [...ITEMS, ...ITEMS]
  return (
    <div className="relative w-full overflow-hidden border-y border-border bg-surface/60 py-3">
      <div className="flex w-max animate-ticker gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10 font-mono text-xs text-muted-foreground">
            <span>
              <span className="text-gold">{item.split('—')[0]}</span>
              {'—' + item.split('—').slice(1).join('—')}
            </span>
            <span className="text-border">·</span>
          </span>
        ))}
      </div>
    </div>
  )
}
