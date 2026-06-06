import type { Metadata } from 'next'
import { EmbedClient } from './embed-client'

export const metadata: Metadata = {
  title: 'GAVEL Verdict',
  robots: { index: false, follow: false },
}

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string; theme?: string }>
}) {
  const { deal, theme } = await searchParams
  return <EmbedClient dealId={deal} theme={theme === 'light' ? 'light' : 'dark'} />
}
