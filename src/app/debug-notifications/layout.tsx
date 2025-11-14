'use client'

import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'
import { NotificationPreferencesProvider } from '@/contexts/NotificationPreferencesContext'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DebugNotificationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationPreferencesProvider>
      <UnifiedNotificationProvider>
        {children}
      </UnifiedNotificationProvider>
    </NotificationPreferencesProvider>
  )
}

