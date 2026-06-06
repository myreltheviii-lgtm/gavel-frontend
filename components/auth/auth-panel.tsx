'use client'

import { useEffect, useState } from 'react'
import { Logo, GavelIcon } from '@/components/brand'

const QUOTES = [
  { text: 'Justice delayed is justice denied.', author: 'William Gladstone' },
  { text: 'The law is reason, free from passion.', author: 'Aristotle' },
  { text: 'Where there is no proof, there can be no verdict.', author: 'GAVEL' },
]

export function AuthPanel() {
  const [q, setQ] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setQ((x) => (x + 1) % QUOTES.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-sidebar p-12 lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 35%, rgba(232,196,74,0.12), transparent 60%)',
        }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <Logo className="mb-16" />
        {/* rotating abstract gavel geometry (CSS 3D) */}
        <div className="[perspective:900px]">
          <div className="animate-rotate3d [transform-style:preserve-3d]">
            <GavelIcon className="h-40 w-40 text-gold drop-shadow-[0_0_30px_rgba(232,196,74,0.35)]" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-12 left-0 right-0 px-12 text-center">
        <blockquote key={q} className="animate-fade-in">
          <p className="font-display text-2xl italic text-foreground/90">
            &ldquo;{QUOTES[q].text}&rdquo;
          </p>
          <footer className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            — {QUOTES[q].author}
          </footer>
        </blockquote>
      </div>
    </div>
  )
}
