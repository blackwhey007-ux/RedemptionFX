import { ReactNode } from 'react'

// Force dynamic rendering for this route and disable static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DebugNotificationsLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}

