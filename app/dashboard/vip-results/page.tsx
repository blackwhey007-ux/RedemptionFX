'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/ui/stats-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// Removed profile imports - VIP Results now shows signals only
import { PromotionalContentService, PromotionalContent } from '@/lib/promotionalContentService'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Clock, 
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Star,
  Zap,
  Trophy,
  BarChart3,
  User,
  Play,
  Pause
} from 'lucide-react'
// Chart imports removed - no longer using Equity Curve or Win/Loss Ratio charts
import { cn } from '@/lib/utils'
import { Signal } from '@/types/signal'
import { safeGetSignalResult } from '@/lib/signalService'
import { MT5TradeHistory } from '@/lib/mt5TradeHistoryService'
import { LiveTradingHistoryModal } from '@/components/copy-trading/LiveTradingHistoryModal'

interface SignalStats {
  totalSignals: number
  completedSignals: number
  activeSignals: number
  winningSignals: number
  losingSignals: number
  breakevenSignals: number
  totalPips: number
  winningPips: number
  losingPips: number
  averageWin: number
  averageLoss: number
  winRate: number
  bestSignal: number
  worstSignal: number
  currentWinStreak: number
  monthlyPips: number
  monthlyWinRate: number
  lastUpdated: string
  syncMethod: 'signals'
}

