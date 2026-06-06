import { DealRoomClient } from './deal-room-client'

export default async function DealRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DealRoomClient id={id} />
}
