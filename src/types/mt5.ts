export interface MT5SyncLog {
  id: string
  syncedAt: Date
  tradesImported: number
  tradesUpdated: number
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

export interface MT5AccountInfo {
  id: string
  login: string
  server: string
  platform: string
  status: 'connected' | 'disconnected' | 'error'
  balance: number
  equity: number
  margin: number
  freeMargin: number
  marginLevel: number
  lastSyncAt?: Date
}

export interface MT5Deal {
  id: string
  ticket: string
  order: string
  time: string
  timeMsc: string
  type: 'BUY' | 'SELL'
  entry: 'IN' | 'OUT'
  magic: number
  positionId: string
  reason: string
  volume: number
  price: number
  profit: number
  commission: number
  swap: number
  symbol: string
  comment: string
}

export interface MT5Position {
  id: string
  ticket: string
  time: string
  timeMsc: string
  timeUpdate: string
  timeUpdateMsc: string
  type: 'BUY' | 'SELL'
  magic: number
  identifier: string
  reason: string
  volume: number
  priceOpen: number
  priceCurrent: number
  swap: number
  profit: number
  symbol: string
  comment: string
  externalId: string
}


