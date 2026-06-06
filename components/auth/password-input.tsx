'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { evaluatePassword } from '@/lib/security'
import { cn } from '@/lib/utils'

/**
 * Password field with an accessible show/hide toggle and an optional live
 * strength meter (register flow). Never shows plain text by default.
 */
export function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
  required,
  showStrength = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  required?: boolean
  showStrength?: boolean
}) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const floated = focused || value.length > 0
  const strength = evaluatePassword(value)

  const BAR_COLORS = ['bg-danger', 'bg-danger', 'bg-amber-400', 'bg-amber-400', 'bg-success']
  const LABEL_COLORS: Record<string, string> = {
    'Too short': 'text-danger',
    Weak: 'text-danger',
    Fair: 'text-amber-400',
    Good: 'text-amber-400',
    Strong: 'text-success',
  }

  return (
    <div>
      <div className="relative pt-5">
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-0 transition-all duration-200',
            floated ? 'top-0 font-mono text-[11px] uppercase tracking-widest text-gold' : 'top-7 text-base text-muted-foreground',
          )}
        >
          {label}
        </label>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full border-0 border-b bg-transparent pb-2 pr-9 text-foreground outline-none transition-colors',
            focused ? 'border-gold' : 'border-border',
          )}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute bottom-2 right-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="mt-3">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  i < strength.score ? BAR_COLORS[strength.score - 1] : 'bg-border',
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={cn('font-mono text-[11px] uppercase tracking-widest', LABEL_COLORS[strength.label])}>
              {strength.label}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {strength.checks.length ? '8+' : '8+ chars'} · A-Z · a-z · 0-9 · symbol
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
