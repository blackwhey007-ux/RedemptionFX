'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, TrendingUp, TrendingDown, Activity, AlertCircle, PlayCircle, StopCircle, DollarSign, Percent } from 'lucide-react'
import { calculatePipsFromPosition, formatPips } from '@/lib/pipCalculator'
import { StreamingProgressDialog } from '@/components/admin/StreamingProgressDialog'
import { ErrorDialog } from '@/components/ui/error-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { StatsCard } from '@/components/ui/stats-card'

interface MT5Position {
  id?: string
  ticket?: string
  symbol: string
  type: string | 'BUY' | 'SELL' | 'POSITION_TYPE_BUY' | 'POSITION_TYPE_SELL'
  volume: number
  profit: number
  swap: number
  commission: number
  openPrice: number
  currentPrice: number
  stopLoss?: number
  takeProfit?: number
  time?: string
  timeUpdate?: string
  comment?: string
}

export function OpenTradesPanel() {
  const [positions, setPositions] = useState<MT5Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState<any>(null)
  const [streaming, setStreaming] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState('10000') // Default 10 seconds for scalping
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // UI state for new features
  const [showProgress, setShowProgress] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [showError, setShowError] = useState(false)
  const [errorDetails, setErrorDetails] = useState<Error | string | null>(null)

  const fetchPositions = async () => {
    try {
      console.log('📊 Fetching positions from /api/mt5-open-positions...')
      const response = await fetch('/api/mt5-open-positions')
      
      const data = await response.json()
      console.log('📦 API response received:', { success: data.success, positionsCount: data.positions?.length })
      
      if (data.success) {
        // Debug: Log the actual position data
        console.log('📊 Positions received:', data.positions)
        if (data.positions.length > 0) {
          console.log('🔍 First position details:', {
            symbol: data.positions[0].symbol,
            type: data.positions[0].type,
            openPrice: data.positions[0].openPrice,
            currentPrice: data.positions[0].currentPrice,
            profit: data.positions[0].profit,
            stopLoss: data.positions[0].stopLoss,
            takeProfit: data.positions[0].takeProfit
          })
        }
        setPositions(data.positions || [])
        setLastUpdate(new Date())
        setError(null)
      } else {
        const errorMsg = data.error || 'Failed to fetch positions'
        
        // 503 means streaming not active - this is expected, not an error
        if (response.status === 503) {
          console.log('ℹ️ Streaming not active - please start streaming to view positions')
          setError('Streaming not active. Go to MetaAPI Setup to start streaming.')
          setPositions([])
        } else {
          // Actual errors (not streaming-related)
          console.error('❌ API returned error:', errorMsg)
          setError(errorMsg)
          setPositions([])
        }
      }
    } catch (err) {
      console.error('❌ Network error fetching positions:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error details:', errorMsg)
      setError(`Network error: ${errorMsg}. Please check your connection and try again.`)
      setPositions([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPositions()
  }

  const loadStreamingStatus = async () => {
    try {
      console.log('📊 Loading streaming status from /api/mt5-streaming/start...')
      const response = await fetch('/api/mt5-streaming/start', { method: 'GET' })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Streaming status response:', data)
        if (data.success && data.status) {
          setStreamingStatus(data.status)
          setStreaming(data.status.isConnected || false)
          console.log(`✅ Streaming status: ${data.status.isConnected ? 'ACTIVE' : 'INACTIVE'}`)
        } else {
          console.warn('⚠️ Streaming status response missing data:', data)
        }
      } else {
        console.error('❌ Failed to load streaming status:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('❌ Error loading streaming status:', err)
    }
  }

  const handleStartStreaming = async () => {
    console.log('🚀 Starting streaming...')
    setStreaming(true)
    setShowProgress(true)
    setProgressStep(1)
    
    try {
      // Simulate progress steps for better UX
      setProgressStep(2) // Deploying
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProgressStep(3) // Broker connection
      const response = await fetch('/api/mt5-streaming/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      setProgressStep(4) // WebSocket
      console.log('📦 Start streaming response:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Streaming started successfully:', data)
        
        setProgressStep(5) // Synchronizing
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setProgressStep(6) // Complete
        setStreamingStatus(data.status)
        await loadStreamingStatus()
        
        // Keep success dialog visible for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000))
        setShowProgress(false)
      } else {
        const error = await response.json()
        console.error('❌ Failed to start streaming:', error)
        setShowProgress(false)
        setErrorDetails(new Error(error.error || 'Failed to start streaming'))
        setShowError(true)
        setStreaming(false)
      }
    } catch (error) {
      console.error('❌ Error starting streaming:', error)
      setShowProgress(false)
      setErrorDetails(error as Error)
      setShowError(true)
      setStreaming(false)
    }
  }

  const handleStopStreaming = async () => {
    console.log('🛑 Stopping streaming...')
    setStreaming(false)
    try {
      const response = await fetch('/api/mt5-streaming/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.log('📦 Stop streaming response:', response.status, response.statusText)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Streaming stopped successfully')
        alert('Real-time streaming stopped successfully.')
        setStreamingStatus(null)
        await loadStreamingStatus()
      } else {
        console.error('❌ Failed to stop streaming:', data)
        alert(`Failed to stop streaming: ${data.error}`)
        setStreaming(true)
      }
    } catch (error) {
      console.error('❌ Error stopping streaming:', error)
      alert('Failed to stop streaming: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setStreaming(true)
    }
  }

  const handleIntervalChange = (value: string) => {
    setRefreshInterval(value)
  }

  useEffect(() => {
    // Initial fetch
    fetchPositions()
    loadStreamingStatus()

    // Poll streaming status every 5 seconds
    const statusInterval = setInterval(loadStreamingStatus, 5000)

    return () => {
      clearInterval(statusInterval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Set up new interval based on refresh interval
    const intervalMs = parseInt(refreshInterval)
    if (intervalMs > 0) {
      intervalRef.current = setInterval(fetchPositions, intervalMs)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [refreshInterval])

  // Note: Keep-alive and auto-reconnection now handled by StreamingConnectionManager
  // No need for component-level monitoring - the service layer handles it professionally

  const formatTime = (timeString?: string) => {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString)
      return date.toLocaleString()
    } catch {
      return timeString
    }
  }

  const formatProfit = (profit: number) => {
    if (profit > 0) {
      return <span className="text-green-600 dark:text-green-400 font-semibold">+${profit.toFixed(2)}</span>
    } else if (profit < 0) {
      return <span className="text-red-600 dark:text-red-400 font-semibold">-${Math.abs(profit).toFixed(2)}</span>
    }
    return <span className="text-gray-600 dark:text-gray-400">${profit.toFixed(2)}</span>
  }

  const getPipsColor = (pips: number) => {
    if (pips > 0) return 'text-green-600 dark:text-green-400'
    if (pips < 0) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getTypeBadge = (type: string) => {
    // Normalize type to handle both 'BUY' and 'POSITION_TYPE_BUY' formats
    const normalizedType = type.toUpperCase()
    const isBuy = normalizedType.includes('BUY') && !normalizedType.includes('SELL')
    
    return isBuy ? (
      <Badge variant="buy">
        <TrendingUp className="h-3 w-3" />
        BUY
      </Badge>
    ) : (
      <Badge variant="sell">
        <TrendingDown className="h-3 w-3" />
        SELL
      </Badge>
    )
  }

  // Keyboard shortcuts for power users
  useKeyboardShortcuts([
    {
      key: 'r',
      ctrl: true,
      description: 'Refresh positions',
      action: handleRefresh,
      enabled: !loading
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: 'Toggle streaming',
      action: () => streaming ? handleStopStreaming() : handleStartStreaming()
    }
  ])

  if (loading && positions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton variant="table" rows={5} />
        </CardContent>
      </Card>
    )
  }

  // Calculate stats
  const totalProfit = positions.reduce((sum, pos) => sum + pos.profit, 0)
  const winningPositions = positions.filter(pos => pos.profit > 0).length
  const winRate = positions.length > 0 ? ((winningPositions / positions.length) * 100).toFixed(0) : '0'

  return (
    <>
      {/* Progress Dialog */}
      <StreamingProgressDialog
        isOpen={showProgress}
        currentStep={progressStep}
        onClose={() => setShowProgress(false)}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={showError}
        error={errorDetails}
        onClose={() => {
          setShowError(false)
          setErrorDetails(null)
        }}
      />

    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Open Positions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Live MT5 positions • Updated real-time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <StatusIndicator 
            status={streamingStatus?.isConnected ? 'active' : 'inactive'} 
            label={streamingStatus?.isConnected ? 'Active' : 'Inactive'}
          />
          <Button 
            variant="premiumOutline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {streamingStatus?.isConnected ? (
            <Button
              variant="destructive"
              onClick={handleStopStreaming}
              disabled={streaming}
            >
              <StopCircle className="h-4 w-4 mr-2" />
              Stop Streaming
            </Button>
          ) : (
            <Button
              variant="premium"
              onClick={handleStartStreaming}
              disabled={streaming}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Streaming
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Active Positions"
          value={positions.length}
          icon={Activity}
          decorativeColor="phoenix"
        />
        <StatsCard
          title="Total Profit/Loss"
          value={`$${totalProfit.toFixed(2)}`}
          trend={totalProfit >= 0 ? `+${winningPositions} winning` : `${positions.length - winningPositions} losing`}
          icon={DollarSign}
          decorativeColor={totalProfit >= 0 ? "green" : "phoenix"}
        />
        <StatsCard
          title="Win Rate"
          value={`${winRate}%`}
          trend={`${winningPositions} of ${positions.length} positions`}
          icon={Percent}
          decorativeColor={parseInt(winRate) >= 50 ? "green" : "gold"}
        />
      </div>

      {/* Main Card */}
      <Card variant="glass">
        <CardDecorativeOrb color="phoenix" />
        <CardContent className="relative z-10">
        {/* Auto-refresh Control */}
        <div className="mb-6 flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800/50">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-refresh interval:</span>
          <Select value={refreshInterval} onValueChange={handleIntervalChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Manual</SelectItem>
              <SelectItem value="2000">2s</SelectItem>
              <SelectItem value="5000">5s</SelectItem>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
              <SelectItem value="60000">1m</SelectItem>
            </SelectContent>
          </Select>
          {lastUpdate && (
            <span className="text-xs text-gray-500">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Table/Content */}
        {error ? (
          <div className="flex items-center justify-center py-12 text-center">
            <div className="max-w-2xl">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                Failed to Load Positions
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              {error.includes('MT5 settings') && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                  💡 <strong>Tip:</strong> Configure your MetaAPI credentials in the "API Setup" tab first, then try again.
                </p>
              )}
              <Button
                onClick={handleRefresh}
                className="mt-4"
                variant="premiumOutline"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : positions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <Activity className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No Open Positions
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {streamingStatus?.isConnected 
                  ? 'No open positions detected in your MT5 account'
                  : 'Use the "Start Streaming" button above to monitor your MT5 positions in real-time'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6 first:rounded-tl-xl last:rounded-tr-xl">Symbol</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Type</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Volume</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Entry</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Current</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Stop Loss</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Take Profit</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Pips</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Profit/Loss</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-4 px-6">Opened</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => {
                  // Normalize type to 'BUY' | 'SELL'
                  const normalizedType = position.type?.toString().toUpperCase() || ''
                  const tradeType: 'BUY' | 'SELL' = normalizedType.includes('SELL') ? 'SELL' : 'BUY'
                  
                  const pips = calculatePipsFromPosition({
                    symbol: position.symbol,
                    type: tradeType,
                    openPrice: position.openPrice,
                    currentPrice: position.currentPrice
                  })

                  return (
                    <tr
                      key={position.id || position.ticket || index}
                      className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors duration-150 group"
                    >
                      <td className="py-3 px-4 font-medium">{position.symbol}</td>
                      <td className="py-3 px-4">{getTypeBadge(position.type)}</td>
                      <td className="py-3 px-4 text-right">{position.volume}</td>
                      <td className="py-3 px-4 text-right">{position.openPrice.toFixed(5)}</td>
                      <td className="py-3 px-4 text-right">{position.currentPrice.toFixed(5)}</td>
                      <td className="py-3 px-4 text-right text-sm">
                        {position.stopLoss ? position.stopLoss.toFixed(5) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        {position.takeProfit ? position.takeProfit.toFixed(5) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${getPipsColor(pips)}`}>
                        {formatPips(pips)}
                      </td>
                      <td className="py-3 px-4 text-right">{formatProfit(position.profit)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatTime(position.time || position.timeUpdate)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
    </>
  )
}

