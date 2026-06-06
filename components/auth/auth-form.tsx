'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthPanel } from '@/components/auth/auth-panel'
import { FloatingInput } from '@/components/floating-input'
import { PasswordInput } from '@/components/auth/password-input'
import { Logo } from '@/components/brand'
import { useAuth } from '@/lib/auth-context'
import { evaluatePassword, trimInput } from '@/lib/security'
import { cn } from '@/lib/utils'

const MAX_ATTEMPTS = 3
const LOCKOUT_SECONDS = 30

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const { login, register, expiredReason, clearExpiredReason } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)
  const lockTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLogin = mode === 'login'
  const strength = evaluatePassword(password)
  const registerBlocked = !isLogin && !strength.isStrong
  const locked = lockSeconds > 0

  // Surface the session-expired reason on the login screen, then clear it.
  useEffect(() => {
    if (isLogin && expiredReason) {
      setError(expiredReason)
      clearExpiredReason()
    }
  }, [isLogin, expiredReason, clearExpiredReason])

  useEffect(() => {
    return () => {
      if (lockTimer.current) clearInterval(lockTimer.current)
    }
  }, [])

  function startLockout() {
    setLockSeconds(LOCKOUT_SECONDS)
    lockTimer.current = setInterval(() => {
      setLockSeconds((s) => {
        if (s <= 1) {
          if (lockTimer.current) clearInterval(lockTimer.current)
          setAttempts(0)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || locked) return
    setError('')

    const cleanEmail = trimInput(email)
    if (!cleanEmail) {
      setError('Enter your email.')
      return
    }
    if (registerBlocked) {
      setError('Please choose a stronger password.')
      return
    }

    setSubmitting(true)
    try {
      if (isLogin) await login(cleanEmail, password)
      else await register(cleanEmail, password)
      router.push('/deals')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      if (isLogin) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= MAX_ATTEMPTS) {
          setError('Too many attempts. Please wait 30 seconds.')
          startLockout()
        } else {
          setError(message)
        }
      } else {
        setError(message)
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthPanel />
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="lg:hidden">
            <Logo className="mb-10" />
          </Link>

          <div key={mode} className="page-enter">
            <h1 className="font-display text-4xl font-medium text-foreground">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isLogin ? 'Sign in to access your deals and verdicts.' : 'Start locking funds and settling deals with GAVEL.'}
            </p>

            <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
              <FloatingInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
              <PasswordInput
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                showStrength={!isLogin}
              />

              {error && (
                <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" style={{ animation: 'fadeIn 0.3s ease' }}>
                  {locked ? `Too many attempts. Please wait ${lockSeconds} second${lockSeconds === 1 ? '' : 's'}.` : error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || locked || registerBlocked}
                title={registerBlocked ? 'Please choose a stronger password.' : undefined}
                className={cn(
                  'btn-press mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-gold py-3 font-medium text-primary-foreground transition-opacity',
                  (submitting || locked || registerBlocked) && 'opacity-50',
                )}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {locked ? `Locked (${lockSeconds}s)` : submitting ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Link href={isLogin ? '/register' : '/login'} className="text-gold hover:underline">
                {isLogin ? 'Create one' : 'Sign in'}
              </Link>
            </p>

            {isLogin && (
              <div className="mt-8 rounded-md border border-border bg-surface/50 p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Demo accounts</p>
                <p className="mt-2 text-sm text-foreground/80">
                  <span className="font-mono text-gold">demo@gavel.court</span> · user
                </p>
                <p className="text-sm text-foreground/80">
                  <span className="font-mono text-gold">admin@gavel.court</span> · admin
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Password: <span className="font-mono">password</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
