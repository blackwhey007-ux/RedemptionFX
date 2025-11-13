'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getTradeHistory,
  getTradeHistoryStats,
  getTradeHistorySymbols,
  MT5TradeHistory,
  TradeHistoryStats
} from '@/lib/mt5TradeHistoryService'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Filter,
  DollarSign,
  Target,
  Percent,
  Clock,
  History,
  CheckCircle,
  XCircle
} from 'lucide-react'

export default function MT5HistoryPage() {
  const [trades, setTrades] = useState<MT5TradeHistory[]>([])
  const [stats, setStats] = useState<TradeHistoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [symbols, setSymbols] = useState<string[]>([])
  
  // Filters
  const [symbolFilter, setSymbolFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'BUY' | 'SELL' | 'all'>('all')
  const [profitFilter, setProfitFilter] = useState<'profit' | 'loss' | 'all'>('all')
  const [closedByFilter, setClosedByFilter] = useState<'TP' | 'SL' | 'MANUAL' | 'all'>('all')
  const [limitFilter, setLimitFilter] = useState(50)

  useEffect(() => {
    loadData()
  }, [symbolFilter, typeFilter, profitFilter, closedByFilter, limitFilter])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load symbols
      const symbolsList = await getTradeHistorySymbols()
      setSymbols(symbolsList)

      // Load trades with filters
      const filters = {
        symbol: symbolFilter !== 'all' ? symbolFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        profitLoss: profitFilter,
        closedBy: closedByFilter,
        limitCount: limitFilter
      }

      const [tradesData, statsData] = await Promise.all([
        getTradeHistory(filters),
        getTradeHistoryStats(filters)
      ])

      setTrades(tradesData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading trade history:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Close Time', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'SL', 'TP', 'Profit', 'Pips', 'Duration (min)', 'Closed By'].join(','),
      ...trades.map(trade => [
        trade.closeTime.toISOString(),
        trade.symbol,
        trade.type,
        trade.volume,
        trade.openPrice,
        trade.closePrice,
        trade.stopLoss || 'None',
        trade.takeProfit || 'None',
        trade.profit.toFixed(2),
        trade.pips.toFixed(1),
        Math.round(trade.duration / 60),
        trade.closedBy
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mt5-trade-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            MT5 Live Trading History
          </h1>
          <p className="text-muted-foreground mt-2">
            Archived closed trades from MT5 streaming with complete statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={trades.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalTrades}</div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.totalProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total Profit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${stats.totalPips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalPips.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Total Pips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.profitFactor.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Profit Factor</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatDuration(stats.averageDuration)}</div>
              <p className="text-xs text-muted-foreground">Avg Duration</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Symbol:</label>
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symbols</SelectItem>
                {symbols.map(symbol => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Type:</label>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Result:</label>
            <Select value={profitFilter} onValueChange={(v) => setProfitFilter(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="profit">Profit</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Closed By:</label>
            <Select value={closedByFilter} onValueChange={(v) => setClosedByFilter(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="TP">Take Profit</SelectItem>
                <SelectItem value="SL">Stop Loss</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Limit:</label>
            <Select value={limitFilter.toString()} onValueChange={(v) => setLimitFilter(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader>
          <CardTitle>Closed Trades ({trades.length})</CardTitle>
          <CardDescription>
            Automatically archived from MT5 streaming when positions close
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading trades...</span>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No closed trades found</p>
              <p className="text-sm mt-2">Trades will appear here when positions close while streaming is active</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Close Time
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Symbol
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Type
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Open
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Close
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Profit
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Pips
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Duration
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Closed By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {trade.closeTime.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {trade.symbol}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                          {trade.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono">
                        {trade.openPrice.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono">
                        {trade.closePrice.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${trade.profit.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${trade.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pips > 0 ? '+' : ''}{trade.pips.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {formatDuration(trade.duration)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {trade.closedBy === 'TP' && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            TP
                          </Badge>
                        )}
                        {trade.closedBy === 'SL' && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            SL
                          </Badge>
                        )}
                        {trade.closedBy === 'MANUAL' && (
                          <Badge variant="outline" className="text-xs">
                            Manual
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



