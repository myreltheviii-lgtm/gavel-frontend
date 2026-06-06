'use client'

import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

/** Bottom-border-only input with a floating label that rises on focus/value. */
export function FloatingInput({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0

  return (
    <div className="relative pt-5">
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-0 transition-all duration-200',
          floated
            ? 'top-0 font-mono text-[11px] uppercase tracking-widest text-gold'
            : 'top-7 text-base text-muted-foreground',
        )}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full border-0 border-b bg-transparent pb-2 text-foreground outline-none transition-colors',
          focused ? 'border-gold' : 'border-border',
        )}
      />
    </div>
  )
}
