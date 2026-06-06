'use client'

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { api } from '@/lib/api'
import { PublicNav } from '@/components/public-nav'
import { CountUp } from '@/components/count-up'
import { Reveal } from '@/components/reveal'
import { VerdictBadge } from '@/components/status-badge'
import { formatUSDT, timeAgo } from '@/lib/utils'
import type { GavelStats, PublicVerdict } from '@/lib/types'

const VERDICT_COLORS: Record<string, string> = {
  RELEASE: '#4ae8a0',
  RETURN: '#e84a4a',
  PARTIAL: '#e8c44a',
}

export function StatsClient() {
  const [stats, setStats] = useState<GavelStats | null>(null)
  const [feed, setFeed] = useState<PublicVerdict[]>([])

  useEffect(() => {
    api.stats().then(setStats).catch(() => {})
    api.verdicts().then(setFeed).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold">Transparency</p>
        <h1 className="mt-3 font-display text-5xl font-medium text-foreground md:text-6xl">GAVEL by the numbers</h1>

        {/* Headline counters */}
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Deals judged', value: stats?.dealsJudged ?? 4821, fmt: (n: number) => Math.round(n).toLocaleString() },
            { label: 'USDT settled', value: stats?.usdtSettled ?? 2847300, fmt: (n: number) => '$' + Math.round(n).toLocaleString() },
            { label: 'Avg confidence', value: stats?.avgConfidence ?? 84, fmt: (n: number) => Math.round(n) + '%' },
            { label: 'Avg judgment time', value: (stats?.avgJudgmentMs ?? 38000) / 1000, fmt: (n: number) => n.toFixed(0) + 's' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl border border-border p-6">
              <div className="font-mono text-3xl font-semibold text-gold md:text-4xl">
                <CountUp value={s.value} format={s.fmt} />
              </div>
              <div className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Verdict distribution donut */}
          <Reveal className="glass rounded-2xl border border-border p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Verdict distribution</h2>
            <div className="mt-4 h-64">
              {stats && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.distribution}
                      dataKey="count"
                      nameKey="verdict"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      animationDuration={1200}
                    >
                      {stats.distribution.map((d) => (
                        <Cell key={d.verdict} fill={VERDICT_COLORS[d.verdict]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#14141c', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 flex justify-center gap-5">
              {stats?.distribution.map((d) => (
                <div key={d.verdict} className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: VERDICT_COLORS[d.verdict] }} />
                  {d.verdict} · {d.count}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Confidence distribution bar */}
          <Reveal delay={100} className="glass rounded-2xl border border-border p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Confidence distribution</h2>
            <div className="mt-4 h-64">
              {stats && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.confidenceBuckets}>
                    <XAxis dataKey="range" tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      cursor={{ fill: 'rgba(232,196,74,0.06)' }}
                      contentStyle={{ background: '#14141c', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#4a7fe8" radius={[4, 4, 0, 0]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>

          {/* Monthly volume bar */}
          <Reveal className="glass rounded-2xl border border-border p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Monthly deal volume</h2>
            <div className="mt-4 h-64">
              {stats && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyVolume}>
                    <XAxis dataKey="month" tick={{ fill: '#6b6b80', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={{ stroke: '#1e1e2e' }} tickLine={false} />
                    <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip
                      cursor={{ fill: 'rgba(232,196,74,0.06)' }}
                      contentStyle={{ background: '#14141c', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    />
                    <Bar dataKey="count" fill="#e8c44a" radius={[4, 4, 0, 0]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Reveal>

          {/* Recent activity feed */}
          <Reveal delay={100} className="glass rounded-2xl border border-border p-6">
            <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Recent activity</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2">
              {feed.map((v) => (
                <li key={v.dealId} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={v.verdict} />
                    <span className="truncate text-sm text-foreground/80">{v.title}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm text-gold">{formatUSDT(v.amount)}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{timeAgo(v.judgedAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </main>
    </div>
  )
}
