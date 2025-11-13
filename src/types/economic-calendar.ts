export interface EconomicEvent {
  id: string
  date: Date
  time: string
  country: string
  currency: string
  event: string
  impact: 'low' | 'medium' | 'high'
  forecast: string
  previous: string
  actual?: string
  description?: string
  timezone: string
}

export interface EconomicCalendarFilters {
  dateRange: 'today' | 'week' | 'month' | 'custom'
  customStartDate?: Date
  customEndDate?: Date
  countries: string[]
  impactLevels: ('low' | 'medium' | 'high')[]
  eventTypes: string[]
}

export interface EconomicCalendarPreferences {
  userId: string
  enabledNotifications: boolean
  notificationTime: number // minutes before event
  highImpactOnly: boolean
  selectedCountries: string[]
  selectedEventTypes: string[]
  lastUpdated: Date
}

export interface EconomicCalendarData {
  events: EconomicEvent[]
  lastUpdated: Date
  source: 'api' | 'cache' | 'static'
}

export const COUNTRY_FLAGS: Record<string, string> = {
  'USD': '🇺🇸',
  'EUR': '🇪🇺',
  'GBP': '🇬🇧',
  'JPY': '🇯🇵',
  'CHF': '🇨🇭',
  'CAD': '🇨🇦',
  'AUD': '🇦🇺',
  'NZD': '🇳🇿',
  'CNY': '🇨🇳',
  'SEK': '🇸🇪',
  'NOK': '🇳🇴',
  'DKK': '🇩🇰',
  'PLN': '🇵🇱',
  'CZK': '🇨🇿',
  'HUF': '🇭🇺',
  'RUB': '🇷🇺',
  'BRL': '🇧🇷',
  'MXN': '🇲🇽',
  'ZAR': '🇿🇦',
  'TRY': '🇹🇷',
  'INR': '🇮🇳',
  'KRW': '🇰🇷',
  'SGD': '🇸🇬',
  'HKD': '🇭🇰',
  'TWD': '🇹🇼',
  'THB': '🇹🇭',
  'MYR': '🇲🇾',
  'IDR': '🇮🇩',
  'PHP': '🇵🇭',
  'VND': '🇻🇳'
}

export const EVENT_TYPES = [
  'GDP',
  'Employment',
  'Interest Rates',
  'Inflation',
  'Trade Balance',
  'Consumer Confidence',
  'Manufacturing',
  'Retail Sales',
  'Housing',
  'Central Bank',
  'Government',
  'Other'
] as const

export const IMPACT_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
} as const

export const IMPACT_ICONS = {
  low: '🟢',
  medium: '🟡',
  high: '🔴'
} as const








