export interface VipSyncConfig {
  method: 'manual' | 'api'
  lastSyncAt: Date
  totalTrades: number
  apiConfig?: {
    enabled: boolean
    accountId: string
    token: string
    lastSync?: Date
  }
  manualConfig?: {
    lastUpload: Date
    fileName: string
    tradesCount: number
  }
}

export interface VipImportLog {
  id: string
  method: 'manual' | 'api'
  importedAt: Date
  tradesCount: number
  newTrades: number
  updatedTrades: number
  skippedTrades: number
  fileName?: string
  importedBy: string
  status: 'success' | 'partial' | 'failed'
  errors?: string[]
}

export interface VipStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  totalProfit: number
  winRate: number
  averageWin: number
  averageLoss: number
  bestTrade: number
  worstTrade: number
  startingBalance: number
  currentBalance: number
  lastUpdated: Date
  syncMethod: 'manual' | 'api'
}
