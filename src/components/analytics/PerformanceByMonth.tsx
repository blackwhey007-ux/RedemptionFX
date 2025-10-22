'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsData } from '@/lib/analyticsService'
import { Calendar } from 'lucide-react'

interface PerformanceByMonthProps {
  data: AnalyticsData
}

export function PerformanceByMonth({ data }: PerformanceByMonthProps) {
  const { monthlyData } = data

  // Group by year for better organization
  const groupedByYear = monthlyData.reduce((acc, month) => {
    if (!acc[month.year]) {
      acc[month.year] = []
    }
    acc[month.year].push(month)
    return acc
  }, {} as Record<number, typeof monthlyData>)

  const getMonthColor = (percentage: number) => {
    if (percentage >= 10) return 'bg-green-500 text-white'
    if (percentage >= 5) return 'bg-green-400 text-white'
    if (percentage >= 0) return 'bg-green-300 text-slate-900'
    if (percentage >= -5) return 'bg-red-300 text-slate-900'
    if (percentage >= -10) return 'bg-red-400 text-white'
    return 'bg-red-500 text-white'
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-red-500" />
          Performance by Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Month Selection Tabs */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(groupedByYear).map(year => (
              <button
                key={year}
                className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                {year}
              </button>
            ))}
          </div>

          {/* Monthly Grid */}
          {Object.entries(groupedByYear).map(([year, months]) => (
            <div key={year} className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{year}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {months.map((month, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-105 cursor-pointer ${getMonthColor(month.percentage)}`}
                  >
                    <div className="text-center">
                      <p className="text-lg font-bold">{month.month}</p>
                      <p className="text-sm opacity-90">
                        {month.percentage >= 0 ? '+' : ''}{month.percentage.toFixed(2)}%
                      </p>
                      <p className="text-xs opacity-75 mt-1">
                        {month.trades} trade{month.trades !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Monthly Summary */}
          {monthlyData.length > 0 && (
            <div className="mt-8 p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Monthly Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Best Month</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {monthlyData.reduce((max, month) => month.percentage > max.percentage ? month : max, monthlyData[0]).month} {monthlyData.reduce((max, month) => month.percentage > max.percentage ? month : max, monthlyData[0]).year}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    +{monthlyData.reduce((max, month) => month.percentage > max.percentage ? month : max, monthlyData[0]).percentage.toFixed(2)}%
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Worst Month</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {monthlyData.reduce((min, month) => month.percentage < min.percentage ? month : min, monthlyData[0]).month} {monthlyData.reduce((min, month) => month.percentage < min.percentage ? month : min, monthlyData[0]).year}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {monthlyData.reduce((min, month) => month.percentage < min.percentage ? month : min, monthlyData[0]).percentage.toFixed(2)}%
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Average Monthly Return</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {(monthlyData.reduce((sum, month) => sum + month.percentage, 0) / monthlyData.length).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
