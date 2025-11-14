'use client'

import { ReactNode } from 'react'
import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'

interface TestPromotionLinksLayoutClientProps {
  children: ReactNode
}

export function TestPromotionLinksLayoutClient({ children }: TestPromotionLinksLayoutClientProps) {
  return (
    <UnifiedNotificationProvider>
      {children}
    </UnifiedNotificationProvider>
  )
}

