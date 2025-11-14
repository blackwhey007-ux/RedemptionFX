'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  getAccountClosedTrades,
  getAccountClosedTradesStats,
  getAccountClosedTradesSymbols
} from '@/lib/accountClosedTradesService'
import {
  MT5TradeHistory,
  TradeHistoryStats,
  TradeHistoryFilters
} from '@/lib/mt5TradeHistoryService'
import { useAuth } from '@/contexts/AuthContext'
import { getActiveAccount, getUserLinkedAccounts, LinkedAccount } from '@/lib/accountService'
import {
  RefreshCw,
  Download,
  Filter,
  Clock,
  History,
  CheckCircle,
  XCircle,
  BookOpen
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const SELECTED_ACCOUNTS_STORAGE_KEY = 'trading-journal-selected-accounts'

export default function ClosedTradesPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [activeAccount, setActiveAccount] = useState<LinkedAccount | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
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
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null)
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null)

  // Load accounts and restore selection from localStorage
  useEffect(() => {
    const loadAccounts = async () => {
      if (!authUser?.uid) return
      try {
        const accounts = await getUserLinkedAccounts(authUser.uid)
        setLinkedAccounts(accounts)
        
        const active = await getActiveAccount(authUser.uid)
        setActiveAccount(active)
        
        // Restore selected accounts from localStorage
        try {
          const stored = localStorage.getItem(SELECTED_ACCOUNTS_STORAGE_KEY)
          if (stored) {
            const storedIds = JSON.parse(stored) as string[]
            // Only restore accounts that still exist
            const validIds = storedIds.filter(id => accounts.some(acc => acc.id === id))
            if (validIds.length > 0) {
              setSelectedAccountIds(new Set(validIds))
              return
            }
          }
        } catch (e) {
          console.warn('Error reading selected accounts from localStorage:', e)
        }
        
        // Default to active account or all accounts
        if (active) {
          setSelectedAccountIds(new Set([active.id]))
        } else if (accounts.length > 0) {
          setSelectedAccountIds(new Set(accounts.map(acc => acc.id)))
        }
      } catch (error) {
        console.error('Error loading accounts:', error)
      }
    }
    loadAccounts()
  }, [authUser?.uid])

  // Save selected accounts to localStorage whenever they change
  useEffect(() => {
    if (selectedAccountIds.size > 0) {
      try {
        localStorage.setItem(SELECTED_ACCOUNTS_STORAGE_KEY, JSON.stringify(Array.from(selectedAccountIds)))
      } catch (e) {
        console.warn('Error saving selected accounts to localStorage:', e)
      }
    }
  }, [selectedAccountIds])

  useEffect(() => {
    if (authUser?.uid && selectedAccountIds.size > 0) {
      loadData()
    } else if (authUser?.uid && selectedAccountIds.size === 0) {
      // No accounts selected - clear data
      setTrades([])
      setStats(null)
      setSymbols([])
      setLoading(false)
    }
  }, [authUser?.uid, selectedAccountIds, symbolFilter, typeFilter, profitFilter, closedByFilter, limitFilter, startDateFilter, endDateFilter])

  const loadData = async () => {
    if (!authUser?.uid || selectedAccountIds.size === 0) return

    try {
      setLoading(true)
      
      console.log('🔄 [ClosedTrades] Loading trade history data for accounts:', Array.from(selectedAccountIds))
      
      // Build filters
      const filters: Omit<TradeHistoryFilters, 'accountId' | 'userId'> = {
        symbol: symbolFilter !== 'all' ? symbolFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        profitLoss: profitFilter,
        closedBy: closedByFilter,
        limitCount: limitFilter,
        startDate: startDateFilter ? startDateFilter : undefined,
        endDate: endDateFilter ? new Date(endDateFilter.getFullYear(), endDateFilter.getMonth(), endDateFilter.getDate(), 23, 59, 59) : undefined // Include full day
      }
      
      // Load trades from all selected accounts
      const allTrades: MT5TradeHistory[] = []
      const allSymbolsSet = new Set<string>()
      
      for (const accountLinkId of selectedAccountIds) {
        const account = linkedAccounts.find(acc => acc.id === accountLinkId)
        if (!account) continue
        
        try {
          // Load symbols for this account
          const accountSymbols = await getAccountClosedTradesSymbols(
            authUser.uid,
            accountLinkId
          )
          accountSymbols.forEach(s => allSymbolsSet.add(s))
          
          // Load trades for this account
          const accountTrades = await getAccountClosedTrades(authUser.uid, accountLinkId, filters)
          allTrades.push(...accountTrades)
          
          console.log(`✅ [ClosedTrades] Loaded ${accountTrades.length} trades from account: ${account.accountName}`)
        } catch (error) {
          console.error(`❌ [ClosedTrades] Error loading trades for account ${accountLinkId}:`, error)
        }
      }
      
      setSymbols(Array.from(allSymbolsSet).sort())

      console.log('🔍 [ClosedTrades] Fetching trades with filters:', filters)
      console.log(`✅ [ClosedTrades] Total loaded ${allTrades.length} trades from ${selectedAccountIds.size} account(s)`)

      // Remove duplicates based on positionId (same trade might appear in multiple accounts)
      const uniqueTrades = Array.from(
        new Map(allTrades.map(trade => [trade.positionId || trade.id, trade])).values()
      )

      // Calculate combined stats
      const totalTrades = uniqueTrades.length
      const profitableTrades = uniqueTrades.filter(t => t.profit > 0).length
      const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
      const totalProfit = uniqueTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
      const totalPips = uniqueTrades.reduce((sum, t) => sum + (t.pips || 0), 0)
      const totalWins = uniqueTrades.filter(t => t.profit > 0).reduce((sum, t) => sum + (t.profit || 0), 0)
      const totalLosses = Math.abs(uniqueTrades.filter(t => t.profit < 0).reduce((sum, t) => sum + (t.profit || 0), 0))
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0
      const avgRR = uniqueTrades
        .filter(t => t.riskReward !== null && t.riskReward !== undefined)
        .reduce((sum, t, _, arr) => sum + (t.riskReward || 0) / arr.length, 0)
      const avgDuration = uniqueTrades.reduce((sum, t) => sum + (t.duration || 0), 0) / totalTrades

      const winningTrades = uniqueTrades.filter(t => t.profit > 0).length
      const losingTrades = uniqueTrades.filter(t => t.profit < 0).length
      const averageProfit = totalTrades > 0 ? totalProfit / totalTrades : 0
      const bestTrade = uniqueTrades.length > 0 ? Math.max(...uniqueTrades.map(t => t.profit || 0)) : 0
      const worstTrade = uniqueTrades.length > 0 ? Math.min(...uniqueTrades.map(t => t.profit || 0)) : 0
      
      const combinedStats: TradeHistoryStats = {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfit,
        averageProfit,
        bestTrade,
        worstTrade,
        totalPips,
        profitFactor,
        averageRR: avgRR,
        averageDuration: avgDuration || 0
      }

      setTrades(uniqueTrades)
      setStats(combinedStats)
    } catch (error) {
      console.error('❌ [ClosedTrades] Error loading closed trades:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const csv = [
      ['Close Time', 'Symbol', 'Type', 'Volume', 'Open Price', 'Close Price', 'SL', 'TP', 'R:R', 'Profit', 'Commission', 'Swap', 'Pips', 'Duration (min)', 'Closed By'].join(','),
      ...trades.map(trade => [
        trade.closeTime.toISOString(),
        trade.symbol,
        trade.type,
        trade.volume.toFixed(2),
        trade.openPrice,
        trade.closePrice,
        trade.stopLoss || 'None',
        trade.takeProfit || 'None',
        trade.riskReward !== null && trade.riskReward !== undefined ? `${trade.riskReward.toFixed(1)}:1` : 'N/A',
        trade.profit.toFixed(2),
        trade.commission.toFixed(2),
        trade.swap.toFixed(2),
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

  if (!authUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Please log in to view closed trades.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
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

      {/* Account Selection */}
      {linkedAccounts.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium mb-3 block">Select Accounts to View</Label>
            <div className="space-y-2">
              {linkedAccounts.map((account) => (
                <div key={account.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`closed-trades-account-${account.id}`}
                    checked={selectedAccountIds.has(account.id)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedAccountIds)
                      if (checked) {
                        newSelected.add(account.id)
                      } else {
                        newSelected.delete(account.id)
                      }
                      setSelectedAccountIds(newSelected)
                    }}
                  />
                  <label
                    htmlFor={`closed-trades-account-${account.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    <div className="flex items-center justify-between">
                      <span>{account.accountName}</span>
                      <Badge variant={account.isActive ? 'default' : 'secondary'} className="ml-2">
                        {account.accountType}
                      </Badge>
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {selectedAccountIds.size === 0 
                ? 'Select at least one account to view trades'
                : `Viewing trades from ${selectedAccountIds.size} account${selectedAccountIds.size > 1 ? 's' : ''}`
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics Dashboard - Match admin page exactly */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
              <div className={`text-2xl font-bold ${stats.averageRR >= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.averageRR.toFixed(1)}:1
              </div>
              <p className="text-xs text-muted-foreground">Avg R:R</p>
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
                <SelectItem value="500">500</SelectItem>
                <SelectItem value="1000">1000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Start Date:</label>
            <DateTimePicker
              value={startDateFilter}
              onChange={(date) => setStartDateFilter(date)}
              showTimeSelect={false}
              dateFormat="MMM dd, yyyy"
              maxDate={endDateFilter || new Date()}
              placeholder="Select start date"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">End Date:</label>
            <DateTimePicker
              value={endDateFilter}
              onChange={(date) => setEndDateFilter(date)}
              showTimeSelect={false}
              dateFormat="MMM dd, yyyy"
              minDate={startDateFilter || undefined}
              maxDate={new Date()}
              placeholder="Select end date"
            />
          </div>

          {(startDateFilter || endDateFilter) && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDateFilter(null)
                  setEndDateFilter(null)
                }}
              >
                Clear Dates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trades Table - Match admin page exactly */}
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
              <p className="text-lg font-semibold mb-2">No closed trades found</p>
              <p className="text-sm mt-2 mb-4">
                {!activeAccount
                  ? 'Please link an account first in the Trading Journal page.'
                  : activeAccount?.mt5AccountId || activeAccount?.copyTradingAccountId
                  ? 'Click "Sync Now" in the Trading Journal page to fetch closed trades from your MT5 account. Closed trades will appear here after syncing.'
                  : 'Link an account in the Trading Journal to start syncing trades'}
              </p>
              {activeAccount && (
                <Button
                  variant="default"
                  onClick={() => router.push('/dashboard/trading-journal')}
                  className="mt-4"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Go to Trading Journal to Sync
                </Button>
              )}
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
                      Volume
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Open
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Close
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-blue-600">
                      SL
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-green-600">
                      TP
                    </th>
                    <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-purple-600">
                      R:R
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">
                      Profit
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-gray-500">
                      Comm
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-gray-500">
                      Swap
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
                    <tr key={trade.id || trade.positionId} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
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
                      <td className="py-3 px-4 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                        {trade.volume.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono">
                        {trade.openPrice.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono">
                        {trade.closePrice.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-blue-600">
                        {trade.stopLoss && trade.stopLoss > 0 ? trade.stopLoss.toFixed(5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-green-600">
                        {trade.takeProfit && trade.takeProfit > 0 ? trade.takeProfit.toFixed(5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {trade.riskReward !== null && trade.riskReward !== undefined ? (
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold ${
                              trade.riskReward >= 2 ? 'text-green-600 border-green-600' : 
                              trade.riskReward >= 1 ? 'text-blue-600 border-blue-600' : 
                              'text-orange-600 border-orange-600'
                            }`}
                          >
                            {trade.riskReward >= 0 ? `${trade.riskReward.toFixed(1)}:1` : `1:${Math.abs(trade.riskReward).toFixed(1)}`}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${trade.profit.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-500">
                        ${trade.commission.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-500">
                        ${trade.swap.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(() => {
                          // Ensure pips sign matches profit sign
                          // If profit is negative, pips should be negative (and vice versa)
                          let correctedPips = trade.pips
                          if ((trade.profit < 0 && trade.pips > 0) || (trade.profit > 0 && trade.pips < 0)) {
                            // Sign mismatch detected - flip the sign of pips to match profit
                            correctedPips = -trade.pips
                          }
                          return (
                            <span className={`font-semibold ${correctedPips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {correctedPips > 0 ? '+' : ''}{correctedPips.toFixed(1)}
                        </span>
                          )
                        })()}
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
