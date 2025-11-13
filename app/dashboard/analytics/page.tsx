'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCard } from '@/components/ui/stats-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { AccountSelector } from '@/components/dashboard/account-selector'
import { getActiveAccount, LinkedAccount } from '@/lib/accountService'
import { Trade } from '@/types/trade'
import { getTradesByAccount } from '@/lib/tradeService'
import { calculateAnalytics } from '@/lib/analyticsService'
import { ProfitLossChart } from '@/components/analytics/ProfitLossChart'
import { WinnersLosersBreakdown } from '@/components/analytics/WinnersLosersBreakdown'
import { PerformanceBySide } from '@/components/analytics/PerformanceBySide'
import { PerformanceBySession } from '@/components/analytics/PerformanceBySession'
import { PerformanceByTime } from '@/components/analytics/PerformanceByTime'
import { PerformanceByDay } from '@/components/analytics/PerformanceByDay'
import { PerformanceByMonth } from '@/components/analytics/PerformanceByMonth'
import { PerformanceCalendar } from '@/components/analytics/PerformanceCalendar'
import { TradeFrequency } from '@/components/analytics/TradeFrequency'
import { WithdrawCalculator } from '@/components/analytics/WithdrawCalculator'
import { BarChart3, User, TrendingUp, Target, Percent, DollarSign } from 'lucide-react'

export default function AnalyticsPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  const [activeAccount, setActiveAccount] = useState<LinkedAccount | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(true)

  // Load active account
  useEffect(() => {
    const loadAccount = async () => {
      if (!authUser?.uid) return
      try {
        setAccountsLoading(true)
        const account = await getActiveAccount(authUser.uid)
        setActiveAccount(account)
      } catch (error) {
        console.error('Error loading active account:', error)
      } finally {
        setAccountsLoading(false)
      }
    }
    loadAccount()
  }, [authUser?.uid])

  // Load trades from Firestore when account changes
  useEffect(() => {
    const loadTrades = async () => {
      if (!activeAccount || !authUser?.uid) {
        console.log('Analytics: No account selected, clearing trades')
        setTrades([])
        return
      }

      // Get the actual MT5 account ID
      let accountId = activeAccount.mt5AccountId
      if (!accountId && activeAccount.copyTradingAccountId) {
        try {
          const { listUserCopyTradingAccounts } = await import('@/lib/copyTradingRepo')
          const { getMasterStrategy } = await import('@/lib/copyTradingRepo')
          const copyAccounts = await listUserCopyTradingAccounts(authUser.uid)
          const copyAccount = copyAccounts.find(acc => acc.accountId === activeAccount.copyTradingAccountId)
          if (copyAccount) {
            const masterStrategy = await getMasterStrategy(copyAccount.strategyId)
            accountId = masterStrategy?.accountId
          }
        } catch (error) {
          console.error('Error getting account ID for copy trading:', error)
        }
      }

      if (!accountId) {
        console.log('Analytics: No account ID found')
        setTrades([])
        return
      }

      try {
        console.log(`Analytics: Loading trades for account ${accountId}`)
        setTradesLoading(true)
        const accountTrades = await getTradesByAccount(authUser.uid, accountId)
        console.log(`Analytics: Loaded ${accountTrades.length} trades for account ${accountId}`)
        setTrades(accountTrades)
      } catch (error) {
        console.error('Analytics: Error loading trades from Firestore:', error)
        setTrades([])
      } finally {
        setTradesLoading(false)
        setIsInitialized(true)
      }
    }

    loadTrades()
  }, [activeAccount?.id, authUser?.uid])

  // Calculate analytics data (no starting balance needed for account-based system)
  const analyticsData = calculateAnalytics(trades, undefined, undefined)

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

  // No account linked
  if (!activeAccount) {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full box-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            Trading Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive performance analysis and insights
          </p>
        </div>
        
        {/* Account info shown in stats */}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Trades"
          value={analyticsData?.totalTrades || 0}
          trend={`${analyticsData?.totalLong || 0} longs, ${analyticsData?.totalShort || 0} shorts`}
          icon={Target}
          decorativeColor="blue"
        />
        <StatsCard
          title="Net Profit"
          value={`$${(analyticsData?.netProfit || 0).toFixed(2)}`}
          trend={(analyticsData?.netProfit || 0) >= 0 ? '↑ Profitable' : '↓ Loss'}
          icon={DollarSign}
          decorativeColor={(analyticsData?.netProfit || 0) >= 0 ? "green" : "phoenix"}
        />
        <StatsCard
          title="Win Rate"
          value={`${analyticsData?.winRate || 0}%`}
          trend={`${analyticsData?.winners || 0} of ${analyticsData?.totalTrades || 0} trades`}
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
          {/* Profit & Loss Chart */}
          <ProfitLossChart data={analyticsData} />

          {/* Winners and Losers Breakdown */}
          <WinnersLosersBreakdown data={analyticsData} />

          {/* Performance by Side */}
          <PerformanceBySide data={analyticsData} />

          {/* Performance by Session */}
          <PerformanceBySession data={analyticsData} />

          {/* Performance by Time and Day */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PerformanceByTime data={analyticsData} />
            <PerformanceByDay data={analyticsData} />
          </div>

          {/* Performance by Month */}
          <PerformanceByMonth data={analyticsData} />

          {/* Performance Calendar */}
          <PerformanceCalendar data={analyticsData} />

          {/* Trade Frequency */}
          <TradeFrequency data={analyticsData} />

          {/* Withdraw Calculator */}
          <WithdrawCalculator 
            data={analyticsData} 
            startingBalance={0}
          />
        </div>
      )}
    </div>
  )
}
