export const TRADING_PAIRS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USDCHF',
  'AUDUSD',
  'USDCAD',
  'NZDUSD',
  'XAUUSD',
  'XAGUSD',
  'BTCUSD',
  'ETHUSD',
  'EURJPY',
  'GBPJPY',
  'AUDJPY',
  'EURGBP',
  'GBPCHF',
  'AUDCAD',
  'NZDJPY',
  'EURCHF',
  'AUDNZD',
] as const

export const SIGNAL_TYPES = [
  { value: 'BUY', label: 'Buy', emoji: '📈' },
  { value: 'SELL', label: 'Sell', emoji: '📉' },
] as const

export const TIMEFRAMES = [
  { value: 'SCALP', label: 'Scalp', description: 'Quick trades, minutes to hours' },
  { value: 'DAY_TRADE', label: 'Day Trade', description: 'Intraday trades, hours to 1 day' },
  { value: 'SWING', label: 'Swing', description: 'Multi-day trades, 1-7 days' },
] as const

export const SIGNAL_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-500' },
  { value: 'CLOSED', label: 'Closed', color: 'bg-gray-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
] as const

export const SUBSCRIPTION_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'EXPIRED', label: 'Expired', color: 'bg-gray-500' },
  { value: 'TRIAL', label: 'Trial', color: 'bg-blue-500' },
] as const

export const BRAND_COLORS = {
  primary: '#ef4444', // Red
  accent: '#ffd700',  // Gold
  background: '#000000', // Black
  surface: '#111111', // Dark gray
  muted: '#666666', // Light gray
} as const
