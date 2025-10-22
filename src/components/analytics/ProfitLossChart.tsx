'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3 } from 'lucide-react'
import { AnalyticsData } from '@/lib/analyticsService'

interface ProfitLossChartProps {
  data: AnalyticsData
}

export function ProfitLossChart({ data }: ProfitLossChartProps) {
  const { pnlOverTime, totalPnL, accountBalance, winRate, totalTrades, breakEvenThreshold } = data

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">P&L: </span>
            <span className={`font-bold ${data.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${data.pnl.toFixed(2)}
            </span>
          </p>
          {data.trade && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {data.trade.pair} - {data.trade.type}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total P&L</p>
                <p className="text-2xl font-bold">
                  ${totalPnL.toFixed(2)}
                </p>
                <p className="text-green-200 text-xs">
                  +{((totalPnL / Math.max(accountBalance - totalPnL, 1)) * 100).toFixed(2)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Account Balance</p>
                <p className="text-2xl font-bold">
                  ${accountBalance.toFixed(2)}
                </p>
                <p className="text-blue-200 text-xs">
                  +{((totalPnL / Math.max(accountBalance - totalPnL, 1)) * 100).toFixed(2)}%
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Win Rate</p>
                <p className="text-2xl font-bold">{winRate.toFixed(1)}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Trades</p>
                <p className="text-2xl font-bold">{totalTrades}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-red-500" />
            Profit and Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pnlOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
