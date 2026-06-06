'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatUSDT, shortId } from '@/lib/utils'
import type { PublicVerdict } from '@/lib/types'

const VERDICT_LABEL: Record<string, string> = {
  RELEASE: 'Released to Seller',
  RETURN: 'Returned to Buyer',
  PARTIAL: 'Partial Split',
}

export function EmbedClient({ dealId, theme }: { dealId?: string; theme: 'dark' | 'light' }) {
  const [verdict, setVerdict] = useState<PublicVerdict | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    if (!dealId) {
      setError(true)
      setLoading(false)
      return
    }
    api
      .publicVerdict(dealId)
      .then((v) => {
        if (active) {
          setVerdict(v)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [dealId])

  // Report height to the parent window so the widget iframe can auto-resize.
  useEffect(() => {
    const report = () =>
      window.parent?.postMessage(
        { type: 'gavel:embed:height', height: document.body.scrollHeight },
        '*',
      )
    report()
    const ro = new ResizeObserver(report)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [verdict, loading, error])

  const isLight = theme === 'light'
  const bg = isLight ? '#f7f5ef' : '#0f0f12'
  const fg = isLight ? '#1a1a1a' : '#f5f3ee'
  const muted = isLight ? '#6b6b6b' : '#9a9a9a'
  const border = isLight ? '#e3e0d6' : '#26262b'

  const accent =
    verdict?.verdict === 'RELEASE' ? '#3ecf8e' : verdict?.verdict === 'RETURN' ? '#e05a5a' : '#e8c44a'

  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 20,
        maxWidth: 380,
        margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: 13, color: '#e8c44a' }}>
          GAVEL
        </span>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: muted }}>
          Verdict
        </span>
      </div>

      {loading ? (
        <p style={{ color: muted, fontSize: 14, margin: 0 }}>Loading verdict…</p>
      ) : error || !verdict ? (
        <p style={{ color: muted, fontSize: 14, margin: 0 }}>Verdict unavailable.</p>
      ) : (
        <>
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', lineHeight: 1.4 }}>
            {verdict.title}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: `${accent}1a`,
              border: `1px solid ${accent}55`,
              color: accent,
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: accent }} />
            {VERDICT_LABEL[verdict.verdict] ?? verdict.verdict}
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>
                Amount
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{formatUSDT(verdict.amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted }}>
                Confidence
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: accent }}>
                {verdict.confidence}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${border}` }}>
            <a
              href={`/verdicts/${verdict.dealId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: muted, textDecoration: 'none' }}
            >
              Deal {shortId(verdict.dealId)} · Verified by GAVEL ↗
            </a>
          </div>
        </>
      )}
    </div>
  )
}
