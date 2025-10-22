'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnalyticsData } from '@/lib/analyticsService'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isSameMonth, isToday, addMonths, subMonths } from 'date-fns'

interface PerformanceCalendarProps {
  data: AnalyticsData
}

export function PerformanceCalendar({ data }: PerformanceCalendarProps) {
  const { calendarData } = data

  // State for selected month/year
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Get available years from calendar data
  const availableYears = Array.from(new Set(
    calendarData.map(item => new Date(item.date).getFullYear())
  )).sort((a, b) => b - a) // Sort descending (newest first)

  // Generate months for the selected year
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(selectedDate.getFullYear(), i, 1)
    return {
      value: i,
      label: format(month, 'MMMM')
    }
  })

  // Get month start/end for selected date
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Create a map for quick lookup of trade data by date
  const tradeDataMap = new Map(
    calendarData.map(item => [item.date, item])
  )

  const getDayColor = (profit: number) => {
    if (profit > 0) return 'bg-green-500 text-white'
    if (profit < 0) return 'bg-red-500 text-white'
    return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
  }

  const getDayBorder = (profit: number) => {
    if (profit > 0) return 'border-green-400'
    if (profit < 0) return 'border-red-400'
    return 'border-slate-300 dark:border-slate-600'
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1))
  }

  const goToNextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1))
  }

  const goToCurrentMonth = () => {
    setSelectedDate(new Date())
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), selectedDate.getMonth(), 1)
    setSelectedDate(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newDate = new Date(selectedDate.getFullYear(), parseInt(month), 1)
    setSelectedDate(newDate)
  }

  return (
    <Card className="bg-white/80 dark:bg-black/90 backdrop-blur-sm border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <CalendarIcon className="w-5 h-5 mr-2 text-red-500" />
          Performance Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              className="border-red-200 dark:border-red-800/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center space-x-3">
              <Select
                value={selectedDate.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-32 border-red-200 dark:border-red-800/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDate.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-20 border-red-200 dark:border-red-800/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.length > 0 ? availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  )) : (
                    <SelectItem value={new Date().getFullYear().toString()}>
                      {new Date().getFullYear()}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentMonth}
                className="border-red-200 dark:border-red-800/50"
              >
                Today
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              className="border-red-200 dark:border-red-800/50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Month Header */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {format(selectedDate, 'MMMM yyyy')}
            </h3>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {monthDays.map((day, index) => {
              const dateString = format(day, 'yyyy-MM-dd')
              const tradeData = tradeDataMap.get(dateString)
              const dayOfMonth = format(day, 'd')
              const isCurrentMonth = isSameMonth(day, selectedDate)
              const isCurrentDay = isToday(day)
              
              return (
                <div
                  key={index}
                  className={`min-h-[60px] p-1 border-2 rounded-lg transition-all hover:scale-105 cursor-pointer ${
                    isCurrentMonth 
                      ? getDayBorder(tradeData?.profit || 0)
                      : 'border-slate-200 dark:border-slate-700 opacity-50'
                  } ${
                    isCurrentDay ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <div className={`w-full h-full rounded flex flex-col items-center justify-center ${getDayColor(tradeData?.profit || 0)}`}>
                    <span className={`text-sm font-medium ${isCurrentDay ? 'font-bold' : ''}`}>
                      {dayOfMonth}
                    </span>
                    {tradeData && (
                      <div className="text-xs text-center mt-1">
                        <div className="font-bold">
                          ${tradeData.profit >= 0 ? '+' : ''}{tradeData.profit.toFixed(0)}
                        </div>
                        <div className="opacity-75">
                          {tradeData.trades} trade{tradeData.trades !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex items-center justify-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Profit</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Loss</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">No Trades</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-400 rounded"></div>
              <span className="text-sm text-slate-600 dark:text-slate-400">Today</span>
            </div>
          </div>

          {/* Monthly Summary */}
          {(() => {
            // Filter calendar data for the selected month
            const selectedMonthData = calendarData.filter(day => {
              const dayDate = new Date(day.date)
              return isSameMonth(dayDate, selectedDate)
            })
            
            const totalProfit = selectedMonthData.reduce((sum, day) => sum + day.profit, 0)
            const totalTrades = selectedMonthData.reduce((sum, day) => sum + day.trades, 0)
            const avgDaily = selectedMonthData.length > 0 ? totalProfit / selectedMonthData.length : 0
            
            return selectedMonthData.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-black/80 rounded-lg border border-red-500/20">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {format(selectedDate, 'MMMM yyyy')} Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Profit</p>
                    <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      ${totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Trading Days</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedMonthData.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Trades</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalTrades}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Avg Daily</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      ${avgDaily.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </CardContent>
    </Card>
  )
}
