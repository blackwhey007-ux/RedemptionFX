export interface ICTAnalysis {
  timeframe: string
  context: string
  lowTimeframe: string
  fvg: string
  breaker: string
  sellSide: string
  buySide: string
  sessionKillZone: string
  entry: string
  notes: string
}

export interface Trade {
  id: string
  pair: string
  type: 'BUY' | 'SELL'
  status: 'OPEN' | 'CLOSED' | 'CLOSE' | 'LOSS' | 'BREAKEVEN'
  entryPrice: number
  exitPrice: number
  pips: number
  profit: number
  rr: number
  risk: number
  lotSize: number
  result: number // Pips gained/lost (positive for win, negative for loss, 0 for breakeven)
  date: string
  time: string
  notes: string
  source?: 'TELEGRAM' | 'LIVE' | 'MANUAL' | 'MT5_VIP'
  chartImage?: string
  tradingViewLink?: string
  ictAnalysis?: ICTAnalysis
  profileId: string // Links trade to specific profile
  userId: string // Owner of the trade
  // MT5 specific fields
  mt5TicketId?: string // MT5 ticket for deduplication
  mt5Commission?: number // Commission from MT5
  mt5Swap?: number // Swap/rollover fees
  openTime?: Date // Actual MT5 open time
  closeTime?: Date // Actual MT5 close time
  syncMethod?: 'manual' | 'api' // How this trade was imported
  importedAt?: Date // When this trade was imported
  createdAt?: Date | any // Firestore timestamp (can be Timestamp or Date)
  updatedAt?: Date | any // Firestore timestamp (can be Timestamp or Date)
}
