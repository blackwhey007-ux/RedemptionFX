'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns'
import { cn } from '@/lib/utils'

interface CalendarDay {
  date: Date | string
  profit: number
  pips: number
  trades: number
  isToday: boolean
  hasData: boolean
}

interface PerformanceCalendarProps {
  month: number
  year: number
  calendarData: CalendarDay[]
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onDayClick?: (date: Date) => void
  strategyId?: string
}

export function PerformanceCalendar({
  month,
  year,
  calendarData,
  onMonthChange,
  onYearChange,
  onDayClick,
  strategyId
}: PerformanceCalendarProps) {
  const selectedDate = new Date(year, month, 1)
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  
  // Generate calendar days (6 weeks = 42 days)
  const calendarStart = new Date(monthStart)
  const dayOfWeek = getDay(monthStart)
  calendarStart.setDate(calendarStart.getDate() - dayOfWeek)
  
  const calendarEnd = new Date(calendarStart)
  calendarEnd.setDate(calendarEnd.getDate() + 41)
  
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  // Create a map for quick lookup
  const dataMap = new Map<string, CalendarDay>()
  calendarData.forEach((day) => {
    const dayDate = day.date instanceof Date ? day.date : new Date(day.date)
    const key = format(dayDate, 'yyyy-MM-dd')
    dataMap.set(key, day)
  })
  
  // Generate months and years
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1)
    return {
      value: i,
      label: format(monthDate, 'MMMM')
    }
  })
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  
  // DayCard component matching VIP results page style
  const DayCard = ({ day, dayData, isCurrentMonth }: { day: Date; dayData?: CalendarDay; isCurrentMonth: boolean }) => {
    const hasData = dayData?.hasData || false
    const pips = dayData?.pips || 0
    const trades = dayData?.trades || 0
    const isProfitable = pips > 0
    const isTodayDate = isToday(day)
    
    return (
      <div 
        className={cn(
          "group relative p-2 sm:p-3 rounded-lg border min-h-[60px] sm:min-h-[80px] flex flex-col justify-between",
          "transition-all duration-300 ease-in-out cursor-pointer",
          "hover:scale-105 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-white/10",
          "hover:z-10 transform-gpu",
          !isCurrentMonth && "opacity-40",
          isTodayDate && "border-blue-500 border-2 ring-2 ring-blue-200 dark:ring-blue-800",
          !hasData && "bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800",
          hasData && isProfitable && "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
          hasData && !isProfitable && "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
        )}
        title={hasData ? `${format(day, 'MMM d')}: ${pips > 0 ? '+' : ''}${Math.round(pips || 0)} pips, ${trades} trade${trades !== 1 ? 's' : ''}` : `${format(day, 'MMM d')}: No trades`}
      >
        {/* Date */}
        <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {format(day, 'd')}
        </div>
        
        {/* Content */}
        {hasData ? (
          <div className="space-y-1">
            {/* Pips */}
            <div className={cn(
              "text-sm sm:text-lg font-bold transition-all duration-300",
              "group-hover:scale-110 transform-gpu",
              isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {pips > 0 ? '+' : ''}{Math.round(pips || 0)} pips
            </div>
            
            {/* Trade Count */}
            <div className="text-xs text-slate-500 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
              {trades} trade{trades !== 1 ? 's' : ''}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-500 transition-colors">
            No trades
          </div>
        )}
        
        {/* Hover Effect Overlay */}
        <div className={cn(
          "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          "bg-gradient-to-br from-white/20 to-transparent dark:from-white/10",
          "pointer-events-none"
        )} />
        
        {/* Today Indicator Enhancement */}
        {isTodayDate && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    )
  }
  
  const previousMonth = () => {
    if (month === 0) {
      onYearChange(year - 1)
      onMonthChange(11)
    } else {
      onMonthChange(month - 1)
    }
  }
  
  const nextMonth = () => {
    if (month === 11) {
      onYearChange(year + 1)
      onMonthChange(0)
    } else {
      onMonthChange(month + 1)
    }
  }
  
  const goToCurrentMonth = () => {
    const now = new Date()
    onYearChange(now.getFullYear())
    onMonthChange(now.getMonth())
  }
  
  // Calculate summary stats
  const totalProfit = calendarData.reduce((sum, day) => sum + day.profit, 0)
  const totalPips = calendarData.reduce((sum, day) => sum + (day.pips || 0), 0)
  const tradingDays = calendarData.filter((day) => day.hasData).length
  const totalTrades = calendarData.reduce((sum, day) => sum + day.trades, 0)
  const winningDays = calendarData.filter((day) => (day.pips || 0) > 0).length
  const winRate = tradingDays > 0 ? (winningDays / tradingDays) * 100 : 0
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
            Performance Calendar
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={month.toString()} onValueChange={(value) => onMonthChange(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-lg border p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-muted-foreground font-medium">Total Pips</p>
            </div>
            <p className={`text-2xl font-bold ${totalPips >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {totalPips >= 0 ? '+' : ''}{totalPips.toFixed(1)}
            </p>
          </div>
          <div className="rounded-lg border p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <p className="text-sm text-muted-foreground font-medium">Trading Days</p>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{tradingDays}</p>
          </div>
          <div className="rounded-lg border p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <p className="text-sm text-muted-foreground font-medium">Total Trades</p>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalTrades}</p>
          </div>
          <div className="rounded-lg border p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-muted-foreground font-medium">Win Rate</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{winRate.toFixed(1)}%</p>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {allDays.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayData = dataMap.get(dayKey)
              const isCurrentMonth = isSameMonth(day, selectedDate)
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    if (onDayClick && dayData?.hasData) {
                      onDayClick(day)
                    }
                  }}
                  className={dayData?.hasData ? 'cursor-pointer' : 'cursor-default'}
                >
                  <DayCard 
                    day={day} 
                    dayData={dayData} 
                    isCurrentMonth={isCurrentMonth}
                  />
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Legend - Matching VIP Results Page */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
            <div className="w-3 h-3 bg-green-500 rounded group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all duration-200"></div>
            <span className="group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Profit</span>
          </div>
          <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
            <div className="w-3 h-3 bg-red-500 rounded group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-200"></div>
            <span className="group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Loss</span>
          </div>
          <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded group-hover:shadow-lg group-hover:shadow-gray-500/30 transition-all duration-200"></div>
            <span className="group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">No Trades</span>
          </div>
          <div className="flex items-center gap-2 group cursor-pointer hover:scale-105 transition-transform duration-200">
            <div className="w-3 h-3 border-2 border-blue-500 rounded group-hover:shadow-lg group-hover:shadow-blue-500/30 group-hover:bg-blue-500 transition-all duration-200"></div>
            <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Today</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

