import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatUSDT(n: number): string {
  return (
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) + ' USDT'
  )
}

export function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Returns a live countdown string toward a target ISO date. */
export function countdown(targetStr: string): string {
  const diff = new Date(targetStr).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const day = Math.floor(diff / 86_400_000)
  const hr = Math.floor((diff % 86_400_000) / 3_600_000)
  const min = Math.floor((diff % 3_600_000) / 60_000)
  const sec = Math.floor((diff % 60_000) / 1000)
  if (day > 0) return `${day}d ${hr}h ${min}m ${sec}s`
  if (hr > 0) return `${hr}h ${min}m ${sec}s`
  return `${min}m ${sec}s`
}
