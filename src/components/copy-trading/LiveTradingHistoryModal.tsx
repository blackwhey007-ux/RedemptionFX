'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  RefreshCw,
  Download,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  History,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { MT5TradeHistory, TradeHistoryStats } from '@/lib/mt5TradeHistoryService'
import { exportToCSV } from '@/lib/exportUtils'
import { useAuth } from '@/contexts/AuthContext'

interface FollowerAccount {
  accountId: string
  label: string
  status: string
}

interface LiveTradingHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  masterAccountId: string
  strategyId?: string
}

export function LiveTradingHistoryModal({
  open,
  onOpenChange,
  date,
  masterAccountId,
  strategyId
}: LiveTradingHistoryModalProps) {
  const { user } = useAuth()
  const [trades, setTrades] = useState<MT5TradeHistory[]>([])
  const [stats, setStats] = useState<TradeHistoryStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [followerAccounts, setFollowerAccounts] = useState<FollowerAccount[]>([])
  
  // Filters
  const [accountType, setAccountType] = useState<'master' | 'follower' | 'all'>('all')
  const [followerAccountId, setFollowerAccountId] = useState<string>('all')
  const [symbolFilter, setSymbolFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<'BUY' | 'SELL' | 'all'>('all')
  const [profitFilter, setProfitFilter] = useState<'profit' | 'loss' | 'all'>('all')
  const [closedByFilter, setClosedByFilter] = useState<'TP' | 'SL' | 'MANUAL' | 'all'>('all')
  const [limitFilter, setLimitFilter] = useState(100)

  // Load follower accounts
  useEffect(() => {
    if (open && accountType === 'follower' || accountType === 'all') {
      loadFollowerAccounts()
    }
  }, [open, accountType])

  // Load trades when modal opens or filters change
  useEffect(() => {
    if (open && masterAccountId) {
      loadTrades()
    }
  }, [open, date, masterAccountId, accountType, followerAccountId, symbolFilter, typeFilter, profitFilter, closedByFilter, limitFilter])

  const loadFollowerAccounts = async () => {
    try {
      // Fetch all follower accounts via admin API
      const response = await fetch('/api/admin/copyfactory/followers', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      if (!response.ok) {
        console.warn('Failed to fetch follower accounts')
        return
      }

      const data = await response.json()
      if (data.success && data.followers) {
        // Extract unique follower accounts
        const accounts = data.followers
          .filter((f: any) => f.status === 'active')
          .map((f: any) => ({
            accountId: f.accountId,
            label: f.label || f.accountId.substring(0, 8) + '...',
            status: f.status
          }))
        setFollowerAccounts(accounts)
      }
    } catch (error) {
      console.warn('Error loading follower accounts:', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  const loadTrades = async () => {
    // For VIP Results, masterAccountId might be empty - use accountType=all to show all trades
    if (!masterAccountId) {
      console.warn('No masterAccountId provided, will attempt to fetch all trades for the date')
      // Continue to try fetching with accountType=all
    }

    try {
      setLoading(true)
      
      const dateStr = date.toISOString().split('T')[0]
      const params = new URLSearchParams({
        date: dateStr,
        accountType: masterAccountId ? accountType : 'all', // Use 'all' if no masterAccountId
        limit: limitFilter.toString()
      })
      
      // Only add masterAccountId if it's provided
      if (masterAccountId) {
        params.append('masterAccountId', masterAccountId)
      }

      if (strategyId) {
        params.append('strategyId', strategyId)
      }

      if (accountType === 'follower' && followerAccountId !== 'all') {
        params.append('followerAccountId', followerAccountId)
      }

      if (symbolFilter !== 'all') {
        params.append('symbol', symbolFilter)
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      if (profitFilter !== 'all') {
        params.append('profitLoss', profitFilter)
      }

      if (closedByFilter !== 'all') {
        params.append('closedBy', closedByFilter)
      }

      const response = await fetch(`/api/admin/copyfactory/followers/trades?${params.toString()}`, {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = 'Failed to fetch trades'
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        // Log error but don't throw - just set empty state
        console.warn('Failed to fetch trades:', errorMessage)
        setTrades([])
        setStats(null)
        return
      }

      const data = await response.json()
      if (data.success && data.data) {
        setTrades(data.data.trades || [])
        setStats(data.data.stats || null)
      } else {
        // Log error but don't throw - just set empty state
        console.warn('Failed to load trades:', data.error || 'Unknown error')
        setTrades([])
        setStats(null)
      }
    } catch (error) {
      // Log error but don't throw - just set empty state
      console.warn('Error loading trades:', error instanceof Error ? error.message : 'Unknown error')
      setTrades([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSVFile = () => {
    const csvData = trades.map(trade => ({
      'Close Time': trade.closeTime instanceof Date ? trade.closeTime.toISOString() : trade.closeTime,
      'Symbol': trade.symbol,
      'Type': trade.type,
      'Volume': trade.volume,
      'Open Price': trade.openPrice,
      'Close Price': trade.closePrice,
      'SL': trade.stopLoss || 'None',
      'TP': trade.takeProfit || 'None',
      'Profit': trade.profit != null ? trade.profit.toFixed(2) : '0.00',
      'Pips': trade.pips != null ? trade.pips.toFixed(1) : '0.0',
      'Duration (min)': trade.duration != null ? Math.round(trade.duration / 60) : 0,
      'Closed By': trade.closedBy,
      'Account ID': trade.accountId
    }))

    exportToCSV(csvData, `copy-trading-history-${date.toISOString().split('T')[0]}.csv`)
  }

  const formatDuration = (seconds: number | null | undefined) => {
    if (seconds == null || isNaN(seconds)) return '0s'
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m`
    return `${seconds}s`
  }

  // Get unique symbols from trades
  const symbols = Array.from(new Set(trades.map(t => t.symbol))).sort()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Live Trading History - {date.toLocaleDateString()}
          </DialogTitle>
          <DialogDescription>
            View all trades for {date.toLocaleDateString()} with complete statistics and filtering
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Dashboard */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.winRate != null ? stats.winRate.toFixed(1) : '0.0'}%
                  </div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className={`text-2xl font-bold ${(stats.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${stats.totalProfit != null ? stats.totalProfit.toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className={`text-2xl font-bold ${(stats.totalPips ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(stats.totalPips ?? 0) >= 0 ? '+' : ''}{stats.totalPips != null ? stats.totalPips.toFixed(1) : '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Pips</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {stats.profitFactor != null ? stats.profitFactor.toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Profit Factor</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{formatDuration(stats.averageDuration ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadTrades} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToCSVFile} disabled={trades.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label>Account Type:</Label>
                <Select value={accountType} onValueChange={(v) => {
                  setAccountType(v as any)
                  setFollowerAccountId('all')
                }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="follower">Follower</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {accountType === 'follower' && (
                <div className="flex items-center gap-2">
                  <Label>Follower Account:</Label>
                  <Select value={followerAccountId} onValueChange={setFollowerAccountId}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Followers</SelectItem>
                      {followerAccounts.map(acc => (
                        <SelectItem key={acc.accountId} value={acc.accountId}>
                          {acc.label || acc.accountId.substring(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label>Symbol:</Label>
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
                <Label>Type:</Label>
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
                <Label>Result:</Label>
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
                <Label>Closed By:</Label>
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
                <Label>Limit:</Label>
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
                  <p className="font-medium mb-2">No closed trades found for {date.toLocaleDateString()}</p>
                  <p className="text-sm mt-2 text-gray-400">
                    This could mean:
                  </p>
                  <ul className="text-sm mt-2 text-gray-400 text-left max-w-md mx-auto space-y-1">
                    <li>• No trades were executed on this date</li>
                    <li>• Trades haven't been archived yet by the streaming service</li>
                    <li>• Streaming service may not be active for this account</li>
                  </ul>
                  <p className="text-xs mt-4 text-gray-500">
                    Make sure MT5 streaming is active and positions are being closed to see trade history
                  </p>
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
                        <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                          Account
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {trade.closeTime instanceof Date 
                              ? trade.closeTime.toLocaleString() 
                              : new Date(trade.closeTime).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {trade.symbol}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                              {trade.type === 'BUY' ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              )}
                              {trade.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-mono">
                            {trade.openPrice != null ? trade.openPrice.toFixed(5) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-mono">
                            {trade.closePrice != null ? trade.closePrice.toFixed(5) : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold ${(trade.profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${trade.profit != null ? trade.profit.toFixed(2) : '0.00'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold ${(trade.pips ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {(trade.pips ?? 0) > 0 ? '+' : ''}{trade.pips != null ? trade.pips.toFixed(1) : '0.0'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            <div className="flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {formatDuration(trade.duration ?? 0)}
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
                          <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                            {trade.accountId === masterAccountId ? (
                              <Badge variant="outline" className="text-xs">Master</Badge>
                            ) : (
                              <span className="text-xs">{trade.accountId.substring(0, 8)}...</span>
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
      </DialogContent>
    </Dialog>
  )
}

