'use client'

import { useEffect, useRef, useState } from 'react'
import { Gavel, Upload, Loader2, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { api } from '@/lib/api'
import { validateFile } from '@/lib/security'
import { sanitizeText } from '@/lib/security'
import type { Deal } from '@/lib/types'

/**
 * Appeal panel — visible only on JUDGED deals.
 * Shows a live 24h countdown. While open, any party can submit additional
 * evidence + files to trigger a final re-judgment. Once submitted, the panel
 * shows a pending state. After the window closes it is read-only.
 */
export function AppealPanel({ deal, onUpdate }: { deal: Deal; onUpdate: (d: Deal) => void }) {
  const { token, user } = useAuth()
  const toast = useToast()
  const appeal = deal.appeal
  const [remaining, setRemaining] = useState(() => msLeft(appeal?.closesAt))
  const [evidence, setEvidence] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!appeal) return
    const t = setInterval(() => setRemaining(msLeft(appeal.closesAt)), 1000)
    return () => clearInterval(t)
  }, [appeal])

  if (!appeal) return null

  const open = remaining > 0 && !appeal.submitted
  const closed = remaining <= 0 && !appeal.submitted

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const accepted: File[] = []
    for (const f of Array.from(list)) {
      const err = validateFile(f)
      if (err) {
        toast.error(err)
        continue
      }
      accepted.push(f)
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted])
  }

  async function submit() {
    if (!token) return
    const clean = sanitizeText(evidence)
    if (!clean) {
      toast.error('Add the additional evidence supporting your appeal.')
      return
    }
    setBusy(true)
    try {
      const updated = await api.appeal(token, deal.id, clean, user?.email ?? 'A party')
      onUpdate(updated)
      toast.success('Appeal submitted. GAVEL is reviewing the new evidence.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit appeal.')
      setBusy(false)
    }
  }

  // ---- Submitted state ----
  if (appeal.submitted) {
    return (
      <section className="glass animate-pulse-dot rounded-2xl border border-gold/40 p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-gold" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-gold">Appeal Under Review</h2>
        </div>
        <p className="mt-3 text-foreground/90">
          Appeal submitted — GAVEL is reviewing additional evidence. Final verdict pending.
        </p>
        {appeal.evidence && (
          <p className="mt-3 rounded-lg border border-border bg-surface/40 p-3 text-sm leading-relaxed text-muted-foreground">
            {appeal.evidence}
          </p>
        )}
      </section>
    )
  }

  return (
    <section className={cn('glass rounded-2xl border p-6', open ? 'border-amber-400/40' : 'border-border')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-amber-300" />
          <h2 className="font-mono text-xs uppercase tracking-widest text-amber-300">Appeal Window</h2>
        </div>
        {closed ? (
          <span className="font-mono text-sm text-muted-foreground">Appeal window closed</span>
        ) : (
          <span className="font-mono text-sm tabular-nums text-amber-300">
            Appeal window closes in {formatRemaining(remaining)}
          </span>
        )}
      </div>

      {closed ? (
        <p className="mt-3 text-sm text-muted-foreground">
          The 24-hour appeal window has elapsed. This verdict is now final.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Disagree with the verdict? Submit additional evidence within the window and GAVEL will re-read the full
            record before issuing a final verdict.
          </p>

          <textarea
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            rows={4}
            placeholder="Explain what GAVEL may have missed and reference your supporting files…"
            className="mt-4 w-full rounded-lg border border-border bg-surface/60 p-3 text-sm text-foreground outline-none focus:border-amber-400"
          />

          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles(e.dataTransfer.files)
            }}
            className={cn(
              'mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 text-center transition-colors',
              dragging ? 'border-amber-400 bg-amber-400/5' : 'border-border hover:border-amber-400/40',
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Drag &amp; drop supporting files, or click to browse</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Max 10MB each</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-border bg-surface/40 px-3 py-1.5 text-sm"
                >
                  <span className="truncate text-foreground/90">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-press mt-4 inline-flex items-center gap-2 rounded-md bg-amber-400 px-5 py-2.5 text-sm font-medium text-[#0a0a0f] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />} Submit Appeal
          </button>
        </>
      )}
    </section>
  )
}

function msLeft(closesAt?: string): number {
  if (!closesAt) return 0
  return Math.max(0, new Date(closesAt).getTime() - Date.now())
}

function formatRemaining(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}
