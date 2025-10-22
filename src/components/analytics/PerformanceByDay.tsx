'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AnalyticsData } from '@/lib/analyticsService'
import { Calendar } from 'lucide-react'

interface PerformanceByDayProps {
  data: AnalyticsData
}

export function PerformanceByDay({ data }: PerformanceByDayProps) {
  const { dailyData } = data

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Profit: </span>
            <span className={`font-bold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${data.profit.toFixed(2)}
            </span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Win Rate: </span>
            <span className="font-bold">{data.winRate.toFixed(1)}%</span>
          </p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Trades: </span>
            <span className="font-bold">{data.trades}</span>
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
          <Calendar className="w-5 h-5 mr-2 text-red-500" />
          Performance by Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                type="number"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <YAxis 
                type="category"
                dataKey="day" 
                stroke="#6b7280"
                fontSize={12}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="profit" 
                fill="#8884d8"
                radius={[0, 2, 2, 0]}
              >
                {data.dailyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Day Analysis Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Best Day</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {dailyData.length > 0 
                ? dailyData.reduce((max, day) => day.profit > max.profit ? day : max, dailyData[0]).day
                : 'N/A'
              }
            </p>
          </div>
          
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Worst Day</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {dailyData.length > 0 
                ? dailyData.reduce((min, day) => day.profit < min.profit ? day : min, dailyData[0]).day
                : 'N/A'
              }
            </p>
          </div>
          
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Highest Win Rate</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {dailyData.length > 0 
                ? `${dailyData.reduce((max, day) => day.winRate > max.winRate ? day : max, dailyData[0]).day} (${dailyData.reduce((max, day) => day.winRate > max.winRate ? day : max, dailyData[0]).winRate.toFixed(1)}%)`
                : 'N/A'
              }
            </p>
          </div>
          
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Most Active</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {dailyData.length > 0 
                ? dailyData.reduce((max, day) => day.trades > max.trades ? day : max, dailyData[0]).day
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