// SignalCard component for slideshow
const SignalCard = ({ signal, index }: { signal: Signal; index: number }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hit_tp':
      case 'hit_tp1':
      case 'hit_tp2':
      case 'hit_tp3':
        return 'bg-green-600 text-white'
      case 'hit_sl':
        return 'bg-red-600 text-white'
      case 'breakeven':
        return 'bg-yellow-600 text-white'
      case 'active':
        return 'bg-blue-600 text-white'
      case 'cancelled':
        return 'bg-gray-600 text-white'
      case 'close_now':
        return 'bg-purple-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'hit_tp':
      case 'hit_tp1':
      case 'hit_tp2':
      case 'hit_tp3':
        return 'WIN'
      case 'hit_sl':
        return 'LOSS'
      case 'breakeven':
        return 'BE'
      case 'active':
        return 'ACTIVE'
      case 'cancelled':
        return 'CANCELLED'
      case 'close_now':
        return 'CLOSED'
      default:
        return 'UNKNOWN'
    }
  }

  const getResultPips = () => {
    const result = safeGetSignalResult(signal)
    return result > 0 ? `+${result}` : `${result}`
  }

  const result = safeGetSignalResult(signal)
  const isWin = result > 0
  const isLoss = result < 0

  return (
    <div className="group relative">
      {/* Signal Card */}
      <div className={cn(
        "p-4 rounded-xl border min-h-[120px] flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:shadow-lg",
        "bg-gradient-to-br from-gray-900 to-black dark:from-gray-800 dark:to-black",
        "border-gray-700 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-500"
      )}>
        {/* Header with rank and pair */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
              #{index + 1}
            </div>
            <div>
              <span className="font-bold text-lg text-white">{signal.pair}</span>
              <div className="flex items-center gap-1 mt-1">
                {signal.type === 'BUY' ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span className="text-xs font-medium text-gray-300">{signal.type}</span>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(signal.status)}>
            <CheckCircle className="w-3 h-3 mr-1" />
            {getStatusText(signal.status)}
          </Badge>
        </div>
        
        {/* Entry price and targets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Entry</span>
            <span className="text-white font-medium text-sm">
              {signal.entryPrice}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">SL</span>
            <span className="text-white font-medium text-sm">
              {signal.stopLoss}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">TP1</span>
            <span className="text-white font-medium text-sm">
              {signal.takeProfit1}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Result</span>
            <span className={cn(
              "font-black text-2xl",
              isWin ? "text-green-400" : isLoss ? "text-red-400" : "text-gray-400"
            )}>
              {getResultPips()} pips
            </span>
          </div>
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 to-gray-800/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </div>
  )
}

// Performance Metric Calculation Functions
const calculateDrawdown = (dataSource: 'signals' | 'mt5', signals: Signal[], trades: MT5TradeHistory[]) => {
  try {
    let peak = 0
    let maxDrawdown = 0
    let currentEquity = 0
    
    if (dataSource === 'signals') {
      if (!signals || signals.length === 0) return 0
      const sortedSignals = signals
        .filter(s => s && s.result !== undefined && s.result !== null && s.postedAt)
        .sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime())
      
      sortedSignals.forEach(signal => {
        currentEquity += safeGetSignalResult(signal)
        if (currentEquity > peak) peak = currentEquity
        const drawdown = peak - currentEquity
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      })
    } else {
      if (!trades || trades.length === 0) return 0
      const sortedTrades = [...trades]
        .filter(t => t && t.closeTime && t.pips !== undefined)
        .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())
      
      sortedTrades.forEach(trade => {
        currentEquity += trade.pips
        if (currentEquity > peak) peak = currentEquity
        const drawdown = peak - currentEquity
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
      })
    }
    
    return maxDrawdown
  } catch (error) {
    console.error('Error calculating drawdown:', error)
    return 0
  }
}

const calculateAvgDuration = (dataSource: 'signals' | 'mt5', signals: Signal[], trades: MT5TradeHistory[]) => {
  try {
    if (dataSource === 'signals') {
      // For signals, calculate from postedAt to when result was recorded
      // Since we don't track exact closure time, estimate based on typical signal duration
      if (!signals || signals.length === 0) return 0
      const completedSignals = signals.filter(s => s && s.result !== undefined && s.result !== null)
      if (completedSignals.length === 0) return 0
      // Estimate average of 2 days per signal (48 hours)
      return 48
    } else {
      if (!trades || trades.length === 0) return 0
      const validTrades = trades.filter(t => t && t.closeTime && t.openTime)
      if (validTrades.length === 0) return 0
      const totalDuration = validTrades.reduce((sum, trade) => {
        const duration = new Date(trade.closeTime).getTime() - new Date(trade.openTime).getTime()
        return sum + duration
      }, 0)
      return totalDuration / validTrades.length / (1000 * 60 * 60) // Convert to hours
    }
  } catch (error) {
    console.error('Error calculating average duration:', error)
    return 0
  }
}

const calculateStreaks = (dataSource: 'signals' | 'mt5', signals: Signal[], trades: MT5TradeHistory[]) => {
  try {
    let maxWinStreak = 0
    let maxLossStreak = 0
    let currentWinStreak = 0
    let currentLossStreak = 0
    
    if (dataSource === 'signals') {
      if (!signals || signals.length === 0) return { maxWinStreak: 0, maxLossStreak: 0 }
      const sortedSignals = signals
        .filter(s => s && s.result !== undefined && s.result !== null && s.postedAt)
        .sort((a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime())
      
      sortedSignals.forEach(signal => {
        const result = safeGetSignalResult(signal)
        if (result > 0) {
          currentWinStreak++
          currentLossStreak = 0
          if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak
        } else if (result < 0) {
          currentLossStreak++
          currentWinStreak = 0
          if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak
        }
      })
    } else {
      if (!trades || trades.length === 0) return { maxWinStreak: 0, maxLossStreak: 0 }
      const sortedTrades = [...trades]
        .filter(t => t && t.closeTime && t.profit !== undefined)
        .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())
      
      sortedTrades.forEach(trade => {
        if (trade.profit > 0) {
          currentWinStreak++
          currentLossStreak = 0
          if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak
        } else if (trade.profit < 0) {
          currentLossStreak++
          currentWinStreak = 0
          if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak
        }
      })
    }
    
    return { maxWinStreak, maxLossStreak }
  } catch (error) {
    console.error('Error calculating streaks:', error)
    return { maxWinStreak: 0, maxLossStreak: 0 }
  }
}

const calculateBestWorstDay = (dataSource: 'signals' | 'mt5', signals: Signal[], trades: MT5TradeHistory[]) => {
  try {
    const dailyResults = new Map<string, number>()
    
    if (dataSource === 'signals') {
      if (!signals || signals.length === 0) return { bestDay: 0, bestDate: '-', worstDay: 0, worstDate: '-' }
      signals
        .filter(s => s && s.result !== undefined && s.result !== null && s.postedAt)
        .forEach(signal => {
          const date = new Date(signal.postedAt).toISOString().split('T')[0]
          const current = dailyResults.get(date) || 0
          dailyResults.set(date, current + safeGetSignalResult(signal))
        })
    } else {
      if (!trades || trades.length === 0) return { bestDay: 0, bestDate: '-', worstDay: 0, worstDate: '-' }
      trades
        .filter(t => t && t.closeTime && t.pips !== undefined)
        .forEach(trade => {
          const date = new Date(trade.closeTime).toISOString().split('T')[0]
          const current = dailyResults.get(date) || 0
          dailyResults.set(date, current + trade.pips)
        })
    }
    
    if (dailyResults.size === 0) return { bestDay: 0, bestDate: '-', worstDay: 0, worstDate: '-' }
    
    let bestDay = -Infinity
    let worstDay = Infinity
    let bestDate = ''
    let worstDate = ''
    
    dailyResults.forEach((pips, date) => {
      if (pips > bestDay) {
        bestDay = pips
        bestDate = date
      }
      if (pips < worstDay) {
        worstDay = pips
        worstDate = date
      }
    })
    
    return { 
      bestDay, 
      bestDate: new Date(bestDate).toLocaleDateString(), 
      worstDay, 
      worstDate: new Date(worstDate).toLocaleDateString() 
    }
  } catch (error) {
    console.error('Error calculating best/worst day:', error)
    return { bestDay: 0, bestDate: '-', worstDay: 0, worstDate: '-' }
  }
}

// NEW: MT5 Trade Card (doesn't affect SignalCard)
const MT5TradeCard = ({ trade, index }: { trade: MT5TradeHistory; index: number }) => {
  const getStatusColor = (profit: number) => {
    if (profit > 0) return 'bg-green-600 text-white'
    if (profit < 0) return 'bg-red-600 text-white'
    return 'bg-yellow-600 text-white'
  }

  const getStatusText = (profit: number) => {
    if (profit > 0) return 'WIN'
    if (profit < 0) return 'LOSS'
    return 'BE'
  }

  return (
    <div className="relative h-full">
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="outline" className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
          #{index + 1}
        </Badge>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <Badge className={getStatusColor(trade.profit)}>
          {getStatusText(trade.profit)}
        </Badge>
      </div>
      <CardContent className="pt-16 pb-8">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-3xl font-bold">{trade.symbol}</h3>
            <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'} className="mt-2">
              {trade.type}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Entry</p>
              <p className="text-lg font-bold">{trade.openPrice.toFixed(5)}</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Exit</p>
              <p className="text-lg font-bold">{trade.closePrice.toFixed(5)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Pips</p>
              <p className={`text-xl font-bold ${trade.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trade.pips.toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">R:R</p>
              <p className="text-xl font-bold">
                {trade.riskReward ? `${trade.riskReward.toFixed(1)}:1` : '-'}
              </p>
            </div>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {new Date(trade.closeTime).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </div>
  )
}

interface DayData {
  date: string
  pips: number
  signals: number
  signalsList: Signal[]
}

interface CalendarDay {
  date: number
  pips: number
  signals: number
  isToday: boolean
  hasData: boolean
}

// CRITICAL: VIP Results Page - Pips Calculation
// DO NOT modify pips calculations without testing VIP results page
// This page displays total pips, monthly returns, and performance metrics
// All pips calculations use safeGetSignalResult() utility for data integrity
export default function VipResultsPage() {
  const [stats, setStats] = useState<SignalStats | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [promotionalContent, setPromotionalContent] = useState<{
    hero: PromotionalContent | null
    cta: PromotionalContent | null
  }>({ hero: null, cta: null })
  
  // Slideshow state for Recent Winning Trades
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const slideshowRef = useRef<NodeJS.Timeout | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  // MT5-only mode (signals removed)
  const dataSource = 'mt5' // Always MT5
  const [mt5Stats, setMt5Stats] = useState<any>(null)
  const [mt5Trades, setMt5Trades] = useState<MT5TradeHistory[]>([])
  const [mt5Loading, setMt5Loading] = useState(false)
  
  // Trade history modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // CRITICAL: Calculate monthly return for VIP results
  // DO NOT modify without testing VIP results page
  // Used in: Monthly Return stat card and hero section
  const calculateMonthlyReturn = (signals: Signal[]): number => {
    try {
      if (!signals || signals.length === 0) return 0
      
      // Calculate total pips from completed signals using safe utility
      const totalPips = signals
        .filter(signal => signal && signal.result !== undefined && signal.result !== null)
        .reduce((sum, signal) => sum + safeGetSignalResult(signal), 0)
      
      console.log('VIP Results: Monthly return calculation:', { 
        totalSignals: signals.length, 
        completedSignals: signals.filter(s => s && s.result !== undefined && s.result !== null).length,
        totalPips 
      })
      
      return totalPips
    } catch (error) {
      console.error('Error calculating monthly return:', error)
      return 0
    }
  }

  const calculateWinStreak = (signals: Signal[]): { type: 'signals', count: number } => {
    try {
      if (!signals || signals.length === 0) return { type: 'signals', count: 0 }
      
      // Sort by date (most recent first)
      const sortedSignals = signals
        .filter(s => s && s.postedAt)
        .sort((a, b) => {
          const dateA = new Date(a.postedAt).getTime()
          const dateB = new Date(b.postedAt).getTime()
          return dateB - dateA
        })
      
      let streak = 0
      for (const signal of sortedSignals) {
        if (signal && (signal.result || 0) > 0) {
          streak++
        } else {
          break
        }
      }
      
      return { type: 'signals', count: streak }
    } catch (error) {
      console.error('Error calculating win streak:', error)
      return { type: 'signals', count: 0 }
    }
  }

  // CRITICAL: Calculate daily pips for VIP results calendar
  // DO NOT modify without testing VIP results page
  // Used in: Performance calendar day cards
  const calculateDailyPips = (signals: Signal[]): number => {
    return signals
      .filter(signal => signal && signal.result !== undefined && signal.result !== null)
      .reduce((sum, signal) => sum + safeGetSignalResult(signal), 0)
  }

  // Removed profile loading - VIP Results now shows signals only

  // Load promotional content
  const loadPromotionalContent = async () => {
    try {
      const [heroContent, ctaContent] = await Promise.all([
        PromotionalContentService.getPromotionalContent('hero-card'),
        PromotionalContentService.getPromotionalContent('cta-card')
      ])
      
      setPromotionalContent({
        hero: heroContent,
        cta: ctaContent
      })
      
      console.log('Promotional content loaded:', { hero: !!heroContent, cta: !!ctaContent })
    } catch (error) {
      console.error('Error loading promotional content:', error)
    }
  }

  // Handle manual refresh (MT5-only)
  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshMT5Data()
    setRefreshing(false)
  }

  const getTopWinningSignals = (signals: Signal[], limit: number = 10): Signal[] => {
    try {
      if (!signals || signals.length === 0) return []
      return signals
        .filter(s => s && (s.result || 0) > 0)
        .sort((a, b) => (b.result || 0) - (a.result || 0))
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting top winning signals:', error)
      return []
    }
  }

  // NEW: Get top winning MT5 trades (doesn't modify getTopWinningSignals)
  const getTopWinningTrades = (trades: MT5TradeHistory[], limit: number = 10): MT5TradeHistory[] => {
    try {
      if (!trades || trades.length === 0) return []
      return trades
        .filter(t => t && t.profit > 0)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting top winning trades:', error)
      return []
    }
  }

  // CRITICAL: Calculate this week's pips for VIP results
  // DO NOT modify without testing VIP results page
  // Used in: This Week's Pips stat card
  const calculateThisWeekPips = (signals: Signal[]): number => {
    try {
      if (!signals || signals.length === 0) return 0
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      return signals
        .filter(signal => {
          if (!signal || !signal.postedAt) return false
          const signalDate = new Date(signal.postedAt)
          return !isNaN(signalDate.getTime()) && signalDate >= oneWeekAgo
        })
        .reduce((sum, signal) => sum + safeGetSignalResult(signal), 0)
    } catch (error) {
      console.error('Error calculating this week pips:', error)
      return 0
    }
  }

  const getSignalsForSelectedMonth = (signals: Signal[], month: number, year: number): Signal[] => {
    try {
      return signals.filter(signal => {
        if (!signal || !signal.postedAt) return false
        const signalDate = new Date(signal.postedAt)
        return !isNaN(signalDate.getTime()) && signalDate.getMonth() === month && signalDate.getFullYear() === year
      })
    } catch (error) {
      console.error('Error filtering signals by month:', error)
      return []
    }
  }

  // Slideshow functions
  const getSlideshowItems = (signals: Signal[]) => {
    const itemsPerSlide = {
      mobile: 1,
      tablet: 2,
      desktop: 3
    }
    return {
      mobile: Math.ceil(signals.length / itemsPerSlide.mobile),
      tablet: Math.ceil(signals.length / itemsPerSlide.tablet),
      desktop: Math.ceil(signals.length / itemsPerSlide.desktop)
    }
  }

  const nextSlide = () => {
    const topWinningSignals = getTopWinningSignals(signals, 6)
    const slideshowItems = getSlideshowItems(topWinningSignals)
    const maxSlides = Math.max(slideshowItems.mobile, slideshowItems.tablet, slideshowItems.desktop)
    setCurrentSlide((prev) => (prev + 1) % maxSlides)
  }

  const prevSlide = () => {
    const topWinningSignals = getTopWinningSignals(signals, 6)
    const slideshowItems = getSlideshowItems(topWinningSignals)
    const maxSlides = Math.max(slideshowItems.mobile, slideshowItems.tablet, slideshowItems.desktop)
    setCurrentSlide((prev) => (prev - 1 + maxSlides) % maxSlides)
  }

  const goToSlide = (slideIndex: number) => {
    setCurrentSlide(slideIndex)
  }

  // NEW: Dynamic slide navigation (works for both signals and MT5)
  const nextSlideAuto = () => {
    const items = dataSource === 'mt5' ? topWinningTrades : topWinningSignals
    const maxSlides = Math.ceil(items.length / 3)
    setCurrentSlide((prev) => (prev + 1) % (maxSlides || 1))
  }

  const prevSlideAuto = () => {
    const items = dataSource === 'mt5' ? topWinningTrades : topWinningSignals
    const maxSlides = Math.ceil(items.length / 3)
    setCurrentSlide((prev) => (prev - 1 + maxSlides) % (maxSlides || 1))
  }

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying)
    setIsPaused(false)
  }

  const pauseSlideshow = () => {
    setIsPaused(true)
    if (slideshowRef.current) {
      clearTimeout(slideshowRef.current)
      slideshowRef.current = null
    }
  }

  const resumeSlideshow = () => {
    setIsPaused(false)
  }

  // Touch event handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextSlideAuto()
    } else if (isRightSwipe) {
      prevSlideAuto()
    }
  }

  // Old unused function - kept for reference but renamed to avoid conflict
  const calculateDrawdownPercentage = (signals: Signal[], startingBalance: number): {
    maxDrawdown: number,
    currentDrawdown: number,
    dailyDrawdowns: Record<string, number>
  } => {
    try {
      if (!signals || signals.length === 0 || !startingBalance || startingBalance === 0) {
        return { maxDrawdown: 0, currentDrawdown: 0, dailyDrawdowns: {} }
      }
      
      let peak = startingBalance
      let maxDrawdown = 0
      let currentBalance = startingBalance
      const dailyDrawdowns: Record<string, number> = {}
      
      // Sort signals by date
      const sortedSignals = signals
        .filter(s => s && s.postedAt)
        .sort((a, b) => {
          const dateA = new Date(a.postedAt).getTime()
          const dateB = new Date(b.postedAt).getTime()
          return dateA - dateB
        })
      
      sortedSignals.forEach(signal => {
        if (signal) {
          currentBalance += (signal.result || 0)
          
          // Track peak
          if (currentBalance > peak) {
            peak = currentBalance
          }
          
          // Calculate drawdown from peak
          const drawdown = ((peak - currentBalance) / peak) * 100
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown
          }
          
          // Store daily drawdown
          const dateKey = new Date(signal.postedAt).toDateString()
          dailyDrawdowns[dateKey] = drawdown
        }
      })
      
      return {
        maxDrawdown,
        currentDrawdown: ((peak - currentBalance) / peak) * 100,
        dailyDrawdowns
      }
    } catch (error) {
      // Silent error - this function is not currently used
      return { maxDrawdown: 0, currentDrawdown: 0, dailyDrawdowns: {} }
    }
  }

  const groupSignalsByDay = (signals: Signal[]): Record<string, DayData> => {
    try {
      if (!signals || signals.length === 0) {
        console.log('No signals to group by day')
        return {}
      }
      
      console.log('Grouping', signals.length, 'signals by day')
      const days: Record<string, DayData> = {}
      
      signals.forEach((signal, index) => {
        if (signal && signal.postedAt) {
          const dateKey = new Date(signal.postedAt).toDateString()
          
          if (!days[dateKey]) {
            days[dateKey] = {
              date: dateKey,
              pips: 0,
              signals: 0,
              signalsList: []
            }
          }
          
          days[dateKey].pips += safeGetSignalResult(signal)
          days[dateKey].signals++
          days[dateKey].signalsList.push(signal)
          
        }
      })
      
      console.log('Grouped signals result:', Object.keys(days).length, 'days with data')
      return days
    } catch (error) {
      console.error('Error grouping signals by day:', error)
      return {}
    }
  }

  const generateCalendarDays = (month: number, year: number, signals: Signal[]): CalendarDay[] => {
    try {
      console.log('Generating calendar days for:', month, year, 'with', signals.length, 'signals')
      // Always generate calendar days, even if no signals
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days: CalendarDay[] = []
      const today = new Date()
      const dailySignals = groupSignalsByDay(signals)
      console.log('Daily signals grouped:', Object.keys(dailySignals).length, 'days with data')
      
      for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + i)
        
        const dateKey = currentDate.toDateString()
        const dayData = dailySignals[dateKey]
        const isToday = currentDate.toDateString() === today.toDateString()
        
        days.push({
          date: currentDate.getDate(),
          pips: dayData?.pips || 0,
          signals: dayData?.signals || 0,
          isToday,
          hasData: !!dayData
        })
      }
      
      return days
    } catch (error) {
      console.error('Error generating calendar days:', error)
      return []
    }
  }

  // NEW: Generate calendar days from MT5 trades (doesn't modify generateCalendarDays)
  const generateCalendarDaysFromTrades = (month: number, year: number, trades: MT5TradeHistory[]): CalendarDay[] => {
    try {
      console.log('Generating calendar days from MT5 trades for:', month, year, 'with', trades.length, 'trades')
      
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days: CalendarDay[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Group trades by day
      const tradesByDay = new Map<string, MT5TradeHistory[]>()
      trades.forEach(trade => {
        const tradeDate = new Date(trade.closeTime)
        if (tradeDate.getMonth() === month && tradeDate.getFullYear() === year) {
          const dayKey = tradeDate.getDate().toString()
          if (!tradesByDay.has(dayKey)) {
            tradesByDay.set(dayKey, [])
          }
          tradesByDay.get(dayKey)!.push(trade)
        }
      })
      
      // Generate calendar days (42 days = 6 weeks)
      for (let i = 0; i < 42; i++) {
        const current = new Date(startDate)
        current.setDate(startDate.getDate() + i)
        
        const dayNumber = current.getDate()
        const dayKey = dayNumber.toString()
        const dayTrades = current.getMonth() === month ? (tradesByDay.get(dayKey) || []) : []
        
        // Calculate total pips for the day
        const dayPips = dayTrades.reduce((sum, trade) => sum + trade.pips, 0)
        const tradeCount = dayTrades.length
        
        const isCurrentMonth = current.getMonth() === month
        const isToday = current.toDateString() === today.toDateString()
        const hasData = isCurrentMonth && tradeCount > 0
        
        days.push({
          date: dayNumber,
          pips: Math.round(dayPips * 10) / 10,
          signals: tradeCount,  // Using 'signals' property for count compatibility
          isToday,
          hasData
        })
      }
      
      return days
    } catch (error) {
      console.error('Error generating calendar from trades:', error)
      return []
    }
  }

  // DayCard component with enhanced hover effects and responsiveness
  const DayCard = ({ day, onClick }: { day: CalendarDay; onClick?: (day: CalendarDay) => void }) => {
    const hasData = day.hasData
    const isProfitable = day.pips > 0
    
    const handleClick = (e: React.MouseEvent) => {
      console.log('🔵 DayCard onClick triggered:', { 
        hasData, 
        onClick: !!onClick, 
        dayDate: day.date,
        dayPips: day.pips,
        daySignals: day.signals,
        dayHasData: day.hasData
      })
      if (hasData && onClick) {
        console.log('🟢 Calling onClick with day:', day)
        onClick(day)
      } else {
        console.log('🔴 NOT calling onClick - hasData:', hasData, 'onClick exists:', !!onClick)
      }
    }
    
    const handleMouseDown = (e: React.MouseEvent) => {
      console.log('🟣 MouseDown on DayCard:', day.date, 'hasData:', hasData)
      // Don't prevent default - let the click event fire
    }
    
    const handleMouseUp = (e: React.MouseEvent) => {
      console.log('🟠 MouseUp on DayCard:', day.date, 'hasData:', hasData)
      // Trigger the action on mouseUp as a fallback
      if (hasData && onClick) {
        console.log('🟢 Triggering onClick from MouseUp')
        onClick(day)
      }
    }
    
    return (
      <div 
        className={cn(
          "group relative p-2 sm:p-3 rounded-lg border min-h-[60px] sm:min-h-[80px] flex flex-col justify-between",
          "transition-all duration-300 ease-in-out",
          hasData && onClick && "cursor-pointer",
          !hasData && "cursor-default",
          "hover:scale-105 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10",
          "hover:z-10 transform-gpu",
          day.isToday && "border-blue-500 border-2 ring-2 ring-blue-200 dark:ring-blue-800",
          !hasData && "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800",
          hasData && isProfitable && "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
          hasData && !isProfitable && "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
        )}
        title={hasData ? `${day.date}: ${day.pips > 0 ? '+' : ''}${Math.round(day.pips || 0)} pips, ${day.signals} signal${day.signals !== 1 ? 's' : ''}` : `${day.date}: No signals`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{ position: 'relative', zIndex: hasData ? 10 : 1, userSelect: 'none' }}
      >
        {/* Date */}
        <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {day.date}
        </div>
        
        {/* Content */}
        {hasData ? (
          <div className="space-y-1">
            {/* Pips */}
            <div className={cn(
              "text-sm sm:text-lg font-bold transition-all duration-300",
              "group-hover:scale-110 transform-gpu",
              isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {day.pips > 0 ? '+' : ''}{Math.round(day.pips || 0)} pips
            </div>
            
            {/* Signal Count */}
            <div className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
              {day.signals} signal{day.signals !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors">
            No signals
          </div>
        )}
        
        {/* Hover Effect Overlay */}
        <div className={cn(
          "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-br from-white/20 to-transparent dark:from-white/10",
          "pointer-events-none"
        )} />
        
        {/* Today Indicator Enhancement */}
        {day.isToday && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    )
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/signal-stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      } else {
        console.error('Failed to fetch signal stats:', data.error)
        // Set default stats to prevent undefined errors
        setStats({
          totalSignals: 0,
          completedSignals: 0,
          activeSignals: 0,
          winningSignals: 0,
          losingSignals: 0,
          breakevenSignals: 0,
          totalPips: 0,
          winningPips: 0,
          losingPips: 0,
          averageWin: 0,
          averageLoss: 0,
          winRate: 0,
          bestSignal: 0,
          worstSignal: 0,
          currentWinStreak: 0,
          monthlyPips: 0,
          monthlyWinRate: 0,
          lastUpdated: new Date().toISOString(),
          syncMethod: 'signals' as const
        })
      }
    } catch (error) {
      console.error('Error fetching signal stats:', error)
      // Set default stats to prevent undefined errors
      setStats({
        totalSignals: 0,
        completedSignals: 0,
        activeSignals: 0,
        winningSignals: 0,
        losingSignals: 0,
        breakevenSignals: 0,
        totalPips: 0,
        winningPips: 0,
        losingPips: 0,
        averageWin: 0,
        averageLoss: 0,
        winRate: 0,
        bestSignal: 0,
        worstSignal: 0,
        currentWinStreak: 0,
        monthlyPips: 0,
        monthlyWinRate: 0,
        lastUpdated: new Date().toISOString(),
        syncMethod: 'signals' as const
      })
    }
  }

  const fetchSignals = async () => {
    try {
      const response = await fetch('/api/vip-signals')
      const data = await response.json()
      
      if (data.success) {
        setSignals(data.signals || [])
      } else {
        console.error('Failed to fetch VIP signals:', data.error)
        setSignals([])
      }
    } catch (error) {
      console.error('Error fetching signals:', error)
      setSignals([])
    }
  }

  // NEW: Fetch MT5 data (separate from signal functions)
  const fetchMT5Stats = async () => {
    try {
      const response = await fetch(`/api/vip-results?month=${selectedMonth}&year=${selectedYear}`)
      const data = await response.json()
      
      if (data.success) {
        setMt5Stats(data.stats)
        setMt5Trades(data.trades || [])
      } else {
        console.error('Failed to fetch MT5 stats:', data.error)
        setMt5Stats(null)
        setMt5Trades([])
      }
    } catch (error) {
      console.error('Error fetching MT5 stats:', error)
      setMt5Stats(null)
      setMt5Trades([])
    }
  }

  // NEW: Refresh MT5 data
  const refreshMT5Data = async () => {
    setMt5Loading(true)
    await fetchMT5Stats()
    setMt5Loading(false)
  }

  const refreshData = async () => {
    setRefreshing(true)
    await refreshMT5Data()
    setRefreshing(false)
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await loadPromotionalContent()
      // MT5-only mode - no signal fetching needed
      setLoading(false)
    }

    loadData()

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Load MT5 data on mount and when month/year changes
  useEffect(() => {
    fetchMT5Stats()
  }, [selectedMonth, selectedYear])

  // Auto-play slideshow effect with continuous progression
  useEffect(() => {
    if (isAutoPlaying && !isPaused) {
      setProgress(0)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            nextSlideAuto()
            return 0
          }
          return prev + 0.8 // Faster progression for more dynamic feel
        })
      }, 40) // Update every 40ms for smooth but faster progression
      
      slideshowRef.current = progressInterval
    } else {
      if (slideshowRef.current) {
        clearInterval(slideshowRef.current)
        slideshowRef.current = null
      }
    }

    return () => {
      if (slideshowRef.current) {
        clearInterval(slideshowRef.current)
        slideshowRef.current = null
      }
    }
  }, [isAutoPlaying, isPaused, signals])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        prevSlideAuto()
      } else if (event.key === 'ArrowRight') {
        nextSlideAuto()
      } else if (event.key === ' ') {
        event.preventDefault()
        toggleAutoPlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
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

  // Calculate performance metrics for Detailed Performance section
  const maxDrawdown = calculateDrawdown(dataSource, signals, mt5Trades || [])
  const avgDuration = calculateAvgDuration(dataSource, signals, mt5Trades || [])
  const streaks = calculateStreaks(dataSource, signals, mt5Trades || [])
  const bestWorstDay = calculateBestWorstDay(dataSource, signals, mt5Trades || [])

  // Calculate derived metrics safely
  const monthlyReturn = signals.length > 0 ? calculateMonthlyReturn(signals) : 0
  const winStreak = signals.length > 0 ? calculateWinStreak(signals) : { type: 'signals' as const, count: 0 }
  const thisWeekPips = signals.length > 0 ? calculateThisWeekPips(signals) : 0
  const topWinningSignals = signals.length > 0 ? getTopWinningSignals(signals, 10) : []
  
  // NEW: Calculate MT5 derived metrics (doesn't affect signal metrics)
  const topWinningTrades = mt5Trades.length > 0 ? getTopWinningTrades(mt5Trades, 10) : []
  
  // Calculate selected month trades for calendar stats
  const selectedMonthTrades = mt5Trades.filter(trade => {
    const tradeDate = new Date(trade.closeTime)
    return tradeDate.getMonth() === selectedMonth && tradeDate.getFullYear() === selectedYear
  })
  
  // Calendar generation (conditional based on data source)
  const calendarDays = dataSource === 'mt5' 
    ? generateCalendarDaysFromTrades(selectedMonth, selectedYear, mt5Trades)
    : generateCalendarDays(selectedMonth, selectedYear, signals)
  
  // Extract accountId from MT5 trades for modal
  const getAccountIdFromTrades = (): string => {
    if (mt5Trades.length > 0) {
      // Get unique accountIds from trades
      const uniqueAccountIds = [...new Set(mt5Trades.map(t => t.accountId).filter(Boolean))]
      if (uniqueAccountIds.length > 0) {
        return uniqueAccountIds[0] // Use first accountId found
      }
    }
    // If no accountId found, return empty string
    // The modal will show a warning, but we can still try to fetch trades
    return ''
  }
  
  // Handle day click to open trade history modal
  const handleDayClick = (day: CalendarDay, dayIndex: number) => {
    console.log('🟡 handleDayClick called:', { day, dayIndex, hasData: day.hasData, selectedMonth, selectedYear })
    
    if (!day.hasData) {
      console.log('🔴 Day has no data, returning')
      return
    }
    
    // Convert day index to full Date object
    // The calendar grid starts from the first day of the week containing the first day of the month
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // Calculate the actual date for this day in the calendar grid
    const actualDate = new Date(startDate)
    actualDate.setDate(startDate.getDate() + dayIndex)
    
    // Set time to start of day for consistent date matching
    actualDate.setHours(0, 0, 0, 0)
    
    console.log('Calculated date:', { 
      actualDate: actualDate.toISOString(), 
      selectedMonth, 
      selectedYear, 
      calculatedMonth: actualDate.getMonth(),
      calculatedYear: actualDate.getFullYear(),
      dayDate: day.date
    })
    
    // Only open modal if the date is in the selected month
    if (actualDate.getMonth() === selectedMonth && actualDate.getFullYear() === selectedYear) {
      console.log('Opening modal with date:', actualDate.toISOString())
      setSelectedDate(actualDate)
      setHistoryModalOpen(true)
    } else {
      console.log('Date not in selected month, not opening modal', {
        calculatedMonth: actualDate.getMonth(),
        selectedMonth,
        calculatedYear: actualDate.getFullYear(),
        selectedYear
      })
    }
  }
  
  // Calendar navigation
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
  
  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }
  
  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }
  
  const goToToday = () => {
    setSelectedMonth(new Date().getMonth())
    setSelectedYear(new Date().getFullYear())
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading VIP Results...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 md:px-6 py-6 w-full box-border">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-gold-500" />
          VIP Trading Results
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Transparent performance tracking for VIP signals
        </p>
      </div>

      {/* Hero Section */}
      {promotionalContent.hero && promotionalContent.hero.isActive && (
        <Card 
          className="mb-8 border-2 relative overflow-hidden" 
          style={{ 
            borderColor: promotionalContent.hero.borderColor || '#3b82f6',
            background: promotionalContent.hero.backgroundColor || 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
          }}
        >
          <CardDecorativeOrb />
          <CardContent className="p-8 text-center relative z-10" style={{ color: promotionalContent.hero.textColor || '#ffffff' }}>
            {promotionalContent.hero.urgencyText && (
              <div className="text-sm font-semibold mb-2 text-yellow-300 animate-pulse">
                {promotionalContent.hero.urgencyText}
              </div>
            )}
            <h1 className="text-4xl font-bold mb-2">{promotionalContent.hero.title}</h1>
            <p className="text-xl mb-4 opacity-90">{promotionalContent.hero.description}</p>
            
            {promotionalContent.hero.socialProof && (
              <div className="text-sm mb-4 opacity-90">
                {promotionalContent.hero.socialProof}
              </div>
            )}
            
            <div className="flex gap-4 items-center justify-center mb-6">
              {dataSource === 'mt5' ? (
                <>
                  <div className="text-3xl font-bold">
                    {mt5Stats?.totalPips ? (mt5Stats.totalPips > 0 ? '+' : '') + mt5Stats.totalPips.toFixed(1) : '0'} pips
                  </div>
                  <div className="text-sm opacity-90">Total MT5 Pips</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold">+{monthlyReturn.toFixed(1)} pips</div>
                  <div className="text-sm opacity-90">Average Monthly Return</div>
                </>
              )}
            </div>
            
            {promotionalContent.hero.discountCode && (
              <div className="mb-4">
                <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                  Use Code: {promotionalContent.hero.discountCode}
                </span>
              </div>
            )}
            
            <Button 
              size="lg" 
              variant="premium"
              className="hover:opacity-90 transition-opacity"
              onClick={() => {
                if (promotionalContent.hero.buttonUrl && promotionalContent.hero.buttonUrl !== '#') {
                  window.open(promotionalContent.hero.buttonUrl, '_blank')
                }
              }}
            >
              {promotionalContent.hero.buttonText}
            </Button>
            
            {promotionalContent.hero.guarantee && (
              <p className="text-xs opacity-80 mt-4">
                {promotionalContent.hero.guarantee}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Refresh Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* MT5 Live Trading - Always Active */}
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Zap className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">MT5 Live Trading</span>
          </div>
          
          {mt5Loading && (
            <Badge variant="secondary" className="text-sm">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Refreshing...
            </Badge>
          )}
        </div>
        <Button
          onClick={dataSource === 'mt5' ? refreshMT5Data : handleRefresh}
          disabled={dataSource === 'mt5' ? mt5Loading : refreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${(dataSource === 'mt5' ? mt5Loading : refreshing) ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Recent Winning Signals Section - Slideshow */}
      <Card className="mb-8">
        <CardDecorativeOrb />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            {dataSource === 'mt5' ? 'Recent Winning Trades' : 'Recent Winning Signals'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="success" className="animate-pulse">LIVE</Badge>
            <Badge className="bg-gold-500/20 text-gold-600 dark:text-gold-400 border-gold-500/30">
              <Star className="w-3 h-3 mr-1" />
              TOP PERFORMERS
            </Badge>
            {/* Slideshow Controls */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoPlay}
                className="h-8 w-8 p-0"
                title={isAutoPlaying ? "Pause slideshow" : "Play slideshow"}
              >
                {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={prevSlide}
                className="h-8 w-8 p-0"
                title="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextSlide}
                className="h-8 w-8 p-0"
                title="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {currentSlide + 1} / {Math.ceil((dataSource === 'mt5' ? topWinningTrades : topWinningSignals).length / 3)}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Slideshow Container */}
          <div 
            className="relative overflow-hidden group"
            onMouseEnter={pauseSlideshow}
            onMouseLeave={resumeSlideshow}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Progress Bar */}
            {isAutoPlaying && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-10">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-50 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {/* Mobile Slideshow (1 item per slide) */}
            <div className="md:hidden">
              <div 
                className="flex transition-transform duration-600 ease-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`
                }}
              >
                {dataSource === 'mt5' ? (
                  Array.from({ length: Math.ceil(topWinningTrades.length / 1) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-1 gap-4">
                        {topWinningTrades.slice(slideIndex * 1, (slideIndex + 1) * 1).map((trade, index) => (
                          <MT5TradeCard key={trade.id} trade={trade} index={slideIndex * 1 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: Math.ceil(topWinningSignals.length / 1) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-1 gap-4">
                        {topWinningSignals.slice(slideIndex * 1, (slideIndex + 1) * 1).map((signal, index) => (
                          <SignalCard key={signal.id} signal={signal} index={slideIndex * 1 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Tablet Slideshow (2 items per slide) */}
            <div className="hidden md:block lg:hidden">
              <div 
                className="flex transition-transform duration-600 ease-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`
                }}
              >
                {dataSource === 'mt5' ? (
                  Array.from({ length: Math.ceil(topWinningTrades.length / 2) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-2 gap-4">
                        {topWinningTrades.slice(slideIndex * 2, (slideIndex + 1) * 2).map((trade, index) => (
                          <MT5TradeCard key={trade.id} trade={trade} index={slideIndex * 2 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: Math.ceil(topWinningSignals.length / 2) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-2 gap-4">
                        {topWinningSignals.slice(slideIndex * 2, (slideIndex + 1) * 2).map((signal, index) => (
                          <SignalCard key={signal.id} signal={signal} index={slideIndex * 2 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Desktop Slideshow (3 items per slide) */}
            <div className="hidden lg:block">
              <div 
                className="flex transition-transform duration-600 ease-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`
                }}
              >
                {dataSource === 'mt5' ? (
                  Array.from({ length: Math.ceil(topWinningTrades.length / 3) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-3 gap-4">
                        {topWinningTrades.slice(slideIndex * 3, (slideIndex + 1) * 3).map((trade, index) => (
                          <MT5TradeCard key={trade.id} trade={trade} index={slideIndex * 3 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  Array.from({ length: Math.ceil(topWinningSignals.length / 3) }).map((_, slideIndex) => (
                    <div key={slideIndex} className="w-full flex-shrink-0">
                      <div className="grid grid-cols-3 gap-4">
                        {topWinningSignals.slice(slideIndex * 3, (slideIndex + 1) * 3).map((signal, index) => (
                          <SignalCard key={signal.id} signal={signal} index={slideIndex * 3 + index} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Slide Indicators */}
          <div className="flex justify-center mt-6 space-x-2">
            {/* Mobile indicators (1 item per slide) */}
            <div className="md:hidden">
              {Array.from({ length: Math.ceil((dataSource === 'mt5' ? topWinningTrades : topWinningSignals).length / 1) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300 mx-1",
                    currentSlide === index
                      ? "bg-green-500 w-8"
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  )}
                />
              ))}
            </div>
            
            {/* Tablet indicators (2 items per slide) */}
            <div className="hidden md:block lg:hidden">
              {Array.from({ length: Math.ceil((dataSource === 'mt5' ? topWinningTrades : topWinningSignals).length / 2) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300 mx-1",
                    currentSlide === index
                      ? "bg-green-500 w-8"
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  )}
                />
              ))}
            </div>
            
            {/* Desktop indicators (3 items per slide) */}
            <div className="hidden lg:block">
              {Array.from({ length: Math.ceil((dataSource === 'mt5' ? topWinningTrades : topWinningSignals).length / 3) }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300 mx-1",
                    currentSlide === index
                      ? "bg-green-500 w-8"
                      : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {dataSource === 'mt5' ? topWinningTrades.length : topWinningSignals.length}
                </div>
                <div className="text-xs text-gray-300">{dataSource === 'mt5' ? 'Winning Trades' : 'Winning Signals'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {dataSource === 'mt5' 
                    ? topWinningTrades.reduce((sum, trade) => sum + trade.pips, 0).toFixed(1)
                    : topWinningSignals.reduce((sum, signal) => sum + safeGetSignalResult(signal), 0)
                  }
                </div>
                <div className="text-xs text-gray-300">Total Pips</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {dataSource === 'mt5'
                    ? `${mt5Stats?.winningTrades || 0}W / ${mt5Stats?.losingTrades || 0}L`
                    : `${stats?.winningSignals || 0}W / ${stats?.losingSignals || 0}L`
                  }
                </div>
                <div className="text-xs text-gray-300">{dataSource === 'mt5' ? 'Win / Loss Trades' : 'Win / Loss Signals'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">
                  {dataSource === 'mt5'
                    ? `$${topWinningTrades[0]?.profit.toFixed(2) || 0}`
                    : `${topWinningSignals[0]?.result || 0}`
                  }
                </div>
                <div className="text-xs text-gray-300">{dataSource === 'mt5' ? 'Best Trade (Profit)' : 'Best Signal (Pips)'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dataSource === 'mt5' ? 'Total Pips' : 'Monthly Return'}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dataSource === 'mt5' 
                ? `${mt5Stats?.totalPips ? (mt5Stats.totalPips > 0 ? '+' : '') + mt5Stats.totalPips.toFixed(1) : '0'} pips`
                : `+${monthlyReturn.toFixed(1)} pips`
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {dataSource === 'mt5' ? 'From MT5 trades' : 'Average monthly gains'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Streak</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dataSource === 'mt5' ? (mt5Stats?.currentWinStreak || 0) : winStreak.count}
            </div>
            <p className="text-xs text-muted-foreground">
              Current {dataSource === 'mt5' ? 'trades' : winStreak.type} streak
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{dataSource === 'mt5' ? 'Avg R:R' : "This Week's Pips"}</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dataSource === 'mt5' ? (
              <>
                <div className={`text-2xl font-bold ${(mt5Stats?.averageRR || 0) >= 1 ? 'text-green-600' : 'text-orange-600'}`}>
                  {mt5Stats?.averageRR?.toFixed(1) || '0.0'}:1
                </div>
                <p className="text-xs text-muted-foreground">
                  Average risk/reward
                </p>
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${thisWeekPips > 0 ? 'text-green-600' : thisWeekPips < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {thisWeekPips > 0 ? '+' : ''}{thisWeekPips}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dataSource === 'mt5' 
                ? `${mt5Stats?.winRate?.toFixed(1) || '0'}%`
                : (stats ? formatPercentage(stats.winRate) : '0%')
              }
            </div>
            <p className="text-xs text-muted-foreground">
              of {dataSource === 'mt5' ? 'trades' : 'signals'} profitable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Calendar */}
      <Card className="mb-8">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="h-5 w-5 text-blue-500" />
            Performance Calendar
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={previousMonth}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-24 sm:w-32 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={month} value={index.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-20 sm:w-24 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToToday}
              className="hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all duration-200"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={nextMonth}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid - Responsive */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
            {/* Calendar Days */}
            {calendarDays.map((day, index) => (
              <DayCard key={index} day={day} onClick={(d) => handleDayClick(d, index)} />
            ))}
          </div>
          
          {/* Legend - Responsive with Hover Effects */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
              <div className="w-3 h-3 bg-green-500 rounded group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all duration-200"></div>
              <span className="group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Profit</span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
              <div className="w-3 h-3 bg-red-500 rounded group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-200"></div>
              <span className="group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Loss</span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
              <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded group-hover:shadow-lg group-hover:shadow-gray-500/30 transition-all duration-200"></div>
              <span className="group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">No Trades</span>
            </div>
            <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
              <div className="w-3 h-3 border-2 border-blue-500 rounded group-hover:shadow-lg group-hover:shadow-blue-500/30 group-hover:bg-blue-500 transition-all duration-200"></div>
              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{months[selectedMonth]} {selectedYear} Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {dataSource === 'mt5' ? (
            // MT5 Stats (PIPS ONLY - No dollars)
            (() => {
              const totalPips = selectedMonthTrades.reduce((sum, trade) => sum + trade.pips, 0)
              const winningTrades = selectedMonthTrades.filter(t => t.profit > 0).length
              const tradingDays = new Set(selectedMonthTrades.map(t => new Date(t.closeTime).toDateString())).size
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pips</div>
                    <div className={cn(
                      "text-2xl font-bold",
                      totalPips > 0 ? "text-green-600" : totalPips < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {totalPips > 0 ? '+' : ''}{totalPips.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Trading Days</div>
                    <div className="text-2xl font-bold">{tradingDays}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Trades</div>
                    <div className="text-2xl font-bold">{selectedMonthTrades.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedMonthTrades.length > 0 ? ((winningTrades / selectedMonthTrades.length) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            // Signals Stats (existing)
            (() => {
              const selectedMonthSignals = getSignalsForSelectedMonth(signals, selectedMonth, selectedYear)
              const selectedMonthDailySignals = groupSignalsByDay(selectedMonthSignals)
              const totalPips = selectedMonthSignals.reduce((sum, signal) => sum + safeGetSignalResult(signal), 0)
              const winningSignals = selectedMonthSignals.filter(signal => safeGetSignalResult(signal) > 0).length
              const losingSignals = selectedMonthSignals.filter(signal => safeGetSignalResult(signal) < 0).length
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Pips</div>
                    <div className={cn(
                      "text-2xl font-bold",
                      totalPips > 0 ? "text-green-600" : totalPips < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {totalPips > 0 ? '+' : ''}{totalPips}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Signal Days</div>
                    <div className="text-2xl font-bold">{Object.keys(selectedMonthDailySignals).length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Signals</div>
                    <div className="text-2xl font-bold">{selectedMonthSignals.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                    <div className="text-2xl font-bold text-green-600">
                      {selectedMonthSignals.length > 0 ? ((winningSignals / selectedMonthSignals.length) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              )
            })()
          )}
        </CardContent>
      </Card>

      {/* Bottom CTA Section */}
      {promotionalContent.cta && promotionalContent.cta.isActive && (
        <Card 
          className="mt-8 border-2 relative overflow-hidden" 
          style={{ 
            borderColor: promotionalContent.cta.borderColor || '#10b981',
            backgroundColor: promotionalContent.cta.backgroundColor || '#ffffff'
          }}
        >
          <CardDecorativeOrb />
          <CardContent className="p-8 text-center relative z-10" style={{ color: promotionalContent.cta.textColor || '#1f2937' }}>
            {promotionalContent.cta.urgencyText && (
              <div className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400 animate-pulse">
                {promotionalContent.cta.urgencyText}
              </div>
            )}
            <h2 className="text-2xl font-bold mb-4">
              {promotionalContent.cta.title}
            </h2>
            <p className="text-muted-foreground mb-6">
              {promotionalContent.cta.description}
            </p>
            
            {promotionalContent.cta.socialProof && (
              <div className="text-sm mb-4 text-muted-foreground">
                {promotionalContent.cta.socialProof}
              </div>
            )}
            
            {promotionalContent.cta.discountCode && (
              <div className="mb-4">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-bold">
                  Save with Code: {promotionalContent.cta.discountCode}
                </span>
              </div>
            )}
            
            <Button 
              size="lg" 
              variant="premium"
              className="hover:opacity-90 transition-opacity"
              onClick={() => {
                if (promotionalContent.cta.buttonUrl && promotionalContent.cta.buttonUrl !== '#') {
                  window.open(promotionalContent.cta.buttonUrl, '_blank')
                }
              }}
            >
              {promotionalContent.cta.buttonText}
            </Button>
            
            {promotionalContent.cta.guarantee && (
              <p className="text-xs text-muted-foreground mt-4">
                {promotionalContent.cta.guarantee}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Performance (Collapsible) */}
      <Tabs defaultValue="overview" className="space-y-6 mt-8">
        <TabsList>
          <TabsTrigger value="overview">Detailed Performance</TabsTrigger>
          <TabsTrigger value="trades">All Trades</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drawdown Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  Maximum Drawdown
                </CardTitle>
                <CardDescription>Largest peak-to-trough decline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400">
                      -{maxDrawdown.toFixed(1)} pips
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      The worst consecutive losing period
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recovery Status</span>
                      <span className="font-medium text-foreground">
                        {maxDrawdown === 0 ? 'No drawdown' : 'Monitoring'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Average Trade Duration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Avg Trade Duration
                </CardTitle>
                <CardDescription>Average time per trade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-foreground">
                      {avgDuration < 24 
                        ? `${avgDuration.toFixed(1)}h`
                        : `${(avgDuration / 24).toFixed(1)}d`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {dataSource === 'signals' 
                        ? 'Estimated signal lifetime'
                        : 'From open to close'
                      }
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trading Style</span>
                      <span className="font-medium text-foreground">
                        {avgDuration < 24 ? 'Intraday' : avgDuration < 168 ? 'Swing' : 'Position'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Win/Loss Streaks Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Win/Loss Streaks
                </CardTitle>
                <CardDescription>Consecutive winning and losing trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/50">
                      <p className="text-sm text-green-700 dark:text-green-300 mb-1">Max Win Streak</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {streaks.maxWinStreak}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800/50">
                      <p className="text-sm text-red-700 dark:text-red-300 mb-1">Max Loss Streak</p>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {streaks.maxLossStreak}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Streak</span>
                      <span className="font-medium text-foreground">
                        {(dataSource === 'mt5' ? mt5Stats?.currentWinStreak : stats?.currentWinStreak) || 0} wins
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Best/Worst Trading Day Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Best/Worst Day
                </CardTitle>
                <CardDescription>Highest and lowest performing days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/50">
                      <p className="text-xs text-green-700 dark:text-green-300 mb-1">Best Day</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        +{bestWorstDay.bestDay.toFixed(1)} pips
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {bestWorstDay.bestDate}
                      </p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800/50">
                      <p className="text-xs text-red-700 dark:text-red-300 mb-1">Worst Day</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {bestWorstDay.worstDay.toFixed(1)} pips
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {bestWorstDay.worstDate}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Trades</CardTitle>
              <CardDescription>Complete MT5 trade history for {months[selectedMonth]} {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              {mt5Loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading trades...</span>
                </div>
              ) : mt5Trades && mt5Trades.length > 0 ? (
                <div className="space-y-3">
                  {mt5Trades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={trade.profit >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                            {trade.profit >= 0 ? 'WIN' : 'LOSS'}
                          </Badge>
                          <Badge variant="outline" className={trade.type === 'BUY' ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}>
                            {trade.type}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{trade.symbol}</div>
                          <div className="text-sm text-muted-foreground">
                            Entry: {trade.openPrice.toFixed(5)} | Exit: {trade.closePrice.toFixed(5)}
                            {trade.stopLoss && ` | SL: ${trade.stopLoss.toFixed(5)}`}
                            {trade.takeProfit && ` | TP: ${trade.takeProfit.toFixed(5)}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Opened: {new Date(trade.openTime).toLocaleDateString()} {new Date(trade.openTime).toLocaleTimeString()}
                            {' | '}
                            Closed: {new Date(trade.closeTime).toLocaleDateString()} {new Date(trade.closeTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${trade.pips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trade.pips >= 0 ? '+' : ''}{trade.pips.toFixed(1)} pips
                        </div>
                        {trade.riskReward && (
                          <div className="text-sm text-muted-foreground">
                            R:R {trade.riskReward.toFixed(1)}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          ${trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trades found for {months[selectedMonth]} {selectedYear}</p>
                  <p className="text-sm mt-2">Start streaming to see live MT5 trades here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Win Rate</span>
                  <span className="font-medium">{stats ? formatPercentage(stats.winRate) : '0%'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Win</span>
                  <span className="font-medium text-green-600">
                    {stats ? formatCurrency(stats.averageWin) : '$0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Average Loss</span>
                  <span className="font-medium text-red-600">
                    {stats ? formatCurrency(stats.averageLoss) : '$0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Best Signal</span>
                  <span className="font-medium text-green-600">
                    {stats ? `${stats.bestSignal} pips` : '0 pips'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Worst Signal</span>
                  <span className="font-medium text-red-600">
                    {stats ? `${stats.worstSignal} pips` : '0 pips'}
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>

      {/* Transparency Note */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Transparency Note</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This data shows VIP signals sent by our trading team. 
                Updates occur automatically when new signals are posted. 
                All signals shown are real trading opportunities sent to our VIP members.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Trading History Modal */}
      {selectedDate && (
        <LiveTradingHistoryModal
          open={historyModalOpen}
          onOpenChange={(open) => {
            console.log('Modal onOpenChange:', open)
            setHistoryModalOpen(open)
            if (!open) {
              setSelectedDate(null)
            }
          }}
          date={selectedDate}
          masterAccountId={getAccountIdFromTrades()}
        />
      )}
    </div>
  )
}
