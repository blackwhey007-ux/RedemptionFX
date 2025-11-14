'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AnalyticsData, OptimizationInsights } from '@/lib/analyticsService'
import { TrendingUp, Target, Clock, DollarSign, Calendar, Award } from 'lucide-react'

interface OptimizationInsightsProps {
  data: AnalyticsData
}

export function OptimizationInsights({ data }: OptimizationInsightsProps) {
  const insights = data.optimizationInsights

  if (!insights || insights.bestPairs.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-green-500/30 dark:border-green-500/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
            Performance Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Insufficient data to generate optimization insights.</p>
            <p className="text-sm mt-2">Complete more trades to see optimization recommendations.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { bestPairs, optimalDuration, bestTradeSize, monthlyConsistency, bestDay, bestMonth, recommendations } = insights

  // Prepare data for best pairs chart
  const pairsChartData = bestPairs.slice(0, 10).map(pair => ({
    symbol: pair.symbol,
    profit: pair.profit,
    winRate: pair.winRate,
    trades: pair.trades
  }))

  const getColor = (profit: number, maxProfit: number) => {
    if (profit === 0) return '#e5e7eb'
    const ratio = profit / maxProfit
    if (ratio > 0.7) return '#10b981'
    if (ratio > 0.4) return '#34d399'
    if (ratio > 0) return '#6ee7b7'
    if (ratio > -0.3) return '#fca5a5'
    return '#ef4444'
  }

  const maxProfit = Math.max(...pairsChartData.map(p => Math.abs(p.profit)))

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
              <span className="font-semibold">{data.trades}</span>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-green-500/30 dark:border-green-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
          Performance Optimization
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Discover your best performing pairs, optimal trade settings, and consistency metrics
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Best Pair */}
          {bestPairs.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center mb-2">
                <Target className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">Best Pair</p>
              </div>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                {bestPairs[0].symbol}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700 dark:text-blue-300">
                  ${bestPairs[0].profit.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-300">
                  {bestPairs[0].winRate.toFixed(1)}% WR
                </Badge>
              </div>
            </div>
          )}

          {/* Best Day */}
          {bestDay.trades > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center mb-2">
                <Calendar className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                <p className="text-xs font-semibold text-green-900 dark:text-green-100">Best Day</p>
              </div>
              <p className="text-lg font-bold text-green-900 dark:text-green-100 mb-1">
                {bestDay.day}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700 dark:text-green-300">
                  ${bestDay.profit.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-xs border-green-500 text-green-700 dark:text-green-300">
                  {bestDay.winRate.toFixed(1)}% WR
                </Badge>
              </div>
            </div>
          )}

          {/* Optimal Duration */}
          {optimalDuration.trades > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center mb-2">
                <Clock className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                <p className="text-xs font-semibold text-purple-900 dark:text-purple-100">Optimal Duration</p>
              </div>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-1">
                {optimalDuration.duration}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700 dark:text-purple-300">
                  ${optimalDuration.profit.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 dark:text-purple-300">
                  {optimalDuration.winRate.toFixed(1)}% WR
                </Badge>
              </div>
            </div>
          )}

          {/* Consistency Score */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center mb-2">
              <Award className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" />
              <p className="text-xs font-semibold text-orange-900 dark:text-orange-100">Consistency</p>
            </div>
            <p className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-1">
              {monthlyConsistency.toFixed(1)}%
            </p>
            <div className="w-full bg-orange-200 dark:bg-orange-800 rounded-full h-2 mt-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${monthlyConsistency}%` }}
              />
            </div>
          </div>
        </div>

        {/* Best Performing Pairs Chart */}
        {bestPairs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Best Performing Currency Pairs</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pairsChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="symbol"
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
                  {pairsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.profit, maxProfit)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Best Pairs Table */}
        {bestPairs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Top Currency Pairs Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Pair</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Profit</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Win Rate</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Trades</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">Avg R:R</th>
                    <th className="text-right py-2 px-3 text-gray-600 dark:text-gray-400">P.Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {bestPairs.map((pair, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-2 px-3 font-medium">{pair.symbol}</td>
                      <td className={`py-2 px-3 text-right font-semibold ${pair.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${pair.profit.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">{pair.winRate.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right">{pair.trades}</td>
                      <td className="py-2 px-3 text-right">{pair.avgRR.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">{pair.profitFactor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trade Size Analysis */}
        {bestTradeSize.trades > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Best Trade Size
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{bestTradeSize.size}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {bestTradeSize.trades} trades • {bestTradeSize.winRate.toFixed(1)}% win rate
                </p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${bestTradeSize.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${bestTradeSize.profit.toFixed(2)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total profit</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Optimization Recommendations
            </h3>
            <ul className="space-y-1">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-green-800 dark:text-green-200 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

