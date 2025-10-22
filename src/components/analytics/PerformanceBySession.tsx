'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts'
import { AnalyticsData } from '@/lib/analyticsService'
import { Activity } from 'lucide-react'

interface PerformanceBySessionProps {
  data: AnalyticsData
}

export function PerformanceBySession({ data }: PerformanceBySessionProps) {
  const { sessionData } = data

  // Prepare data for radar charts
  const radarData = sessionData.map(session => ({
    session: session.session,
    winRate: session.winRate,
    totalTrades: session.totalTrades,
    avgRR: session.avgRR,
    profit: session.profit
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{data.session}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Win Rate: </span>
            <span className="font-bold">{data.winRate.toFixed(1)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Trades: </span>
            <span className="font-bold">{data.totalTrades}</span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Avg R:R: </span>
            <span className="font-bold">{data.avgRR.toFixed(2)}</span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Profit: </span>
            <span className={`font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${data.profit.toFixed(2)}
            </span>
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
          <Activity className="w-5 h-5 mr-2 text-red-500" />
          Performance by Session
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Win Rate Radar Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Win Rate</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="session" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Win Rate"
                    dataKey="winRate"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Trades Radar Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Total Trades</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="session" />
                  <PolarRadiusAxis angle={90} domain={[0, Math.max(...radarData.map(d => d.totalTrades), 10)]} />
                  <Radar
                    name="Total Trades"
                    dataKey="totalTrades"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average R:R Radar Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Avg R:R</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="session" />
                  <PolarRadiusAxis angle={90} domain={[0, Math.max(...radarData.map(d => d.avgRR), 5)]} />
                  <Radar
                    name="Avg R:R"
                    dataKey="avgRR"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Radar Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profit</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="session" />
                  <PolarRadiusAxis angle={90} domain={['dataMin', 'dataMax']} />
                  <Radar
                    name="Profit"
                    dataKey="profit"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Session Summary Table */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Session Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400">Session</th>
                  <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400">Win Rate</th>
                  <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400">Total Trades</th>
                  <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400">Avg R:R</th>
                  <th className="text-right py-2 px-3 text-slate-600 dark:text-slate-400">Profit</th>
                </tr>
              </thead>
              <tbody>
                {sessionData.map((session, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">{session.session}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{session.winRate.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{session.totalTrades}</td>
                    <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{session.avgRR.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${session.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${session.profit.toFixed(2)}
                    </td>
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
