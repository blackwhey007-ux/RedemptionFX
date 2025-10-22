'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Signal, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Calculator,
  Shield,
  Info
} from 'lucide-react'
import { Signal as SignalType } from '@/types/signal'
import { getSignalsByCategory } from '@/lib/signalService'
import { formatPrice, getCategoryIcon, calculatePips } from '@/lib/currencyDatabase'
import { toast } from 'sonner'

export default function FreeSignalsPage() {
  const { user } = useAuth()
  const [signals, setSignals] = useState<SignalType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSignals()
  }, [])

  const loadSignals = async () => {
    try {
      setLoading(true)
      console.log('Loading free signals for user:', user)
      const data = await getSignalsByCategory('free')
      console.log('Free signals loaded:', data)
      setSignals(data)
    } catch (error) {
      console.error('Error loading free signals:', error)
      toast.error('Failed to load signals')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: SignalType['status']) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4 text-red-500" />
      case 'hit_tp1':
      case 'hit_tp2':
      case 'hit_tp3':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'hit_sl':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'breakeven':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />
      default:
        return <Clock className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: SignalType['status']) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'hit_tp1':
      case 'hit_tp2':
      case 'hit_tp3':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'hit_sl':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'breakeven':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    }
  }

  const copySignalDetails = (signal: SignalType) => {
    const details = `${signal.pair} ${signal.type}
Entry: ${signal.entryPrice}
Stop Loss: ${signal.stopLoss}
Take Profit 1: ${signal.takeProfit1}${signal.takeProfit2 ? `\nTake Profit 2: ${signal.takeProfit2}` : ''}${signal.takeProfit3 ? `\nTake Profit 3: ${signal.takeProfit3}` : ''}
Status: ${signal.status.replace('_', ' ').toUpperCase()}${signal.result ? `\nResult: ${signal.result} pips` : ''}`
    
    navigator.clipboard.writeText(details)
    toast.success('Signal details copied to clipboard!')
  }

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
      {/* Free Signals Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Target className="w-6 h-6 text-red-500" />
              Free Signals Management
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Access to our free trading signals
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Signal className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {signals.length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Total Signals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {signals.filter(s => s.status.includes('hit_tp')).length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Successful Signals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {signals.filter(s => s.status === 'active').length}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Active Signals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {signals.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  No free signals available
                </h3>
                <p className="text-slate-500 dark:text-slate-500 text-center">
                  Check back later for new free trading signals.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
        signals.filter(signal => signal && signal.id).map((signal) => {
          // Calculate pip values for display
          const slPips = Math.abs(calculatePips(signal.entryPrice, signal.stopLoss, signal.pair))
          const tp1Pips = Math.abs(calculatePips(signal.entryPrice, signal.takeProfit1, signal.pair))
          const riskReward = tp1Pips / slPips

          return (
            <Card key={signal.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-red-400 dark:hover:border-red-500 bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10">
              <CardContent className="p-6">
                {/* Header with enhanced styling */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getCategoryIcon('forex')}</span>
                      <Badge className={`px-3 py-1 text-sm font-bold shadow-lg ${
                        signal.type === 'BUY'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                          : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                      }`}>
                        {signal.type === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {signal.type}
                      </Badge>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg">
                      <Target className="w-3 h-3 mr-1" />
                      FREE
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`px-3 py-1 text-sm font-bold ${getStatusColor(signal.status)} shadow-lg`}>
                      {getStatusIcon(signal.status)}
                      {signal.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Main Signal Info with enhanced styling */}
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">
                    {signal.pair}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {signal.title}
                  </p>
                </div>

                {/* Enhanced Price Levels */}
                <div className="space-y-4 mb-6">
                  {/* Entry Price with enhanced styling */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-red-900/20 dark:to-red-800/30 rounded-xl p-4 border border-red-500/30 dark:border-red-500/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">ENTRY PRICE</span>
                      </div>
                      <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        {formatPrice(signal.entryPrice, signal.pair)}
                      </span>
                    </div>
                  </div>

                  {/* Stop Loss & Take Profit with enhanced styling */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-800/30">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">STOP LOSS</span>
                        </div>
                        <span className="text-2xl font-bold text-red-700 dark:text-red-300 block mb-1">
                          {formatPrice(signal.stopLoss, signal.pair)}
                        </span>
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          {slPips} pips
                        </span>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800/30">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">TAKE PROFIT 1</span>
                        </div>
                        <span className="text-2xl font-bold text-green-700 dark:text-green-300 block mb-1">
                          {formatPrice(signal.takeProfit1, signal.pair)}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {tp1Pips} pips
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Take Profits */}
                  {(signal.takeProfit2 || signal.takeProfit3) && (
                    <div className="grid grid-cols-2 gap-3">
                      {signal.takeProfit2 && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-3 border border-green-200 dark:border-green-800/30">
                          <div className="text-center">
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-1">TP2</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-300">
                              {formatPrice(signal.takeProfit2, signal.pair)}
                            </span>
                          </div>
                        </div>
                      )}
                      {signal.takeProfit3 && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-3 border border-green-200 dark:border-green-800/30">
                          <div className="text-center">
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 block mb-1">TP3</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-300">
                              {formatPrice(signal.takeProfit3, signal.pair)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                    {/* Risk Analysis */}
                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-500/30 dark:border-red-500/50">
                      <div className="flex items-center space-x-2 mb-3">
                        <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">RISK ANALYSIS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Risk-Reward</p>
                          <p className={`text-lg font-bold ${
                            riskReward >= 2 ? 'text-green-600' :
                            riskReward >= 1.5 ? 'text-red-600' :
                            riskReward >= 1 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            1:{riskReward.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Assessment</p>
                          <p className={`text-sm font-bold ${
                            riskReward >= 2 ? 'text-green-600' :
                            riskReward >= 1.5 ? 'text-red-600' :
                            riskReward >= 1 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {riskReward >= 2 ? 'Excellent' :
                             riskReward >= 1.5 ? 'Good' :
                             riskReward >= 1 ? 'Acceptable' : 'High Risk'}
                          </p>
                        </div>
                      </div>
                      {/* Risk Message */}
                      <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-500/30 dark:border-red-500/50">
                        <p className="text-xs text-red-800 dark:text-red-200 font-medium text-center">
                          {riskReward >= 2 ? 
                            'Excellent risk-reward ratio! Do not risk more than 1% of your account per trade.' :
                            riskReward >= 1.5 ? 
                            'Good risk-reward ratio. Do not risk more than 1% of your account per trade.' :
                            riskReward >= 1 ? 
                            'Acceptable risk-reward ratio. Consider reducing position size. Do not risk more than 0.5% of your account per trade.' :
                            'Low risk-reward ratio. Consider waiting for better entry or reducing position size. Do not risk more than 0.25% of your account per trade.'
                          }
                        </p>
                      </div>
                    </div>

                  {/* Result */}
                  {signal.result && (
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/30">
                      <div className="text-center">
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block mb-2">FINAL RESULT</span>
                        <span className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                          {signal.result > 0 ? '+' : ''}{signal.result} pips
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enhanced Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{signal.postedAt.toLocaleTimeString()}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copySignalDetails(signal)}
                    className="h-9 px-4 text-sm font-medium hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-600 transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Signal
                  </Button>
                </div>

                {/* Enhanced Notes */}
                {signal.notes && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-red-900/20 dark:to-red-800/30 rounded-lg border border-red-500/30 dark:border-red-500/50">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {signal.notes}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
        )}
      </div>

      {/* Upgrade CTA */}
      <Card className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800/30">
        <CardContent className="p-6 text-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Want More Signals?
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Upgrade to VIP to access exclusive VIP signals with higher success rates and advanced analysis.
          </p>
          <Button className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white">
            Upgrade to VIP
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
