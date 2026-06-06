'use client'

import Link from 'next/link'
import { X, Gavel, Package, Clock, FileText, CheckCircle2 } from 'lucide-react'
import { type Notification } from '@/lib/use-deals'
import { timeAgo } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ICONS = {
  verdict: Gavel,
  delivered: Package,
  expiring: Clock,
  created: FileText,
  settled: CheckCircle2,
}

export function NotificationsDrawer({
  open,
  onClose,
  notifications,
  readIds,
}: {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  readIds: Set<string>
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface animate-slide-in-right">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-2xl font-medium text-foreground">Activity</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-muted-foreground">No activity yet.</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => {
                const Icon = ICONS[n.icon]
                const unread = !readIds.has(n.id)
                return (
                  <li key={n.id}>
                    <Link
                      href={`/deals/${n.dealId}`}
                      onClick={onClose}
                      className={cn(
                        'flex gap-3 border-b border-border px-6 py-4 transition-colors hover:bg-accent/50',
                        unread && 'border-l-2 border-l-gold bg-gold/[0.03]',
                      )}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-gold">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm text-foreground/90">{n.description}</span>
                        <span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {timeAgo(n.timestamp)}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
