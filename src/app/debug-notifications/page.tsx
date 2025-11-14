'use client'

import dynamicImport from 'next/dynamic'

// Disable static generation - this page requires client-side context
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dynamically import with SSR disabled to prevent build-time rendering
const NotificationContent = dynamicImport(
  () => import('./NotificationContent').then(mod => ({ default: mod.NotificationContent })),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto px-4 py-8">
        <div>Loading debug notifications...</div>
      </div>
    )
  }
)

export default function DebugNotificationsPage() {
  return <NotificationContent />
}
