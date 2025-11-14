'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AnalyticsData, BestTimeAnalysis } from '@/lib/analyticsService'
import { Clock, TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react'

interface BestTimeToTradeProps {
  data: AnalyticsData
}

export function BestTimeToTrade({ data }: BestTimeToTradeProps) {
  const bestTimeAnalysis = data.bestTimeAnalysis

  if (!bestTimeAnalysis || bestTimeAnalysis.hourlyPerformance.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-blue-500/30 dark:border-blue-500/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-500" />
            Best Time to Trade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Insufficient data to analyze best trading times.</p>
            <p className="text-sm mt-2">Complete more trades to see your optimal trading hours.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { hourlyPerformance, bestHours, worstHours, optimalWindows, recommendations } = bestTimeAnalysis

  // Prepare data for hourly chart
  const chartData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = hourlyPerformance.find(h => h.hour === hour)
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      hourNumber: hour,
      profit: hourData?.profit || 0,
      winRate: hourData?.winRate || 0,
      tradeCount: hourData?.tradeCount || 0,
      profitFactor: hourData?.profitFactor || 0
    }
  })

  // Find max profit for color scaling
  const maxProfit = Math.max(...chartData.map(d => Math.abs(d.profit)))
  const minProfit = Math.min(...chartData.map(d => d.profit))

  const getColor = (profit: number) => {
    if (profit === 0) return '#e5e7eb'
    const ratio = profit / maxProfit
    if (ratio > 0.5) return '#10b981' // Green for high profit
    if (ratio > 0) return '#34d399' // Light green
    if (ratio > -0.5) return '#f87171' // Light red
    return '#ef4444' // Red for high loss
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p>
              <span className="text-gray-600 dark:text-gray-400">Profit: </span>
              <span className={`font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${data.profit.toFixed(2)}
              </span>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Win Rate: </span>
              <span className="font-semibold">{data.winRate.toFixed(1)}%</span>
            </p>
            <p>
              <span className="text-gray-600 dark:text-gray-400">Trades: </span>
              <span className="font-semibold">{data.tradeCount}</span>
            </p>
            {data.profitFactor > 0 && (
              <p>
                <span className="text-gray-600 dark:text-gray-400">Profit Factor: </span>
                <span className="font-semibold">{data.profitFactor.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-blue-500/30 dark:border-blue-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-500" />
          Best Time to Trade
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Analyze your historical performance to find optimal trading hours
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Key Insights
            </h3>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-blue-800 dark:text-blue-200 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Best and Worst Hours */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Best Hours */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center mb-3">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Best Trading Hours</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {bestHours.slice(0, 5).map((hour, idx) => {
                const hourData = hourlyPerformance.find(h => h.hourLabel === hour)
                return (
                  <Badge
                    key={idx}
                    variant="default"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    {hour}
                    {hourData && (
                      <span className="ml-1 text-xs">
                        (${hourData.profit.toFixed(0)})
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>

          {/* Worst Hours */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center mb-3">
              <TrendingDown className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">Worst Trading Hours</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {worstHours.slice(0, 5).map((hour, idx) => {
                const hourData = hourlyPerformance.find(h => h.hourLabel === hour)
                return (
                  <Badge
                    key={idx}
                    variant="destructive"
                    className="bg-red-500 hover:bg-red-600"
                  >
                    {hour}
                    {hourData && (
                      <span className="ml-1 text-xs">
                        (${hourData.profit.toFixed(0)})
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>
        </div>

        {/* Optimal Trading Windows */}
        {optimalWindows.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Optimal Trading Windows</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {optimalWindows.slice(0, 6).map((window, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {window.start} - {window.end}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {window.tradeCount} trades
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${window.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${window.profit.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {window.winRate.toFixed(1)}% WR
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly Performance Chart */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Hourly Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.profit)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Hours Table */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top Performing Hours</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Hour</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Profit</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Win Rate</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Trades</th>
                  <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">P.Factor</th>
                </tr>
              </thead>
              <tbody>
                {hourlyPerformance
                  .sort((a, b) => b.profit - a.profit)
                  .slice(0, 10)
                  .map((hour, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-2 px-3 font-medium">{hour.hourLabel}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${hour.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${hour.profit.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">{hour.winRate.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right">{hour.tradeCount}</td>
                      <td className="py-2 px-3 text-right">{hour.profitFactor.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

