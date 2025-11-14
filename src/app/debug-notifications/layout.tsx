'use client'

import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'
import { NotificationPreferencesProvider } from '@/contexts/NotificationPreferencesContext'

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

