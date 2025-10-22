'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { AnalyticsData } from '@/lib/analyticsService'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PerformanceBySideProps {
  data: AnalyticsData
}

export function PerformanceBySide({ data }: PerformanceBySideProps) {
  const { buyTrades, sellTrades, buyWinRate, sellWinRate } = data

  const totalTrades = buyTrades + sellTrades
  const buyPercentage = totalTrades > 0 ? (buyTrades / totalTrades) * 100 : 0
  const sellPercentage = totalTrades > 0 ? (sellTrades / totalTrades) * 100 : 0

  const tradeDistributionData = [
    { name: 'Buy', value: buyTrades, percentage: buyPercentage, color: '#10b981' },
    { name: 'Sell', value: sellTrades, percentage: sellPercentage, color: '#ef4444' }
  ]

  const winRateData = [
    { name: 'Buy', value: buyWinRate, color: '#10b981' },
    { name: 'Sell', value: sellWinRate, color: '#ef4444' }
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{data.name}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {data.name === 'Buy' ? 'Trades:' : 'Trades:'} {data.value}
            </span>
          </p>
          {data.payload.percentage !== undefined && (
            <p className="text-sm">
              <span className="text-slate-600 dark:text-slate-400">Percentage: </span>
              <span className="font-bold">{data.payload.percentage.toFixed(1)}%</span>
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const WinRateTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{data.name}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Win Rate: </span>
            <span className="font-bold">{data.value.toFixed(1)}%</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
          Performance by Side
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Total Trades Distribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Total Trades</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tradeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {tradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Trade Count Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Buy</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{buyTrades} ({buyPercentage.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Sell</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{sellTrades} ({sellPercentage.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Win Rate by Side */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Win Rate</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<WinRateTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Win Rate Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Buy Win Rate</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{buyWinRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Sell Win Rate</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{sellWinRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
