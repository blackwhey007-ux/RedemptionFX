'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Loader2,
  RefreshCw,
  Download,
  Calendar,
  Filter,
  X
} from 'lucide-react'
import { exportToCSV } from '@/lib/exportUtils'

interface FollowerTrade {
  id: string
  accountId: string
  userId: string
  ticket: string
  symbol: string
  type: string
  volume: number
  openPrice: number
  closePrice: number
  profit: number
  commission: number
  swap: number
  openTime: Date | string
  closeTime: Date | string
  comment?: string
}

interface TradeHistoryViewerProps {
  accountId: string
  userId: string
  strategyId: string
  accountName?: string
  onClose?: () => void
}

export function TradeHistoryViewer({
  accountId,
  userId,
  strategyId,
  accountName,
  onClose
}: TradeHistoryViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trades, setTrades] = useState<FollowerTrade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<FollowerTrade[]>([])
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    symbol: '',
    type: ''
  })

  const loadTradeHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        strategyId,
        useCache: 'true'
      })

      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }
      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }

      const response = await fetch(
        `/api/admin/copyfactory/followers/${userId}/${accountId}/history?${params.toString()}`,
        {
          headers: {
            'x-user-id': userId,
            'x-user-email': ''
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch trade history')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load trade history')
      }

      setTrades(data.data.trades || [])
      setFilteredTrades(data.data.trades || [])
    } catch (err) {
      console.error('Error loading trade history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trade history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTradeHistory()
  }, [accountId, userId, strategyId])

  useEffect(() => {
    // Apply filters
    let filtered = [...trades]

    if (filters.symbol) {
      filtered = filtered.filter((t) =>
        t.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      )
    }

    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type)
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate)
      filtered = filtered.filter((t) => {
        const closeTime = t.closeTime instanceof Date ? t.closeTime : new Date(t.closeTime)
        return closeTime >= start
      })
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((t) => {
        const closeTime = t.closeTime instanceof Date ? t.closeTime : new Date(t.closeTime)
        return closeTime <= end
      })
    }

    setFilteredTrades(filtered)
  }, [trades, filters])

  const handleExport = () => {
    const csvData = filteredTrades.map((trade) => ({
      Date: new Date(trade.closeTime).toLocaleDateString(),
      Time: new Date(trade.closeTime).toLocaleTimeString(),
      Ticket: trade.ticket,
      Symbol: trade.symbol,
      Type: trade.type,
      Volume: trade.volume,
      'Open Price': trade.openPrice,
      'Close Price': trade.closePrice,
      Profit: trade.profit,
      Commission: trade.commission,
      Swap: trade.swap,
      Comment: trade.comment || ''
    }))

    exportToCSV(csvData, `trade-history-${accountId}-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      symbol: '',
      type: ''
    })
  }

  const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
  const totalTrades = filteredTrades.length
  const winningTrades = filteredTrades.filter((t) => (t.profit || 0) > 0).length
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>
              {accountName || `Account ${accountId.substring(0, 8)}...`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={loadTradeHistory} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredTrades.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold mt-1">{totalTrades}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Profit</p>
            <p className={`text-2xl font-bold mt-1 ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totalProfit.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-2xl font-bold mt-1">{winRate.toFixed(2)}%</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Winning Trades</p>
            <p className="text-2xl font-bold mt-1">{winningTrades}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="Filter by symbol"
              value={filters.symbol}
              onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Trade Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading trade history...</span>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No trades found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Open Price</TableHead>
                  <TableHead>Close Price</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Swap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.map((trade) => {
                  const closeTime = trade.closeTime instanceof Date ? trade.closeTime : new Date(trade.closeTime)
                  return (
                    <TableRow key={trade.id}>
                      <TableCell>
                        {closeTime.toLocaleString()}
                      </TableCell>
                      <TableCell>{trade.ticket}</TableCell>
                      <TableCell>{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === 'buy' ? 'default' : 'secondary'}>
                          {trade.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.volume}</TableCell>
                      <TableCell>{trade.openPrice.toFixed(5)}</TableCell>
                      <TableCell>{trade.closePrice.toFixed(5)}</TableCell>
                      <TableCell className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${trade.profit.toFixed(2)}
                      </TableCell>
                      <TableCell>${trade.commission.toFixed(2)}</TableCell>
                      <TableCell>${trade.swap.toFixed(2)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}




