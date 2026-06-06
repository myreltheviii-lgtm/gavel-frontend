'use client'

import { useEffect, useState } from 'react'
import { Onboarding } from '@/components/app/onboarding'
import { useDeals } from '@/lib/use-deals'
import { useAuth } from '@/lib/auth-context'

/**
 * Shows the onboarding modal on first login when the user has zero deals.
 * Dismissal is remembered for the session so it is never shown again.
 */
export function OnboardingGate() {
  const { user } = useAuth()
  const { deals, isLoading } = useDeals()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!user) return
    const key = `gavel_onboarded_${user.id}`
    const seen = typeof window !== 'undefined' && sessionStorage.getItem(key) === '1'
    setDismissed(seen)
  }, [user])

  function dismiss() {
    if (user) sessionStorage.setItem(`gavel_onboarded_${user.id}`, '1')
    setDismissed(true)
  }

  if (dismissed || isLoading || deals.length > 0) return null
  return <Onboarding onDismiss={dismiss} />
}
