'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/ui/stats-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { AccountSelector } from '@/components/dashboard/account-selector'
import { getActiveAccount, getUserLinkedAccounts, LinkedAccount } from '@/lib/accountService'
import { Trade } from '@/types/trade'
import { getTradesByAccount } from '@/lib/tradeService'
import { getAccountClosedTrades } from '@/lib/accountClosedTradesService'
import { MT5TradeHistory } from '@/lib/mt5TradeHistoryService'
import { calculateAnalytics } from '@/lib/analyticsService'
import { BarChart3, User, TrendingUp, TrendingDown, Target, Percent, DollarSign, AlertTriangle, Shield, Award, Clock, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { BestTimeToTrade } from '@/components/analytics/BestTimeToTrade'
import { RiskManagement } from '@/components/analytics/RiskManagement'
import { OptimizationInsights } from '@/components/analytics/OptimizationInsights'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { subDays, subYears, startOfDay, endOfDay } from 'date-fns'

type DateRangeType = '7d' | '30d' | '90d' | '1y' | 'all' | 'custom'

export default function AnalyticsPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  const [activeAccount, setActiveAccount] = useState<LinkedAccount | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set())
  const [trades, setTrades] = useState<Trade[]>([])
  const [allTrades, setAllTrades] = useState<Trade[]>([]) // Store all trades for filtering
  const [tradesLoading, setTradesLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRangeType>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      if (!authUser?.uid) return
      try {
        setAccountsLoading(true)
        const accounts = await getUserLinkedAccounts(authUser.uid)
        setLinkedAccounts(accounts)
        const activeAccount = await getActiveAccount(authUser.uid)
        setActiveAccount(activeAccount)
        // Initially select active account or all accounts if only one
        if (activeAccount) {
          setSelectedAccountIds(new Set([activeAccount.id]))
        } else if (accounts.length > 0) {
          setSelectedAccountIds(new Set([accounts[0].id]))
        }
      } catch (error) {
        console.error('Error loading accounts:', error)
      } finally {
        setAccountsLoading(false)
      }
    }
    loadAccounts()
  }, [authUser?.uid])

  // Load trades from Firestore when selected accounts change
  useEffect(() => {
    const loadTrades = async () => {
      if (selectedAccountIds.size === 0 || !authUser?.uid) {
        console.log('Analytics: No accounts selected, clearing trades')
        setTrades([])
        setAllTrades([])
        return
      }

      try {
        console.log(`Analytics: Loading trades for ${selectedAccountIds.size} account(s)`)
        setTradesLoading(true)
        
        // Load trades from all selected accounts
        // Use getAccountClosedTrades to get trades from mt5_trade_history (same as closed trades page)
        const allAccountTrades: Trade[] = []
        
        // Helper function to convert MT5TradeHistory to Trade format
        const convertMT5ToTrade = (mt5Trade: MT5TradeHistory): Trade => {
          const closeDate = mt5Trade.closeTime instanceof Date ? mt5Trade.closeTime : new Date(mt5Trade.closeTime)
          const openDate = mt5Trade.openTime instanceof Date ? mt5Trade.openTime : new Date(mt5Trade.openTime)
          
          return {
            id: mt5Trade.id || mt5Trade.positionId,
            pair: mt5Trade.symbol,
            type: mt5Trade.type,
            status: 'CLOSED' as const,
            entryPrice: mt5Trade.openPrice,
            exitPrice: mt5Trade.closePrice,
            pips: mt5Trade.pips,
            profit: mt5Trade.profit,
            rr: mt5Trade.riskReward || 0,
            risk: 0, // Not available in MT5TradeHistory
            lotSize: mt5Trade.volume,
            result: mt5Trade.pips, // Use pips as result
            date: closeDate.toISOString().split('T')[0],
            time: closeDate.toTimeString().split(' ')[0],
            notes: '',
            source: 'MT5_VIP' as const,
            userId: mt5Trade.userId || authUser.uid,
            accountId: mt5Trade.accountId,
            stopLoss: mt5Trade.stopLoss,
            takeProfit: mt5Trade.takeProfit,
            mt5TicketId: mt5Trade.ticket,
            mt5Commission: mt5Trade.commission,
            mt5Swap: mt5Trade.swap,
            openTime: openDate,
            closeTime: closeDate,
            syncMethod: 'api' as const
          }
        }
        
        for (const accountLinkId of selectedAccountIds) {
          const account = linkedAccounts.find(acc => acc.id === accountLinkId)
          if (!account) continue

          try {
            // Use getAccountClosedTrades (same as closed trades page) - no limit, gets all trades
            const mt5Trades = await getAccountClosedTrades(authUser.uid, accountLinkId, {
              limitCount: 10000 // High limit to get all trades
            })
            
            // Convert MT5TradeHistory to Trade format
            const convertedTrades = mt5Trades.map(convertMT5ToTrade)
            allAccountTrades.push(...convertedTrades)
            
            console.log(`Analytics: Loaded ${mt5Trades.length} trades from account: ${account.accountName || accountLinkId}`)
          } catch (error) {
            console.error(`Analytics: Error loading trades for account ${accountLinkId}:`, error)
          }
        }

        console.log(`Analytics: Loaded ${allAccountTrades.length} total trades from ${selectedAccountIds.size} account(s)`)
        console.log(`Analytics: Trade IDs loaded:`, allAccountTrades.map(t => t.id).slice(0, 10), '... (showing first 10)')
        setAllTrades(allAccountTrades)
        // Apply date filter - will be handled by useEffect
        setTrades(allAccountTrades) // Initially show all trades
      } catch (error) {
        console.error('Analytics: Error loading trades from Firestore:', error)
        setAllTrades([])
        setTrades([])
      } finally {
        setTradesLoading(false)
        setIsInitialized(true)
      }
    }

    loadTrades()
  }, [selectedAccountIds, linkedAccounts, authUser?.uid])

  // Apply date filter function
  const applyDateFilter = useCallback((tradesToFilter: Trade[], range: DateRangeType, customStart: Date | null, customEnd: Date | null) => {
    let filtered = [...tradesToFilter]
    
    if (range === 'custom' && customStart && customEnd) {
      const start = startOfDay(customStart)
      const end = endOfDay(customEnd)
      filtered = tradesToFilter.filter(trade => {
        const tradeDate = new Date(trade.date)
        return tradeDate >= start && tradeDate <= end
      })
    } else if (range !== 'all') {
      let cutoffDate: Date
      switch (range) {
        case '7d':
          cutoffDate = subDays(new Date(), 7)
          break
        case '30d':
          cutoffDate = subDays(new Date(), 30)
          break
        case '90d':
          cutoffDate = subDays(new Date(), 90)
          break
        case '1y':
          cutoffDate = subYears(new Date(), 1)
          break
        default:
          cutoffDate = new Date(0) // Beginning of time
      }
      filtered = tradesToFilter.filter(trade => {
        const tradeDate = new Date(trade.date)
        return tradeDate >= cutoffDate
      })
    }
    
    setTrades(filtered)
  }, [])

  // Handle date range change
  const handleDateRangeChange = useCallback((range: DateRangeType) => {
    setDateRange(range)
    if (range === 'custom') {
      // Keep current custom dates if set
    } else {
      setStartDate(null)
      setEndDate(null)
    }
    applyDateFilter(allTrades, range, startDate, endDate)
  }, [allTrades, startDate, endDate, applyDateFilter])

  // Apply date filter when trades, date range, or custom dates change
  useEffect(() => {
    if (allTrades.length > 0) {
      applyDateFilter(allTrades, dateRange, startDate, endDate)
    }
  }, [allTrades, dateRange, startDate, endDate, applyDateFilter])

  // Loading state
  if (accountsLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading accounts...</p>
        </div>
      </div>
    )
  }

  // No accounts linked
  if (linkedAccounts.length === 0 && !accountsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card variant="glass">
          <CardDecorativeOrb color="blue" />
          <CardContent className="relative z-10 text-center py-12">
            <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Account Linked</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please link an account to view analytics.
            </p>
            <AccountSelector 
              onAccountLinked={async () => {
                const account = await getActiveAccount(authUser?.uid || '')
                setActiveAccount(account)
              }}
              onAccountChanged={(accountLinkId) => {
                // Reload trades when account changes
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate analytics data using ALL trades (not filtered by date range)
  // This ensures analytics show complete data from all selected accounts
  const analyticsData = calculateAnalytics(allTrades, undefined, undefined)

  // Calendar interfaces and functions
  interface CalendarDay {
    date: number
    profit: number
    trades: number
    isToday: boolean
    hasData: boolean
  }

  // Generate calendar days from trades
  // IMPORTANT: This function is completely independent of date range filters
  // It only filters by the selected month/year (calendar's own navigation)
  // Uses ALL trades from selected accounts, ignoring any date range filters
  const generateCalendarDays = (month: number, year: number, trades: Trade[]): CalendarDay[] => {
    try {
      const firstDay = new Date(year, month, 1)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days: CalendarDay[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Group trades by day - ONLY filter by calendar's month/year (not date range filters)
      // This is the ONLY filter applied to the calendar - month/year navigation
      const tradesByDay = new Map<string, Trade[]>()
      trades.forEach(trade => {
        if (!trade.date) return
        const tradeDate = new Date(trade.date)
        // Only filter by the selected month/year - ignore all other filters
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
        
        // Calculate total profit for the day
        const dayProfit = dayTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0)
        const tradeCount = dayTrades.length
        
        const isCurrentMonth = current.getMonth() === month
        const isToday = current.toDateString() === today.toDateString()
        const hasData = isCurrentMonth && tradeCount > 0
        
        days.push({
          date: dayNumber,
          profit: Math.round(dayProfit * 100) / 100,
          trades: tradeCount,
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

  // Handle day click to open trade history modal
  const handleDayClick = (day: CalendarDay, dayIndex: number) => {
    if (!day.hasData) {
      return
    }
    
    // Convert day index to full Date object
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // Calculate the actual date for this day in the calendar grid
    const actualDate = new Date(startDate)
    actualDate.setDate(startDate.getDate() + dayIndex)
    
    // Set time to start of day for consistent date matching
    actualDate.setHours(0, 0, 0, 0)
    
    // Only open modal if the date is in the selected month
    if (actualDate.getMonth() === selectedMonth && actualDate.getFullYear() === selectedYear) {
      setSelectedDate(actualDate)
      setHistoryModalOpen(true)
    }
  }

  // Get trades for selected date - use allTrades to show all trades regardless of date range filter
  const getTradesForDate = (date: Date): Trade[] => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return allTrades.filter(trade => {
      if (!trade.date) return false
      const tradeDate = new Date(trade.date)
      const tradeDateStr = tradeDate.toISOString().split('T')[0]
      return tradeDateStr === dateStr
    })
  }

  // Calculate drawdown for a specific date (based on all trades up to that date)
  const calculateDrawdownForDate = (date: Date): { drawdown: number; drawdownPercent: number; peak: number; currentEquity: number } => {
    if (!date) return { drawdown: 0, drawdownPercent: 0, peak: 0, currentEquity: 0 }
    
    try {
      // Get all trades up to and including the selected date, sorted chronologically
      // Use allTrades to calculate drawdown based on all trades, not just filtered ones
      const dateStr = date.toISOString().split('T')[0]
      const tradesUpToDate = allTrades
        .filter(trade => {
          if (!trade.date) return false
          const tradeDate = new Date(trade.date)
          const tradeDateStr = tradeDate.toISOString().split('T')[0]
          return tradeDateStr <= dateStr
        })
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          if (dateA !== dateB) return dateA - dateB
          // If same date, sort by time if available
          if (a.time && b.time) {
            return a.time.localeCompare(b.time)
          }
          return 0
        })

      if (tradesUpToDate.length === 0) {
        return { drawdown: 0, drawdownPercent: 0, peak: 0, currentEquity: 0 }
      }

      let peak = 0
      let maxDrawdown = 0
      let currentEquity = 0
      let maxDrawdownPercent = 0

      tradesUpToDate.forEach(trade => {
        currentEquity += (trade.profit || 0)
        
        // Track peak equity
        if (currentEquity > peak) {
          peak = currentEquity
        }
        
        // Calculate drawdown from peak
        const drawdown = peak - currentEquity
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
        
        // Calculate drawdown percentage
        if (peak > 0) {
          const drawdownPercent = (drawdown / peak) * 100
          if (drawdownPercent > maxDrawdownPercent) {
            maxDrawdownPercent = drawdownPercent
          }
        }
      })

      // Calculate current drawdown at the end of the selected date
      const currentDrawdown = peak > 0 ? peak - currentEquity : 0
      const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0

      return {
        drawdown: Math.round(currentDrawdown * 100) / 100,
        drawdownPercent: Math.round(currentDrawdownPercent * 100) / 100,
        peak: Math.round(peak * 100) / 100,
        currentEquity: Math.round(currentEquity * 100) / 100
      }
    } catch (error) {
      console.error('Error calculating drawdown for date:', error)
      return { drawdown: 0, drawdownPercent: 0, peak: 0, currentEquity: 0 }
    }
  }

  // DayCard component with click functionality
  const DayCard = ({ day, dayIndex, onClick }: { day: CalendarDay; dayIndex: number; onClick?: (day: CalendarDay, dayIndex: number) => void }) => {
    const hasData = day.hasData
    const isProfitable = day.profit > 0
    
    const handleClick = () => {
      if (hasData && onClick) {
        onClick(day, dayIndex)
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
        title={hasData ? `${day.date}: $${day.profit > 0 ? '+' : ''}${day.profit.toFixed(2)}, ${day.trades} trade${day.trades !== 1 ? 's' : ''}` : `${day.date}: No trades`}
        onClick={handleClick}
      >
        {/* Date */}
        <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {day.date}
        </div>
        
        {/* Content */}
        {hasData ? (
          <div className="space-y-1">
            {/* Profit */}
            <div className={cn(
              "text-sm sm:text-lg font-bold transition-all duration-300",
              "group-hover:scale-110 transform-gpu",
              isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              ${day.profit > 0 ? '+' : ''}{day.profit.toFixed(2)}
            </div>
            
            {/* Trade Count */}
            <div className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
              {day.trades} trade{day.trades !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors">
            No trades
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

  // Generate calendar days - COMPLETELY INDEPENDENT of date range filters
  // Only uses calendar's own month/year navigation (selectedMonth, selectedYear)
  // Uses allTrades which contains ALL trades from selected accounts, never filtered by date range
  const calendarDays = generateCalendarDays(selectedMonth, selectedYear, allTrades)

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full box-border">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-500" />
              Trading Analytics
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprehensive performance analysis and insights
              {selectedAccountIds.size > 0 && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                  • Analyzing {selectedAccountIds.size} account{selectedAccountIds.size > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={dateRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('7d')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('30d')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('90d')}
              >
                Last 90 Days
              </Button>
              <Button
                variant={dateRange === '1y' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('1y')}
              >
                Last Year
              </Button>
              <Button
                variant={dateRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('all')}
              >
                All Time
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateRangeChange('custom')}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Custom
              </Button>
            </div>
          </div>
        </div>
        
        {/* Account Selector (if multiple accounts) */}
        {linkedAccounts.length > 1 && (
          <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-blue-500/30 dark:border-blue-500/50">
            <CardContent className="pt-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Accounts to Analyze
                </label>
                <div className="flex flex-wrap gap-2">
                  {linkedAccounts.map(account => (
                    <Button
                      key={account.id}
                      variant={selectedAccountIds.has(account.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const newSet = new Set(selectedAccountIds)
                        if (newSet.has(account.id)) {
                          newSet.delete(account.id)
                        } else {
                          newSet.add(account.id)
                        }
                        setSelectedAccountIds(newSet)
                      }}
                    >
                      {account.accountName}
                      {selectedAccountIds.has(account.id) && (
                        <span className="ml-2">✓</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Custom Date Range Picker */}
      {dateRange === 'custom' && (
        <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-blue-500/30 dark:border-blue-500/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Start Date
                </label>
                <DateTimePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  showTimeSelect={false}
                  dateFormat="MMM dd, yyyy"
                  maxDate={endDate || new Date()}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  End Date
                </label>
                <DateTimePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  showTimeSelect={false}
                  dateFormat="MMM dd, yyyy"
                  minDate={startDate || undefined}
                  maxDate={new Date()}
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(null)
                    setEndDate(null)
                    handleDateRangeChange('all')
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Core Metrics - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Trades"
          value={analyticsData?.totalTrades || 0}
          trend={`${analyticsData?.buyTrades || 0} buys, ${analyticsData?.sellTrades || 0} sells`}
          icon={Target}
          decorativeColor="blue"
        />
        <StatsCard
          title="Net Profit"
          value={`$${(analyticsData?.netProfit || analyticsData?.totalPnL || 0).toFixed(2)}`}
          trend={(analyticsData?.netProfit || analyticsData?.totalPnL || 0) >= 0 ? '↑ Profitable' : '↓ Loss'}
          icon={DollarSign}
          decorativeColor={(analyticsData?.netProfit || analyticsData?.totalPnL || 0) >= 0 ? "green" : "phoenix"}
        />
        <StatsCard
          title="Win Rate"
          value={`${analyticsData?.winRate || 0}%`}
          trend={`${analyticsData?.totalWinners || 0} of ${analyticsData?.totalTrades || 0} trades`}
          icon={Percent}
          decorativeColor={(analyticsData?.winRate || 0) >= 50 ? "green" : "gold"}
        />
        <StatsCard
          title="Profit Factor"
          value={(analyticsData?.profitFactor || 0).toFixed(2)}
          trend={(analyticsData?.profitFactor || 0) >= 1.5 ? 'Excellent' : (analyticsData?.profitFactor || 0) >= 1 ? 'Good' : 'Needs work'}
          icon={TrendingUp}
          decorativeColor={(analyticsData?.profitFactor || 0) >= 1.5 ? "green" : (analyticsData?.profitFactor || 0) >= 1 ? "gold" : "phoenix"}
        />
      </div>

      {/* Risk Metrics - Second Row */}
      {analyticsData?.riskMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Max Drawdown"
            value={`${analyticsData.riskMetrics.maxDrawdownPercent.toFixed(2)}%`}
            trend={`$${analyticsData.riskMetrics.maxDrawdown.toFixed(2)}`}
            icon={TrendingDown}
            decorativeColor={analyticsData.riskMetrics.maxDrawdownPercent < 10 ? "green" : analyticsData.riskMetrics.maxDrawdownPercent < 20 ? "gold" : "phoenix"}
          />
          <StatsCard
            title="Recovery Factor"
            value={analyticsData.riskMetrics.recoveryFactor.toFixed(2)}
            trend={analyticsData.riskMetrics.recoveryFactor >= 3 ? 'Excellent' : analyticsData.riskMetrics.recoveryFactor >= 1.5 ? 'Good' : 'Needs improvement'}
            icon={Shield}
            decorativeColor={analyticsData.riskMetrics.recoveryFactor >= 3 ? "green" : analyticsData.riskMetrics.recoveryFactor >= 1.5 ? "blue" : "phoenix"}
          />
          <StatsCard
            title="Risk of Ruin"
            value={`${analyticsData.riskMetrics.riskOfRuin.toFixed(2)}%`}
            trend={analyticsData.riskMetrics.riskOfRuin < 5 ? 'Low' : analyticsData.riskMetrics.riskOfRuin < 15 ? 'Moderate' : 'High'}
            icon={AlertTriangle}
            decorativeColor={analyticsData.riskMetrics.riskOfRuin < 5 ? "green" : analyticsData.riskMetrics.riskOfRuin < 15 ? "gold" : "phoenix"}
          />
          <StatsCard
            title="Expectancy"
            value={`$${analyticsData.riskMetrics.expectancy.toFixed(2)}`}
            trend="Per trade"
            icon={Award}
            decorativeColor={analyticsData.riskMetrics.expectancy >= 0 ? "green" : "phoenix"}
          />
        </div>
      )}

      {/* Optimization Metrics - Third Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsData?.bestTimeAnalysis && analyticsData.bestTimeAnalysis.bestHours.length > 0 && (
          <StatsCard
            title="Best Trading Hour"
            value={analyticsData.bestTimeAnalysis.bestHours[0]}
            trend="Peak performance time"
            icon={Clock}
            decorativeColor="blue"
          />
        )}
        {analyticsData?.optimizationInsights && analyticsData.optimizationInsights.bestPairs.length > 0 && (
          <StatsCard
            title="Best Pair"
            value={analyticsData.optimizationInsights.bestPairs[0].symbol}
            trend={`${analyticsData.optimizationInsights.bestPairs[0].winRate.toFixed(1)}% WR`}
            icon={Target}
            decorativeColor="green"
          />
        )}
        {analyticsData?.optimizationInsights && analyticsData.optimizationInsights.bestDay.trades > 0 && (
          <StatsCard
            title="Best Day"
            value={analyticsData.optimizationInsights.bestDay.day}
            trend={`${analyticsData.optimizationInsights.bestDay.winRate.toFixed(1)}% WR`}
            icon={Award}
            decorativeColor="blue"
          />
        )}
        {analyticsData?.optimizationInsights && (
          <StatsCard
            title="Consistency"
            value={`${analyticsData.optimizationInsights.monthlyConsistency.toFixed(1)}%`}
            trend="Monthly performance"
            icon={TrendingUp}
            decorativeColor={analyticsData.optimizationInsights.monthlyConsistency >= 70 ? "green" : analyticsData.optimizationInsights.monthlyConsistency >= 40 ? "gold" : "phoenix"}
          />
        )}
      </div>

      {/* Analytics Content */}
      {tradesLoading ? (
        <Card variant="glass">
          <CardDecorativeOrb color="blue" />
          <CardContent className="relative z-10 text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading analytics...</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we calculate your trading performance metrics.
            </p>
          </CardContent>
        </Card>
      ) : trades.length === 0 ? (
        <Card variant="glass">
          <CardDecorativeOrb color="blue" />
          <CardContent className="relative z-10 text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No trades found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start adding trades to see comprehensive analytics and insights.
            </p>
            <Button
              onClick={() => router.push('/dashboard/trading-journal')}
              variant="premium"
            >
              Go to Trading Journal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
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
                  <DayCard key={index} day={day} dayIndex={index} onClick={handleDayClick} />
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

          {/* Best Time to Trade - New Feature */}
          <BestTimeToTrade data={analyticsData} />

          {/* Risk Management - New Feature */}
          <RiskManagement data={analyticsData} />

          {/* Performance Optimization - New Feature */}
          <OptimizationInsights data={analyticsData} />
        </div>
      )}

      {/* Trade History Modal for Selected Date */}
      {selectedDate && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Trading History - {selectedDate.toLocaleDateString()}
              </DialogTitle>
              <DialogDescription>
                View all trades for {selectedDate.toLocaleDateString()} from selected accounts
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {(() => {
                const dateTrades = getTradesForDate(selectedDate)
                const totalProfit = dateTrades.reduce((sum, t) => sum + (t.profit || 0), 0)
                const winningTrades = dateTrades.filter(t => (t.profit || 0) > 0).length
                const losingTrades = dateTrades.filter(t => (t.profit || 0) < 0).length
                const winRate = dateTrades.length > 0 ? (winningTrades / dateTrades.length) * 100 : 0
                const drawdownData = calculateDrawdownForDate(selectedDate)

                return (
                  <>
                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Profit</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-600">{winRate.toFixed(1)}%</div>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold">
                            {winningTrades}W / {losingTrades}L
                          </div>
                          <p className="text-xs text-muted-foreground">Win / Loss</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className={`text-2xl font-bold ${drawdownData.drawdown > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${drawdownData.drawdown >= 0 ? '' : '-'}${Math.abs(drawdownData.drawdown).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Drawdown {drawdownData.drawdownPercent > 0 ? `(${drawdownData.drawdownPercent.toFixed(2)}%)` : ''}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Trades Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>All Trades ({dateTrades.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dateTrades.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No trades found for {selectedDate.toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Time</th>
                                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Pair</th>
                                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Type</th>
                                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Entry</th>
                                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Exit</th>
                                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Pips</th>
                                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Profit</th>
                                  <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">R:R</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {dateTrades.map((trade) => (
                                  <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                                      {trade.time || new Date(trade.date).toLocaleTimeString()}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="font-medium text-gray-900 dark:text-gray-100">{trade.pair}</span>
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
                                      {trade.entryPrice?.toFixed(5) || '—'}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm font-mono">
                                      {trade.exitPrice?.toFixed(5) || '—'}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className={`font-semibold ${(trade.pips || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(trade.pips || 0) > 0 ? '+' : ''}{trade.pips?.toFixed(1) || '0.0'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className={`font-semibold ${(trade.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${(trade.profit || 0) >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm">
                                      {trade.rr ? `${trade.rr.toFixed(1)}:1` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
