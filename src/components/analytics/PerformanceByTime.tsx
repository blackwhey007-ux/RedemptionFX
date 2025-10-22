'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AnalyticsData } from '@/lib/analyticsService'
import { Clock } from 'lucide-react'

interface PerformanceByTimeProps {
  data: AnalyticsData
}

export function PerformanceByTime({ data }: PerformanceByTimeProps) {
  const { hourlyData } = data

  // Fill in missing hours with zero profit for better visualization
  const completeHourlyData = Array.from({ length: 24 }, (_, hour) => {
    const existingData = hourlyData.find(h => parseInt(h.hour) === hour)
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      profit: existingData ? existingData.profit : 0,
      hourNumber: hour
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      return (
        <div className="bg-white dark:bg-black/90 p-3 rounded-lg shadow-lg border border-red-500/30 dark:border-red-500/50">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-sm">
            <span className="text-slate-600 dark:text-slate-400">Profit: </span>
            <span className={`font-bold ${data.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${data.value.toFixed(2)}
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
          <Clock className="w-5 h-5 mr-2 text-red-500" />
          Performance by Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={completeHourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="hour" 
                stroke="#6b7280"
                fontSize={12}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="profit" 
                fill="#8884d8"
                radius={[2, 2, 0, 0]}
              >
                {data.hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Time Analysis Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Most Profitable Hour</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {hourlyData.length > 0 
                ? hourlyData.reduce((max, hour) => hour.profit > max.profit ? hour : max, hourlyData[0]).hour
                : 'N/A'
              }
            </p>
          </div>
          
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Least Profitable Hour</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {hourlyData.length > 0 
                ? hourlyData.reduce((min, hour) => hour.profit < min.profit ? hour : min, hourlyData[0]).hour
                : 'N/A'
              }
            </p>
          </div>
          
          <div className="text-center p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
            <p className="text-sm text-slate-600 dark:text-slate-400">Active Trading Hours</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {hourlyData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
