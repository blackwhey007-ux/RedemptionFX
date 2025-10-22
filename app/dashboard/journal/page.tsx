'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  Star,
  BookOpen,
  PieChart,
  Activity,
  Save,
  X,
  AlertCircle,
  Calculator,
  Info,
  Database,
  Edit3,
  Trash2 as TrashIcon,
  Plus as PlusIcon,
  Edit as EditIcon
} from 'lucide-react'
import { CURRENCY_PAIRS, getCurrencyPair, calculatePips, calculateProfit, formatPrice, getPriceColor, formatRealPrice, getCategoryIcon, getCurrencyPairsByCategory } from '@/lib/currencyDatabase'

interface Trade {
  id: string
  date: string
  time: string
  pair: string
  type: 'BUY' | 'SELL'
  status: 'OPEN' | 'CLOSED'
  entryPrice: number
  exitPrice: number
  pips: number
  profit: number
  rr: number
  risk: number
  result: 'WIN' | 'LOSS' | 'BREAKEVEN'
  notes: string
}

export default function JournalPage() {
  const searchParams = useSearchParams()
  const [activeSubcategory, setActiveSubcategory] = useState('trading-journal')

  // Set active subcategory based on URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'dashboard' || tab === 'database') {
      setActiveSubcategory(tab)
    } else {
      setActiveSubcategory('trading-journal')
    }
  }, [searchParams])
  const [trades, setTrades] = useState<Trade[]>([])
  const [isAddingTrade, setIsAddingTrade] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [newTrade, setNewTrade] = useState<Trade>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    pair: '',
    type: 'BUY',
    status: 'OPEN',
    entryPrice: 0,
    exitPrice: 0,
    pips: 0,
    profit: 0,
    rr: 0,
    risk: 0,
    result: 'WIN',
    notes: ''
  })

  // Currency Database states
  const [currencyPairs, setCurrencyPairs] = useState(CURRENCY_PAIRS)
  const [editingPair, setEditingPair] = useState<any>(null)
  const [isAddingPair, setIsAddingPair] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Date filter states
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    preset: 'all'
  })
  const dateFilterRef = useRef<HTMLDivElement>(null)

  // Filter trades based on date
  const filteredTrades = trades.filter(trade => {
    if (dateFilter.preset === 'all') return true
    if (dateFilter.preset === 'today') {
      const today = new Date().toISOString().split('T')[0]
      return trade.date === today
    }
    if (dateFilter.preset === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(trade.date) >= weekAgo
    }
    if (dateFilter.preset === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return new Date(trade.date) >= monthAgo
    }
    if (dateFilter.preset === 'custom') {
      if (!dateFilter.startDate || !dateFilter.endDate) return true
      return trade.date >= dateFilter.startDate && trade.date <= dateFilter.endDate
    }
    return true
  })

  // Filter currency pairs
  const filteredCurrencyPairs = currencyPairs.filter(pair => {
    const matchesSearch = pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pair.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || pair.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Click outside to close date filter
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setShowDateFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDateFilter])

  // Auto-calculate pips and profit when prices change
  const updateCalculations = (trade: Trade) => {
    if (trade.pair && trade.entryPrice && trade.exitPrice) {
      const pairData = currencyPairs.find(p => p.symbol === trade.pair)
      if (pairData) {
        const calculatedPips = calculatePips(trade.entryPrice, trade.exitPrice, trade.pair)
        const calculatedProfit = calculateProfit(trade.entryPrice, trade.exitPrice, 0.1, trade.pair)
        const calculatedRr = trade.risk > 0 ? calculatedPips / trade.risk : 0
        
        setNewTrade(prev => ({
          ...prev,
          pips: calculatedPips,
          profit: calculatedProfit,
          rr: calculatedRr
        }))
      }
    }
  }

  const handleAddTrade = () => {
    if (isAddingTrade) {
      setIsAddingTrade(false)
      setEditingTrade(null)
    } else {
      setIsAddingTrade(true)
      setEditingTrade(null)
      setNewTrade({
        id: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        pair: '',
        type: 'BUY',
        status: 'OPEN',
        entryPrice: 0,
        exitPrice: 0,
        pips: 0,
        profit: 0,
        rr: 0,
        risk: 0,
        result: 'WIN',
        notes: ''
      })
    }
  }

  const handleSaveTrade = () => {
    if (editingTrade) {
      setTrades(trades.map(trade => 
        trade.id === editingTrade.id ? newTrade : trade
      ))
      setEditingTrade(null)
    } else {
      const trade: Trade = {
        ...newTrade,
        id: Date.now().toString()
      }
      setTrades([trade, ...trades])
    }
    
    setNewTrade({
      id: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      pair: '',
      type: 'BUY',
      status: 'OPEN',
      entryPrice: 0,
      exitPrice: 0,
      pips: 0,
      profit: 0,
      rr: 0,
      risk: 0,
      result: 'WIN',
      notes: ''
    })
    setIsAddingTrade(false)
  }

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade)
    setIsAddingTrade(true)
    setNewTrade(trade)
  }

  const handleDeleteTrade = (tradeId: string) => {
    setTrades(trades.filter(trade => trade.id !== tradeId))
    setShowDeleteConfirm(null)
  }

  const handleSavePair = () => {
    if (editingPair) {
      // Check if it's a new pair or editing existing
      const existingIndex = currencyPairs.findIndex(pair => pair.symbol === editingPair.symbol)
      if (existingIndex >= 0) {
        // Update existing pair
        setCurrencyPairs(currencyPairs.map(pair => 
          pair.symbol === editingPair.symbol ? editingPair : pair
        ))
      } else {
        // Add new pair
        setCurrencyPairs([...currencyPairs, editingPair])
      }
    }
    setIsAddingPair(false)
    setEditingPair(null)
  }

  const handleDeletePair = (symbol: string) => {
    setCurrencyPairs(currencyPairs.filter(pair => pair.symbol !== symbol))
  }

  // Calculate stats
  const totalTrades = filteredTrades.length
  const winTrades = filteredTrades.filter(t => t.result === 'WIN').length
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0
  const totalPips = filteredTrades.reduce((sum, t) => sum + t.pips, 0)
  const avgRr = totalTrades > 0 ? filteredTrades.reduce((sum, t) => sum + t.rr, 0) / totalTrades : 0
  const bestTrade = Math.max(...filteredTrades.map(t => t.pips), 0)
  const worstTrade = Math.min(...filteredTrades.map(t => t.pips), 0)

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'WIN': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'LOSS': return <XCircle className="w-4 h-4 text-red-500" />
      case 'BREAKEVEN': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case 'WIN': return 'text-green-600 dark:text-green-400'
      case 'LOSS': return 'text-red-600 dark:text-red-400'
      case 'BREAKEVEN': return 'text-yellow-600 dark:text-yellow-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTypeColor = (type: string) => {
    return type === 'BUY' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'CLOSED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-orange-500 dark:from-red-400 dark:via-red-300 dark:to-orange-400 bg-clip-text text-transparent">
            Trading Journal
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Track your trades, analyze performance, and manage currency database with RedemptionFX
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative" ref={dateFilterRef}>
            <Button 
              variant="outline" 
              className="border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setShowDateFilter(!showDateFilter)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Filter by Date
            </Button>
            {showDateFilter && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-black/90 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-4">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Filter Trades</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['all', 'today', 'week', 'month'].map((preset) => (
                      <Button
                        key={preset}
                        variant={dateFilter.preset === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDateFilter({ ...dateFilter, preset })}
                        className="text-xs"
                      >
                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Custom Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value, preset: 'custom' })}
                        className="text-xs"
                      />
                      <Input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value, preset: 'custom' })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Subcategory Navigation */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-black/90 p-1 rounded-lg">
        <Button
          variant={activeSubcategory === 'trading-journal' ? 'default' : 'ghost'}
          onClick={() => setActiveSubcategory('trading-journal')}
          className={`flex-1 ${activeSubcategory === 'trading-journal' ? 'bg-red-500 text-white' : ''}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Trading Journal
        </Button>
        <Button
          variant={activeSubcategory === 'dashboard' ? 'default' : 'ghost'}
          onClick={() => setActiveSubcategory('dashboard')}
          className={`flex-1 ${activeSubcategory === 'dashboard' ? 'bg-red-500 text-white' : ''}`}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button
          variant={activeSubcategory === 'database' ? 'default' : 'ghost'}
          onClick={() => setActiveSubcategory('database')}
          className={`flex-1 ${activeSubcategory === 'database' ? 'bg-red-500 text-white' : ''}`}
        >
          <Database className="w-4 h-4 mr-2" />
          Currency Database
        </Button>
      </div>

      {/* Trading Journal Subcategory */}
      {activeSubcategory === 'trading-journal' && (
        <div className="space-y-6">
          {/* Add Trade Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Trade</h2>
            <Button
              onClick={handleAddTrade}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {isAddingTrade ? 'Cancel' : 'Add Trade'}
            </Button>
          </div>

          {/* Add Trade Form */}
          {isAddingTrade && (
            <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-200 dark:border-red-800/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                  <PlusIcon className="w-5 h-5 mr-2 text-red-500" />
                  {editingTrade ? 'Edit Trade' : 'Add New Trade'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Currency Pair */}
                  <div className="space-y-2">
                    <Label htmlFor="pair" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Currency Pair *
                    </Label>
                    <Select value={newTrade.pair} onValueChange={(value) => {
                      const updatedTrade = { ...newTrade, pair: value }
                      setNewTrade(updatedTrade)
                      updateCalculations(updatedTrade)
                    }}>
                      <SelectTrigger className="border-red-200 dark:border-red-800/50">
                        <SelectValue placeholder="Select currency pair" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categoryFilter === 'all' ? CURRENCY_PAIRS : getCurrencyPairsByCategory(categoryFilter as 'forex' | 'indices' | 'commodities' | 'crypto')).map((pair) => (
                          <SelectItem key={pair.symbol} value={pair.symbol}>
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(pair.category)}
                              <span>{pair.symbol}</span>
                              <span className="text-xs text-slate-500">- {pair.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trade Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Trade Type *
                    </Label>
                    <Select value={newTrade.type} onValueChange={(value: 'BUY' | 'SELL') => setNewTrade({ ...newTrade, type: value })}>
                      <SelectTrigger className="border-red-200 dark:border-red-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUY">BUY</SelectItem>
                        <SelectItem value="SELL">SELL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Status *
                    </Label>
                    <Select value={newTrade.status} onValueChange={(value: 'OPEN' | 'CLOSED') => setNewTrade({ ...newTrade, status: value })}>
                      <SelectTrigger className="border-red-200 dark:border-red-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">OPEN</SelectItem>
                        <SelectItem value="CLOSED">CLOSED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Entry Price */}
                  <div className="space-y-2">
                    <Label htmlFor="entryPrice" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Entry Price *
                    </Label>
                    <Input
                      id="entryPrice"
                      type="number"
                      step="0.00001"
                      value={newTrade.entryPrice}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        const updatedTrade = { ...newTrade, entryPrice: value }
                        setNewTrade(updatedTrade)
                        updateCalculations(updatedTrade)
                      }}
                      className="border-red-200 dark:border-red-800/50"
                      placeholder="1.23456"
                    />
                  </div>

                  {/* Exit Price */}
                  <div className="space-y-2">
                    <Label htmlFor="exitPrice" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Exit Price *
                    </Label>
                    <Input
                      id="exitPrice"
                      type="number"
                      step="0.00001"
                      value={newTrade.exitPrice}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        const updatedTrade = { ...newTrade, exitPrice: value }
                        setNewTrade(updatedTrade)
                        updateCalculations(updatedTrade)
                      }}
                      className="border-red-200 dark:border-red-800/50"
                      placeholder="1.23456"
                    />
                  </div>

                  {/* Risk (Pips) */}
                  <div className="space-y-2">
                    <Label htmlFor="risk" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Risk (Pips)
                    </Label>
                    <Input
                      id="risk"
                      type="number"
                      value={newTrade.risk}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        const updatedTrade = { ...newTrade, risk: value }
                        setNewTrade(updatedTrade)
                        updateCalculations(updatedTrade)
                      }}
                      className="border-red-200 dark:border-red-800/50"
                      placeholder="20"
                    />
                  </div>

                  {/* Calculated Pips */}
                  <div className="space-y-2">
                    <Label htmlFor="pips" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Pips (Calculated)
                    </Label>
                    <Input
                      id="pips"
                      type="number"
                      value={newTrade.pips}
                      readOnly
                      className="border-red-200 dark:border-red-800/50 bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  {/* Calculated Profit */}
                  <div className="space-y-2">
                    <Label htmlFor="profit" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Profit (Calculated)
                    </Label>
                    <Input
                      id="profit"
                      type="number"
                      value={newTrade.profit}
                      readOnly
                      className="border-red-200 dark:border-red-800/50 bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  {/* Calculated R:R */}
                  <div className="space-y-2">
                    <Label htmlFor="rr" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      R:R (Calculated)
                    </Label>
                    <Input
                      id="rr"
                      type="number"
                      value={newTrade.rr}
                      readOnly
                      className="border-red-200 dark:border-red-800/50 bg-slate-50 dark:bg-slate-700 cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                  </div>

                  {/* Result */}
                  <div className="space-y-2">
                    <Label htmlFor="result" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Result
                    </Label>
                    <Select value={newTrade.result} onValueChange={(value: 'WIN' | 'LOSS' | 'BREAKEVEN') => setNewTrade({ ...newTrade, result: value })}>
                      <SelectTrigger className="border-red-200 dark:border-red-800/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WIN">WIN</SelectItem>
                        <SelectItem value="LOSS">LOSS</SelectItem>
                        <SelectItem value="BREAKEVEN">BREAKEVEN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={newTrade.date}
                      onChange={(e) => setNewTrade({ ...newTrade, date: e.target.value })}
                      className="border-red-200 dark:border-red-800/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={newTrade.notes}
                    onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                    className="border-red-200 dark:border-red-800/50"
                    placeholder="Add any additional notes about this trade..."
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleAddTrade}
                    className="border-red-200 dark:border-red-800/50"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveTrade}
                    className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                  >
                    {editingTrade ? 'Update Trade' : 'Add Trade'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Trades */}
          <Card className="bg-white/80 dark:bg-black/90/80 backdrop-blur-sm border-red-200/20 dark:border-red-800/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-red-500" />
                Recent Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No trades yet</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Start tracking your trading performance by adding your first trade.
                  </p>
                  <Button
                    onClick={handleAddTrade}
                    className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Your First Trade
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-black/90/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(currencyPairs.find(p => p.symbol === trade.pair)?.category || 'forex')}
                            <span className="font-medium text-slate-900 dark:text-white">{trade.pair}</span>
                          </div>
                          <Badge className={getTypeColor(trade.type)}>
                            {trade.type}
                          </Badge>
                          <Badge className={getStatusColor(trade.status)}>
                            {trade.status}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            {getResultIcon(trade.result)}
                            <span className={`text-sm font-medium ${getResultColor(trade.result)}`}>
                              {trade.result}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTrade(trade)}
                            className="text-slate-500 hover:text-red-500"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(trade.id)}
                            className="text-slate-500 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Entry:</span>
                          <span className="ml-2 font-medium text-slate-900 dark:text-white">{trade.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Exit:</span>
                          <span className="ml-2 font-medium text-slate-900 dark:text-white">{trade.exitPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Pips:</span>
                          <span className={`ml-2 font-medium ${trade.pips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {trade.pips >= 0 ? '+' : ''}{trade.pips.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">R:R:</span>
                          <span className="ml-2 font-medium text-slate-900 dark:text-white">{trade.rr.toFixed(2)}</span>
                        </div>
                      </div>
                      {trade.notes && (
                        <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <p className="text-sm text-slate-600 dark:text-slate-300">{trade.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Subcategory */}
      {activeSubcategory === 'dashboard' && (
        <div className="space-y-6">
          {/* Performance Summary */}
          <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-200 dark:border-red-800/30 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-red-500" />
                Performance Summary
                {dateFilter.preset !== 'all' && (
                  <Badge variant="outline" className="ml-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                    Filtered: {dateFilter.preset}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Total Trades</p>
                      <p className="text-3xl font-bold">{totalTrades}</p>
                    </div>
                    <BookOpen className="w-8 h-8 text-red-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Win Rate</p>
                      <p className="text-3xl font-bold">{winRate.toFixed(1)}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Total Pips</p>
                      <p className="text-3xl font-bold">{totalPips.toFixed(1)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Avg R:R</p>
                      <p className="text-3xl font-bold">{avgRr.toFixed(2)}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-orange-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Best Trade</p>
                      <p className="text-3xl font-bold">+{bestTrade.toFixed(1)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-red-200" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-xl text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-pink-100 text-sm font-medium">Worst Trade</p>
                      <p className="text-3xl font-bold">{worstTrade.toFixed(1)}</p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-pink-200" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades Chart */}
          <Card className="bg-white/80 dark:bg-black/90/80 backdrop-blur-sm border-red-200/20 dark:border-red-800/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-red-500" />
                Recent Trades Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <div className="flex items-end space-x-1 h-48">
                  {filteredTrades.slice(-10).map((trade, index) => (
                    <div
                      key={index}
                      className={`w-8 rounded-t ${
                        trade.pips >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ height: `${Math.max(4, Math.abs(trade.pips) / 2)}px` }}
                      title={`${trade.pair}: ${trade.pips} pips`}
                    />
                  ))}
                </div>
                <div className="text-center z-10">
                  <PieChart className="w-6 h-6 text-red-400 dark:text-red-500 mx-auto mb-1" />
                  <div className="text-xs text-slate-600 dark:text-slate-400">Recent Trades</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Currency Database Subcategory */}
      {activeSubcategory === 'database' && (
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="w-6 h-6 text-red-500" />
                    Currency Database Management
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                    Edit and manage all currency pairs, indices, and commodities for automatic pip calculation
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingPair({
                      symbol: '',
                      name: '',
                      category: 'forex',
                      pipValue: 10,
                      pipPosition: 4,
                      baseCurrency: '',
                      quoteCurrency: '',
                      description: '',
                      tradingHours: '24/5',
                      realPrice: 0,
                      spread: ''
                    })
                    setIsAddingPair(true)
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Pair
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search currency pairs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-red-500/30 dark:border-red-500/50"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48 border-red-200 dark:border-red-800/50">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="forex">💱 Forex</SelectItem>
                    <SelectItem value="indices">📈 Indices</SelectItem>
                    <SelectItem value="commodities">🥇 Commodities</SelectItem>
                    <SelectItem value="crypto">₿ Crypto</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || categoryFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('')
                      setCategoryFilter('all')
                    }}
                    className="border-red-500/30 dark:border-red-500/50"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Results Count */}
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Showing {filteredCurrencyPairs.length} of {currencyPairs.length} currency pairs
              </div>

              {/* Currency Pairs Table */}
              {filteredCurrencyPairs.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No currency pairs found</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {searchQuery || categoryFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria.' 
                      : 'Add your first currency pair to get started.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Symbol</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Category</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Pip Value</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Real Price</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700 dark:text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCurrencyPairs.map((pair) => (
                        <tr key={pair.symbol} className="border-b border-red-500/30 dark:border-red-500/50 hover:bg-slate-50 dark:hover:bg-red-900/20">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(pair.category)}
                              <span className="font-medium text-slate-900 dark:text-white">{pair.symbol}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{pair.name}</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              {pair.category}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{pair.pipValue}</td>
                          <td className="py-3 px-4">
                            <span className={`font-mono text-sm ${getPriceColor(pair.realPrice)}`}>
                              {formatRealPrice(pair.realPrice)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingPair({...pair})
                                  setIsAddingPair(true)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePair(pair.symbol)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white dark:bg-black/90 border-red-200 dark:border-red-800/50">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                Confirm Delete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete this trade? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="border-red-200 dark:border-red-800/50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeleteTrade(showDeleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Trade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Pair Modal */}
      {isAddingPair && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-black/90 border-red-500/30 dark:border-red-500/50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Database className="w-5 h-5 mr-2 text-red-500" />
                {editingPair ? 'Edit Currency Pair' : 'Add New Currency Pair'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol *</Label>
                  <Input
                    id="symbol"
                    value={editingPair?.symbol || ''}
                    onChange={(e) => setEditingPair({...editingPair, symbol: e.target.value})}
                    placeholder="e.g., EUR/USD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={editingPair?.name || ''}
                    onChange={(e) => setEditingPair({...editingPair, name: e.target.value})}
                    placeholder="e.g., Euro vs US Dollar"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={editingPair?.category || 'forex'} 
                    onValueChange={(value) => setEditingPair({...editingPair, category: value as any})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="forex">💱 Forex</SelectItem>
                      <SelectItem value="indices">📈 Indices</SelectItem>
                      <SelectItem value="commodities">🥇 Commodities</SelectItem>
                      <SelectItem value="crypto">₿ Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pipValue">Pip Value *</Label>
                  <Input
                    id="pipValue"
                    type="text"
                    value={editingPair?.pipValue?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow empty string, numbers, decimal points, and partial decimal input
                      if (value === '' || /^(\d+\.?\d*|\.\d+|\.?)$/.test(value)) {
                        setEditingPair({...editingPair, pipValue: parseFloat(value) || 0})
                      }
                    }}
                    placeholder="e.g., 10 or 0.1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pipPosition">Pip Position *</Label>
                  <Input
                    id="pipPosition"
                    type="number"
                    value={editingPair?.pipPosition || ''}
                    onChange={(e) => setEditingPair({...editingPair, pipPosition: parseInt(e.target.value) || 4})}
                    placeholder="e.g., 4 (for most forex), 2 (for JPY)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="baseCurrency">Base Currency *</Label>
                  <Input
                    id="baseCurrency"
                    value={editingPair?.baseCurrency || ''}
                    onChange={(e) => setEditingPair({...editingPair, baseCurrency: e.target.value})}
                    placeholder="e.g., EUR"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quoteCurrency">Quote Currency *</Label>
                  <Input
                    id="quoteCurrency"
                    value={editingPair?.quoteCurrency || ''}
                    onChange={(e) => setEditingPair({...editingPair, quoteCurrency: e.target.value})}
                    placeholder="e.g., USD"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tradingHours">Trading Hours</Label>
                  <Input
                    id="tradingHours"
                    value={editingPair?.tradingHours || ''}
                    onChange={(e) => setEditingPair({...editingPair, tradingHours: e.target.value})}
                    placeholder="e.g., 24/5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="spread">Spread</Label>
                  <Input
                    id="spread"
                    value={editingPair?.spread || ''}
                    onChange={(e) => setEditingPair({...editingPair, spread: e.target.value})}
                    placeholder="e.g., 0.5-1.5 pips"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingPair?.description || ''}
                  onChange={(e) => setEditingPair({...editingPair, description: e.target.value})}
                  placeholder="Brief description of the currency pair..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingPair(false)
                    setEditingPair(null)
                  }}
                  className="border-red-200 dark:border-red-800/50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSavePair}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={!editingPair?.symbol || !editingPair?.name}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingPair ? 'Update Pair' : 'Add Pair'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}