'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'
import { ProfileSelector } from '@/components/dashboard/profile-selector'
import { Trade } from '@/types/trade'
import { getTradesByProfile } from '@/lib/tradeService'
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
import { BarChart3, User } from 'lucide-react'

export default function AnalyticsPage() {
  const { user: authUser } = useAuth()
  const { currentProfile, userRole, isLoading: profileLoading } = useProfile()
  const router = useRouter()
  
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load trades from Firestore when profile changes
  useEffect(() => {
    const loadTrades = async () => {
      if (!currentProfile?.id) {
        console.log('Analytics: No profile selected, clearing trades')
        setTrades([])
        return
      }

      try {
        console.log(`Analytics: Loading trades for profile ${currentProfile.id}`)
        setTradesLoading(true)
        const profileTrades = await getTradesByProfile(currentProfile.id)
        console.log(`Analytics: Loaded ${profileTrades.length} trades for profile ${currentProfile.id}`)
        setTrades(profileTrades)
      } catch (error) {
        console.error('Analytics: Error loading trades from Firestore:', error)
        setTrades([])
      } finally {
        setTradesLoading(false)
        setIsInitialized(true)
      }
    }

    loadTrades()
  }, [currentProfile?.id])

  // Calculate analytics data using profile's starting balance
  const analyticsData = calculateAnalytics(trades, undefined, currentProfile?.startingBalance)

  // Loading state
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading trading profiles...</p>
        </div>
      </div>
    )
  }

  // No profile selected
  if (!currentProfile) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Profile Selected</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please select a trading profile to view analytics.
          </p>
          <ProfileSelector 
            onCreateProfile={() => {
              router.push('/dashboard/profiles')
            }}
            onManageProfiles={() => {
              router.push('/dashboard/profiles')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Analytics Management */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-red-500" />
                Analytics Management
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                Comprehensive trading performance analysis and insights
              </CardDescription>
            </div>
            
            {/* Profile Selector */}
            <div className="flex items-center space-x-4">
              <ProfileSelector 
                onCreateProfile={() => {
                  router.push('/dashboard/profiles')
                }}
                onManageProfiles={() => {
                  router.push('/dashboard/profiles')
                }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Content */}
      {tradesLoading ? (
        <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
          <CardContent className="text-center py-12">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Loading analytics...</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Please wait while we calculate your trading performance metrics.
            </p>
          </CardContent>
        </Card>
      ) : trades.length === 0 ? (
        <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
          <CardContent className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No trades found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Start adding trades to see comprehensive analytics and insights.
            </p>
            <Button
              onClick={() => router.push('/dashboard/trading-journal')}
              className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white"
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
            startingBalance={currentProfile?.startingBalance || 0}
          />
        </div>
      )}
    </div>
  )
}
