export interface TradingProfile {
  id: string
  name: string // "Personal Account", "Funded Account", "Demo", etc.
  description?: string
  accountType: 'PERSONAL' | 'FUNDED' | 'PROPS' | 'DEMO' | 'LIVE' | 'OTHER'
  startingBalance: number // Starting balance for this trading account
  userId: string // Owner of the profile
  isPublic: boolean // If true, VIP/Guest can view
  createdAt: string
  updatedAt: string
}

export interface UserRole {
  userId: string
  email: string
  role: 'admin' | 'vip' | 'guest'
  displayName: string
  photoURL?: string
  createdAt: string
  lastLoginAt?: string
}

export type AccountType = 'PERSONAL' | 'FUNDED' | 'PROPS' | 'DEMO' | 'LIVE' | 'OTHER'

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  PERSONAL: 'Personal Account',
  FUNDED: 'Funded Account',
  PROPS: 'Prop Trading',
  DEMO: 'Demo Account',
  LIVE: 'Live Account',
  OTHER: 'Other'
}

export const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  PERSONAL: '👤',
  FUNDED: '💰',
  PROPS: '🏢',
  DEMO: '🎯',
  LIVE: '📈',
  OTHER: '📊'
}
