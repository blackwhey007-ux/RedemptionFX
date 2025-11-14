'use client'

import { ReactNode } from 'react'
import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'

interface DebugNotificationsLayoutClientProps {
  children: ReactNode
}

export function DebugNotificationsLayoutClient({ children }: DebugNotificationsLayoutClientProps) {
  // Wrap children with UnifiedNotificationProvider so useUnifiedNotifications works
  return (
    <UnifiedNotificationProvider>
      {children}
    </UnifiedNotificationProvider>
  )
}


