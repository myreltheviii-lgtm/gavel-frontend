import { VerdictCertificateClient } from './verdict-certificate-client'

export default async function VerdictCertificatePage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params
  return <VerdictCertificateClient dealId={dealId} />
}
