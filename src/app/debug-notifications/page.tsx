'use client'

import { NotificationContent } from './NotificationContent'

// Disable static generation - this page requires client-side context
export const dynamic = 'force-dynamic'

export default function DebugNotificationsPage() {
  // Use a client component that safely uses hooks within the provider context
  return <NotificationContent />
}
