'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, setUnauthorizedHandler } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  /** Reason the session ended, surfaced to /login. */
  expiredReason: string | null
  clearExpiredReason: () => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

// Inactivity policy
const IDLE_LIMIT_MS = 30 * 60 * 1000 // 30 minutes -> expire
const WARN_AT_MS = 25 * 60 * 1000 // 25 minutes -> warn

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Token & user live in React context ONLY — never localStorage.
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading] = useState(false)
  const [expiredReason, setExpiredReason] = useState<string | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearExpiredReason = useCallback(() => setExpiredReason(null), [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setShowWarning(false)
  }, [])

  const expireSession = useCallback(
    (reason: string) => {
      logout()
      setExpiredReason(reason)
    },
    [logout],
  )

  // Register the global 401 handler so any API call can clear the session.
  useEffect(() => {
    setUnauthorizedHandler(() => expireSession('Session expired. Please sign in again.'))
    return () => setUnauthorizedHandler(null)
  }, [expireSession])

  // Inactivity tracking — only while authenticated.
  const resetTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    setShowWarning(false)
    warnTimer.current = setTimeout(() => setShowWarning(true), WARN_AT_MS)
    idleTimer.current = setTimeout(
      () => expireSession('Session expired due to inactivity. Please sign in again.'),
      IDLE_LIMIT_MS,
    )
  }, [expireSession])

  useEffect(() => {
    if (!token) {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
      return
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    const onActivity = () => resetTimers()
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    resetTimers()
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      if (idleTimer.current) clearTimeout(idleTimer.current)
      if (warnTimer.current) clearTimeout(warnTimer.current)
    }
  }, [token, resetTimers])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    setToken(res.token)
    setUser(res.user)
    setExpiredReason(null)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.register(email, password)
    setToken(res.token)
    setUser(res.user)
    setExpiredReason(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, loading, expiredReason, clearExpiredReason, login, register, logout }),
    [user, token, loading, expiredReason, clearExpiredReason, login, register, logout],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showWarning && token && (
        <SessionWarning onStay={() => resetTimers()} onSignOut={() => expireSession('Session expired due to inactivity. Please sign in again.')} />
      )}
    </AuthContext.Provider>
  )
}

function SessionWarning({ onStay, onSignOut }: { onStay: () => void; onSignOut: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in" />
      <div className="glass relative w-full max-w-sm rounded-2xl border border-gold/30 p-6 animate-fade-in">
        <h2 className="font-display text-2xl font-medium text-foreground">Session expiring soon</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your session will expire in 5 minutes due to inactivity. For your security, you&apos;ll be signed out.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onSignOut} className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
            Sign out
          </button>
          <button onClick={onStay} className="btn-press rounded-md bg-gold px-4 py-2 text-sm font-medium text-primary-foreground">
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
