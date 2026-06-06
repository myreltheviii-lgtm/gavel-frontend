'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Home, FileText, PlusCircle, Scale, User, Bell, LogOut, ShieldCheck } from 'lucide-react'
import { Logo, GavelIcon } from '@/components/brand'
import { HealthDot } from '@/components/app/health-dot'
import { NotificationsDrawer } from '@/components/app/notifications-drawer'
import { useAuth } from '@/lib/auth-context'
import { useDeals, deriveNotifications } from '@/lib/use-deals'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/deals', label: 'Deals', icon: FileText },
  { href: '/deals/new', label: 'Create', icon: PlusCircle },
  { href: '/verdicts', label: 'Verdicts', icon: Scale },
  { href: '/stats', label: 'Stats', icon: Home },
  { href: '/profile', label: 'Profile', icon: User },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { deals } = useDeals()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Protected route: redirect to /login if no token.
  useEffect(() => {
    if (!token) router.replace('/login')
  }, [token, router])

  const notifications = deriveNotifications(deals, user?.id)
  const unread = notifications.filter((n) => !readIds.has(n.id)).length

  function openDrawer() {
    setDrawerOpen(true)
    setReadIds(new Set(notifications.map((n) => n.id)))
  }

  if (!token) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-6 py-6">
          <Link href="/deals" aria-label="GAVEL home">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== '/deals' && pathname.startsWith(item.href))
            const exactDeals = item.href === '/deals' && pathname === '/deals'
            const isActive = item.href === '/deals' ? exactDeals : active
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-accent text-gold' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            )
          })}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className={cn(
                'mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                pathname.startsWith('/admin') ? 'bg-accent text-gold' : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <ShieldCheck className="h-[18px] w-[18px]" />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-border px-3 py-4">
          <button
            onClick={openDrawer}
            className="relative mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <Bell className="h-[18px] w-[18px]" />
            Activity
            {unread > 0 && (
              <span className="absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-medium text-white">
                {unread}
              </span>
            )}
          </button>
          <div className="truncate px-3 py-1 font-mono text-[11px] text-muted-foreground">{user?.email}</div>
          <button
            onClick={() => { logout(); router.push('/') }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-danger"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
        <div className="px-6 pb-5">
          <HealthDot />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/deals"><Logo /></Link>
        <button onClick={openDrawer} className="relative rounded-md p-2 text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />}
        </button>
      </header>

      {/* Main content */}
      <main className="md:pl-[240px]">
        <div className="mx-auto max-w-[1200px] px-5 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">
          <div className="page-enter">{children}</div>
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-sidebar md:hidden">
        {[
          { href: '/stats', label: 'Home', icon: Home },
          { href: '/deals', label: 'Deals', icon: FileText },
          { href: '/deals/new', label: 'Create', icon: GavelIcon },
          { href: '/verdicts', label: 'Verdicts', icon: Scale },
          { href: '/profile', label: 'Profile', icon: User },
        ].map((item) => {
          const active = item.href === '/deals' ? pathname === '/deals' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('flex flex-col items-center gap-1 py-2.5 text-[10px]', active ? 'text-gold' : 'text-muted-foreground')}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <NotificationsDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} notifications={notifications} readIds={readIds} />
    </div>
  )
}
