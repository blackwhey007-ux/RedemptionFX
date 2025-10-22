'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AnalyticsData } from '@/lib/analyticsService'
import { BarChart3 } from 'lucide-react'

interface TradeFrequencyProps {
  data: AnalyticsData
}

export function TradeFrequency({ data }: TradeFrequencyProps) {
  const { tradesPerDay, tradesPerWeek, tradesPerMonth } = data

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Trades: </span>
            <span className="font-bold">{data.value}</span>
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
          <BarChart3 className="w-5 h-5 mr-2 text-red-500" />
          Average Trade Frequency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Trades per Day */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trades/day</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="#ef4444"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
              <p className="text-sm text-slate-600 dark:text-slate-400">Average</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {(tradesPerDay.reduce((sum, day) => sum + day.count, 0) / tradesPerDay.length).toFixed(1)}
              </p>
            </div>
          </div>

          {/* Trades per Week */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trades/week</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradesPerWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
              <p className="text-sm text-slate-600 dark:text-slate-400">Average</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {tradesPerWeek.length > 0 ? (tradesPerWeek.reduce((sum, week) => sum + week.count, 0) / tradesPerWeek.length).toFixed(1) : '0'}
              </p>
            </div>
          </div>

          {/* Trades per Month */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trades/month</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradesPerMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="count" 
                    fill="#8b5cf6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
              <p className="text-sm text-slate-600 dark:text-slate-400">Average</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {tradesPerMonth.length > 0 ? (tradesPerMonth.reduce((sum, month) => sum + month.count, 0) / tradesPerMonth.length).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </div>

        {/* Frequency Summary */}
        <div className="mt-8 p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trading Frequency Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Most Active Day</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {tradesPerDay.length > 0 
                  ? tradesPerDay.reduce((max, day) => day.count > max.count ? day : max, tradesPerDay[0]).label
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Most Active Week</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {tradesPerWeek.length > 0 
                  ? tradesPerWeek.reduce((max, week) => week.count > max.count ? week : max, tradesPerWeek[0]).label
                  : 'N/A'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Most Active Month</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {tradesPerMonth.length > 0 
                  ? tradesPerMonth.reduce((max, month) => month.count > max.count ? month : max, tradesPerMonth[0]).label
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
