'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VipTrade {
  id: string
  pair: string
  type: 'BUY' | 'SELL'
  status: string
  entryPrice: number
  exitPrice: number
  pips: number
  profit: number
  result: number
  date: string
  time: string
  mt5TicketId: string
  mt5Commission?: number
  mt5Swap?: number
  openTime?: string
  closeTime?: string
}

interface VipTradesTableProps {
  trades: VipTrade[]
}

export function VipTradesTable({ trades }: VipTradesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOSED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'LOSS': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'BREAKEVEN': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600 dark:text-green-400'
    if (profit < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getTypeColor = (type: 'BUY' | 'SELL') => {
    return type === 'BUY' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest trades from MT5 account
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trades available
            </div>
          ) : (
            trades.slice(0, 20).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(trade.status)}>
                      {trade.status}
                    </Badge>
                    <Badge className={getTypeColor(trade.type)}>
                      {trade.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      MT5 LIVE
                    </Badge>
                  </div>
                  <div>
                    <div className="font-medium">{trade.pair}</div>
                    <div className="text-sm text-muted-foreground">
                      Entry: {trade.entryPrice} | Exit: {trade.exitPrice}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ticket: {trade.mt5TicketId} | {trade.date} {trade.time}
                    </div>
                    {(trade.mt5Commission || trade.mt5Swap) && (
                      <div className="text-xs text-muted-foreground">
                        Commission: {formatCurrency(trade.mt5Commission || 0)} | 
                        Swap: {formatCurrency(trade.mt5Swap || 0)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${getProfitColor(trade.profit)}`}>
                    {formatCurrency(trade.profit)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {trade.pips} pips
                  </div>
                  {trade.closeTime && (
                    <div className="text-xs text-muted-foreground">
                      Closed: {new Date(trade.closeTime).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}


