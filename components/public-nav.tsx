'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/brand'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/verdicts', label: 'Verdicts' },
  { href: '/stats', label: 'Stats' },
]

/** Lightweight top nav for public pages (verdicts, stats). */
export function PublicNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" aria-label="GAVEL home"><Logo /></Link>
        <nav className="flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm transition-colors',
                pathname.startsWith(l.href) ? 'text-gold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="btn-press rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  )
}
