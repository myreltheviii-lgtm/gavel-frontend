// Client-side security helpers: input sanitization, password strength, file validation.

/** Strip HTML/script tags and trim. Plain-text only — never rendered as HTML. */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // strip any tag
    .replace(/&lt;|&gt;/g, '') // strip encoded angle brackets
    .trim()
}

/** Trim whitespace only (for single-line fields like titles, emails). */
export function trimInput(input: string): string {
  return input.trim()
}

export interface PasswordStrength {
  score: number // 0-5
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  checks: { length: boolean; upper: boolean; lower: boolean; number: boolean; special: boolean }
  isStrong: boolean
}

export function evaluatePassword(pw: string): PasswordStrength {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
  const score = Object.values(checks).filter(Boolean).length
  let label: PasswordStrength['label'] = 'Too short'
  if (pw.length === 0) label = 'Too short'
  else if (!checks.length) label = 'Too short'
  else if (score <= 2) label = 'Weak'
  else if (score === 3) label = 'Fair'
  else if (score === 4) label = 'Good'
  else label = 'Strong'
  const isStrong = score === 5
  return { score, label, checks, isStrong }
}

const BLOCKED_EXTENSIONS = ['exe', 'sh', 'bat', 'ps1', 'cmd', 'msi', 'app', 'scr', 'com']
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

/** Validates a file client-side before upload. Returns an error string or null if OK. */
export function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return `Files of type .${ext} are not allowed.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `"${file.name}" exceeds the 10MB limit.`
  }
  return null
}
