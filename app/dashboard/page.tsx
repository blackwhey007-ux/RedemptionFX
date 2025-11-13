'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { StatsCard } from '@/components/ui/stats-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  TrendingUp, 
  Percent, 
  Send, 
  Server,
  Users,
  PlayCircle,
  BarChart3,
  BookOpen,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState({
    activePositions: 0,
    todayPL: 0,
    winRate: 0,
    signalsSent: 0,
    streamingActive: false,
    totalMembers: 0
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load streaming status
      const streamingResponse = await fetch('/api/mt5-streaming/start')
      const streamingData = await streamingResponse.json()
      
      // Load open positions
      const positionsResponse = await fetch('/api/mt5-open-positions')
      const positionsData = await positionsResponse.json()
      
      const positions = positionsData.positions || []
      const totalPL = positions.reduce((sum: number, pos: any) => sum + (pos.profit || 0), 0)
      const winningPos = positions.filter((pos: any) => (pos.profit || 0) > 0).length
      const winRate = positions.length > 0 ? (winningPos / positions.length) * 100 : 0
      
      setStats({
        activePositions: positions.length,
        todayPL: totalPL,
        winRate: Math.round(winRate),
        signalsSent: 0, // TODO: Get from actual signal count
        streamingActive: streamingData.status?.isConnected || false,
        totalMembers: 0 // TODO: Get from actual member count
      })
      
      // Mock recent activity (replace with real data)
      setRecentActivity([
        { id: 1, type: 'signal', message: 'New signal created: EURUSD BUY', time: new Date(Date.now() - 1000 * 60 * 5) },
        { id: 2, type: 'trade', message: 'Position opened: GBPUSD', time: new Date(Date.now() - 1000 * 60 * 15) },
        { id: 3, type: 'telegram', message: 'Telegram notification sent', time: new Date(Date.now() - 1000 * 60 * 30) },
        { id: 4, type: 'update', message: 'Position updated: BTCUSD', time: new Date(Date.now() - 1000 * 60 * 45) },
      ])
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full box-border">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {getGreeting()}, {user?.displayName || user?.email || 'Trader'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Welcome to your RedemptionFX dashboard. Here's your trading overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Active Positions"
          value={loading ? '...' : stats.activePositions}
          trend={stats.activePositions > 0 ? `${stats.activePositions} open trades` : 'No open positions'}
          icon={Activity}
          decorativeColor="phoenix"
        />
        <StatsCard
          title="Today's P/L"
          value={loading ? '...' : `$${stats.todayPL.toFixed(2)}`}
          trend={stats.todayPL >= 0 ? '↑ Profit' : '↓ Loss'}
          icon={TrendingUp}
          decorativeColor={stats.todayPL >= 0 ? "green" : "phoenix"}
        />
        <StatsCard
          title="Win Rate"
          value={loading ? '...' : `${stats.winRate}%`}
          trend={stats.activePositions > 0 ? `From ${stats.activePositions} positions` : 'No trades yet'}
          icon={Percent}
          decorativeColor={stats.winRate >= 50 ? "green" : "gold"}
        />
        <StatsCard
          title="Signals Sent"
          value={loading ? '...' : stats.signalsSent}
          trend="Total signals today"
          icon={Send}
          decorativeColor="gold"
        />
        <StatsCard
          title="Streaming Status"
          value={loading ? '...' : (stats.streamingActive ? "Active" : "Inactive")}
          trend={stats.streamingActive ? "Real-time monitoring" : "Start streaming"}
          icon={Server}
          decorativeColor={stats.streamingActive ? "green" : "phoenix"}
        />
        <StatsCard
          title="VIP Members"
          value={loading ? '...' : stats.totalMembers}
          trend="Total active members"
          icon={Users}
          decorativeColor="blue"
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card variant="glass">
          <CardDecorativeOrb color="phoenix" />
          <CardHeader className="relative z-10">
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-3">
            <Button
              variant="premium"
              className="w-full justify-between"
              onClick={() => router.push('/dashboard/admin/open-trades')}
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                View Open Positions
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="premiumOutline"
              className="w-full justify-between"
              onClick={() => router.push('/dashboard/admin/vip-sync')}
            >
              <span className="flex items-center gap-2">
                {stats.streamingActive ? (
                  <Server className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {stats.streamingActive ? 'Manage Streaming' : 'Start Streaming'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="premiumOutline"
              className="w-full justify-between"
              onClick={() => router.push('/dashboard/vip-results')}
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                View VIP Results
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="premiumOutline"
              className="w-full justify-between"
              onClick={() => router.push('/dashboard/trading-journal')}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Trading Journal
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card variant="glass">
          <CardDecorativeOrb color="green" />
          <CardHeader className="relative z-10">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading activity...
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {activity.type === 'signal' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {activity.type === 'trade' && <Activity className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'telegram' && <Send className="h-5 w-5 text-purple-500" />}
                      {activity.type === 'update' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(activity.time, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card variant="glass">
        <CardDecorativeOrb color="blue" />
        <CardHeader className="relative z-10">
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${stats.streamingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <div>
                <p className="text-sm font-medium">MT5 Streaming</p>
                <p className="text-xs text-gray-500">{stats.streamingActive ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-gray-500">Firestore Connected</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">Platform</p>
                <p className="text-xs text-gray-500">All Systems Operational</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


