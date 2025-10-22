'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  Signal, 
  Target, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Filter,
  Calculator,
  Shield,
  Info,
  Send,
  ExternalLink
} from 'lucide-react'
import { Signal as SignalType } from '@/types/signal'
import { createSignal, getAllSignals, updateSignalStatus, deleteSignal } from '@/lib/signalService'
import { CURRENCY_PAIRS, getCurrencyPair, calculatePips, formatPrice, getCategoryIcon } from '@/lib/currencyDatabase'
import { toast } from 'sonner'

export default function AdminSignalsPage() {
  const { user } = useAuth()
  const [signals, setSignals] = useState<SignalType[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'free' | 'vip'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hit_tp' | 'hit_sl' | 'breakeven' | 'cancelled' | 'close_now'>('all')

  // Form state - simplified
  const [formData, setFormData] = useState({
    title: '',
    category: 'free' as 'free' | 'vip',
    pair: '',
    type: 'BUY' as 'BUY' | 'SELL',
    entryPrice: '',
    stopLoss: '',
    takeProfit: ''
  })

  // Calculation state - simplified
  const [calculations, setCalculations] = useState({
    slPips: 0,
    tpPips: 0,
    riskReward: 0
  })

  // Close Now dialog state
  const [closeNowDialog, setCloseNowDialog] = useState<{
    isOpen: boolean
    signalId: string | null
    closePrice: string
  }>({
    isOpen: false,
    signalId: null,
    closePrice: ''
  })

  // Get selected currency pair info
  const selectedPair = useMemo(() => getCurrencyPair(formData.pair), [formData.pair])

  useEffect(() => {
    loadSignals()
  }, [])

  // Calculate pips and risk metrics - simplified
  useEffect(() => {
    if (formData.entryPrice && formData.stopLoss && formData.takeProfit && selectedPair && formData.pair) {
      const entry = parseFloat(formData.entryPrice)
      const sl = parseFloat(formData.stopLoss)
      const tp = parseFloat(formData.takeProfit)
      
      if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp) && entry > 0 && sl > 0 && tp > 0) {
        const slPips = Math.abs(calculatePips(entry, sl, formData.pair))
        const tpPips = Math.abs(calculatePips(entry, tp, formData.pair))
        const riskReward = tpPips / slPips
        
        setCalculations({
          slPips,
          tpPips,
          riskReward: isFinite(riskReward) ? riskReward : 0
        })
      } else {
        setCalculations({
          slPips: 0,
          tpPips: 0,
          riskReward: 0
        })
      }
    } else {
      setCalculations({
        slPips: 0,
        tpPips: 0,
        riskReward: 0
      })
    }
  }, [formData.entryPrice, formData.stopLoss, formData.takeProfit, formData.pair, selectedPair])

  // Auto-generate signal title
  useEffect(() => {
    if (formData.pair && formData.type) {
      setFormData(prev => ({
        ...prev,
        title: `${prev.pair} ${prev.type} Signal`
      }))
    }
  }, [formData.pair, formData.type])

  const loadSignals = async () => {
    try {
      setLoading(true)
      const data = await getAllSignals()
      setSignals(data)
    } catch (error) {
      console.error('Error loading signals:', error)
      toast.error('Failed to load signals')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSignal = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('You must be logged in to create signals')
      return
    }

    try {
      const signalData: any = {
        title: formData.title,
        category: formData.category,
        pair: formData.pair,
        type: formData.type,
        entryPrice: parseFloat(formData.entryPrice),
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit1: parseFloat(formData.takeProfit),
        status: 'active' as const,
        postedAt: new Date(),
        createdBy: user.uid,
        createdByName: user.displayName || 'Admin'
      }

      const createdSignal = await createSignal(signalData)
      console.log('Signal created successfully:', createdSignal)
      toast.success('Signal created successfully!')
      setIsCreateOpen(false)
      setFormData({
        title: '',
        category: 'free',
        pair: '',
        type: 'BUY',
        entryPrice: '',
        stopLoss: '',
        takeProfit: ''
      })
      loadSignals()
    } catch (error) {
      console.error('Error creating signal:', error)
      toast.error('Failed to create signal')
    }
  }

  const handleUpdateStatus = async (signalId: string, status: SignalType['status'], result?: number) => {
    try {
      if (status === 'close_now') {
        // Open close now dialog
        setCloseNowDialog({
          isOpen: true,
          signalId,
          closePrice: ''
        })
      } else {
        const signal = signals.find(s => s.id === signalId)
        let calculatedResult = result

        // Auto-calculate pips based on status
        if (signal) {
          if (status === 'hit_tp') {
            calculatedResult = calculatePips(signal.entryPrice, signal.takeProfit1, signal.pair)
          } else if (status === 'hit_sl') {
            calculatedResult = calculatePips(signal.entryPrice, signal.stopLoss, signal.pair)
          } else if (status === 'breakeven') {
            calculatedResult = 0
          }
        }

        await updateSignalStatus(signalId, status, calculatedResult)
        toast.success('Signal status updated!')
        loadSignals()
      }
    } catch (error) {
      console.error('Error updating signal status:', error)
      toast.error('Failed to update signal status')
    }
  }

  const handleCloseNow = async () => {
    if (!closeNowDialog.signalId || !closeNowDialog.closePrice) {
      toast.error('Please enter close price')
      return
    }

    try {
      const signal = signals.find(s => s.id === closeNowDialog.signalId)
      if (!signal) {
        toast.error('Signal not found')
        return
      }

      const closePrice = parseFloat(closeNowDialog.closePrice)
      const result = calculatePips(signal.entryPrice, closePrice, signal.pair)
      
      await updateSignalStatus(closeNowDialog.signalId, 'close_now', result, closePrice)
      toast.success('Signal closed successfully!')
      setCloseNowDialog({
        isOpen: false,
        signalId: null,
        closePrice: ''
      })
      loadSignals()
    } catch (error) {
      console.error('Error closing signal:', error)
      toast.error('Failed to close signal')
    }
  }

  const handleDeleteSignal = async (signalId: string) => {
    if (!confirm('Are you sure you want to delete this signal?')) return

    try {
      await deleteSignal(signalId)
      toast.success('Signal deleted!')
      loadSignals()
    } catch (error) {
      console.error('Error deleting signal:', error)
      toast.error('Failed to delete signal')
    }
  }

  const getStatusIcon = (status: SignalType['status']) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'hit_tp':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'hit_sl':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'breakeven':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />
      case 'close_now':
        return <Target className="w-4 h-4 text-purple-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  const getStatusColor = (status: SignalType['status']) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'hit_tp':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'hit_sl':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'breakeven':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      case 'close_now':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    }
  }

  const filteredSignals = signals.filter(signal => {
    const categoryMatch = filter === 'all' || signal.category === filter
    const statusMatch = statusFilter === 'all' || signal.status === statusFilter
    return categoryMatch && statusMatch
  })

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Signal Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Signal className="w-6 h-6 text-red-500" />
                Signal Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Create and manage trading signals for your community
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Signal
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Signal</DialogTitle>
              <DialogDescription>
                Quick signal creation - essential fields only
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSignal} className="space-y-4">
              {/* Basic Info - Compact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: 'free' | 'vip') => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free Signal</SelectItem>
                      <SelectItem value="vip">VIP Signal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pair">Currency Pair</Label>
                  <Select
                    value={formData.pair}
                    onValueChange={(value) => setFormData({ ...formData, pair: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pair" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {CURRENCY_PAIRS.map((pair) => (
                        <SelectItem key={pair.symbol} value={pair.symbol}>
                          <span className="font-mono">{pair.symbol}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Type and Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'BUY' | 'SELL') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entryPrice">Entry Price</Label>
                  <Input
                    id="entryPrice"
                    type="number"
                    step={selectedPair ? Math.pow(10, -selectedPair.pipPosition) : "0.00001"}
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                    placeholder="1.0850"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="stopLoss">Stop Loss</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    step={selectedPair ? Math.pow(10, -selectedPair.pipPosition) : "0.00001"}
                    value={formData.stopLoss}
                    onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                    placeholder="1.0800"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="takeProfit">Take Profit</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    step={selectedPair ? Math.pow(10, -selectedPair.pipPosition) : "0.00001"}
                    value={formData.takeProfit}
                    onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                    placeholder="1.0900"
                    required
                  />
                </div>
              </div>

              {/* Quick Pip Display */}
              {(calculations.slPips > 0 || calculations.tpPips > 0) && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">SL</p>
                    <p className="text-lg font-bold text-red-600">{calculations.slPips}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">TP</p>
                    <p className="text-lg font-bold text-green-600">{calculations.tpPips}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">R:R</p>
                    <p className="text-lg font-bold text-blue-600">1:{calculations.riskReward.toFixed(1)}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white">
                  Create Signal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Select value={filter} onValueChange={(value: 'all' | 'free' | 'vip') => setFilter(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="free">Free Signals</SelectItem>
              <SelectItem value="vip">VIP Signals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="hit_tp">Hit TP</SelectItem>
            <SelectItem value="hit_sl">Hit SL</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
            <SelectItem value="close_now">Close Now</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Signals List */}
      <div className="grid gap-4">
        {filteredSignals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Signal className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No signals found
              </h3>
              <p className="text-slate-500 dark:text-slate-500 text-center">
                {filter === 'all' ? 'Create your first signal to get started.' : `No ${filter} signals found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSignals.map((signal) => (
            <Card key={signal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{signal.pair}</h3>
                    <Badge variant={signal.category === 'vip' ? 'default' : 'secondary'} className="text-xs">
                      {signal.category === 'vip' ? 'VIP' : 'FREE'}
                    </Badge>
                    <Badge className={getStatusColor(signal.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(signal.status)}
                        <span className="capitalize text-xs">{signal.status.replace('_', ' ')}</span>
                      </div>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold flex items-center gap-1 ${
                      signal.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {signal.type === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {signal.type}
                    </span>
                  </div>
                </div>

                {/* Price Grid */}
                <div className="grid grid-cols-4 gap-4 mb-3">
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <p className="text-xs text-slate-500">Entry</p>
                    <p className="font-bold">{signal.entryPrice}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <p className="text-xs text-slate-500">SL</p>
                    <p className="font-bold text-red-600">{signal.stopLoss}</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="text-xs text-slate-500">TP</p>
                    <p className="font-bold text-green-600">{signal.takeProfit1}</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="text-xs text-slate-500">Result</p>
                    <p className={`font-bold ${
                      signal.result && signal.result > 0 ? 'text-green-600' : 
                      signal.result && signal.result < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {signal.result ? `${signal.result > 0 ? '+' : ''}${signal.result}` : '-'} pips
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-slate-500">
                    {signal.createdByName} • {new Date(signal.postedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={signal.status}
                      onValueChange={(value: SignalType['status']) => handleUpdateStatus(signal.id, value)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="hit_tp">Hit TP</SelectItem>
                        <SelectItem value="hit_sl">Hit SL</SelectItem>
                        <SelectItem value="breakeven">Breakeven</SelectItem>
                        <SelectItem value="close_now">Close Now</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSignal(signal.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Close Now Dialog */}
      <Dialog open={closeNowDialog.isOpen} onOpenChange={(open) => setCloseNowDialog({ ...closeNowDialog, isOpen: open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Signal Now</DialogTitle>
            <DialogDescription>
              Enter the current market price to close this signal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {closeNowDialog.signalId && (() => {
              const signal = signals.find(s => s.id === closeNowDialog.signalId)
              return signal ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Pair:</span>
                      <span className="ml-2 font-bold">{signal.pair}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <span className={`ml-2 font-bold ${signal.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>
                        {signal.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Entry:</span>
                      <span className="ml-2 font-bold">{signal.entryPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">TP:</span>
                      <span className="ml-2 font-bold text-green-600">{signal.takeProfit1}</span>
                    </div>
                  </div>
                </div>
              ) : null
            })()}
            <div>
              <Label htmlFor="closePrice">Close Price</Label>
              <Input
                id="closePrice"
                type="number"
                step="0.00001"
                value={closeNowDialog.closePrice}
                onChange={(e) => setCloseNowDialog({ ...closeNowDialog, closePrice: e.target.value })}
                placeholder="Enter current market price"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCloseNowDialog({ isOpen: false, signalId: null, closePrice: '' })}>
                Cancel
              </Button>
              <Button onClick={handleCloseNow} className="bg-purple-600 hover:bg-purple-700 text-white">
                Close Signal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
