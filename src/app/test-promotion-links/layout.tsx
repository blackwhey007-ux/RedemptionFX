import { ReactNode } from 'react'
import { TestPromotionLinksLayoutClient } from './TestPromotionLinksLayoutClient'

// Force dynamic rendering for this route and disable static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function TestPromotionLinksLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <TestPromotionLinksLayoutClient>
      {children}
    </TestPromotionLinksLayoutClient>
  )
}

