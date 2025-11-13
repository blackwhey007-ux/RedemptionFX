'use client'

import { useState, useEffect } from 'react'
import { PerformanceCalendar } from '@/components/copy-trading/PerformanceCalendar'
import { LiveTradingHistoryModal } from '@/components/copy-trading/LiveTradingHistoryModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Loader2, Download, Calendar } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { exportToCSV, exportToPDF } from '@/lib/exportUtils'

interface CalendarDay {
  date: Date | string
  profit: number
  pips: number
  trades: number
  isToday: boolean
  hasData: boolean
}

interface ManagedStrategy {
  strategyId: string
  name: string
  accountId: string
  status: 'active' | 'inactive'
}

export function PerformanceCalendarTab() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [selectedMasterAccount, setSelectedMasterAccount] = useState<string>('')
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all')
  const [strategies, setStrategies] = useState<ManagedStrategy[]>([])
  const [loadingStrategies, setLoadingStrategies] = useState(true)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const loadStrategies = async () => {
    try {
      setLoadingStrategies(true)
      const response = await fetch('/api/copyfactory/master/list', {
        headers: {
          'x-user-id': user?.uid || '',
          'x-user-email': user?.email || ''
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch strategies')
      }

      const data = await response.json()
      if (data.success && data.strategies) {
        setStrategies(data.strategies)
        // Auto-select first master account if none selected
        if (!selectedMasterAccount && data.strategies.length > 0) {
          setSelectedMasterAccount(data.strategies[0].accountId)
        }
      }
    } catch (err) {
      console.error('Error loading strategies:', err)
    } finally {
      setLoadingStrategies(false)
    }
  }

  const loadCalendarData = async () => {
    if (!selectedMasterAccount) {
      setError('Please select a master account')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        masterAccountId: selectedMasterAccount
      })

      if (selectedStrategy !== 'all') {
        params.append('strategyId', selectedStrategy)
      }

      const response = await fetch(
        `/api/admin/copyfactory/followers/performance-calendar?${params.toString()}`,
        {
          headers: {
            'x-user-id': user?.uid || '',
            'x-user-email': user?.email || ''
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load calendar data')
      }

      // Transform calendar days
      const days: CalendarDay[] = data.data.calendarDays.map((day: any) => ({
        date: new Date(day.date),
        profit: day.profit || 0,
        pips: day.pips || 0,
        trades: day.trades || 0,
        isToday: day.isToday || false,
        hasData: day.hasData || false
      }))

      setCalendarDays(days)
    } catch (err) {
      console.error('Error loading calendar data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStrategies()
  }, [user])

  useEffect(() => {
    if (selectedMasterAccount && !loadingStrategies) {
      loadCalendarData()
    }
  }, [selectedMonth, selectedYear, selectedStrategy, selectedMasterAccount, user, loadingStrategies])

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setHistoryModalOpen(true)
  }

  const handleExport = () => {
    const csvData = calendarDays
      .filter((day) => day.hasData)
      .map((day) => ({
        Date: day.date instanceof Date ? day.date.toLocaleDateString() : day.date,
        Profit: day.profit,
        Trades: day.trades
      }))

    exportToCSV(csvData, `performance-calendar-${selectedYear}-${selectedMonth + 1}.csv`)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Calendar</CardTitle>
              <CardDescription>
                Master account strategy performance overview
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadCalendarData} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={calendarDays.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="masterAccount">Master Account</Label>
              <Select
                value={selectedMasterAccount}
                onValueChange={(value) => {
                  setSelectedMasterAccount(value)
                  setSelectedStrategy('all') // Reset strategy when master account changes
                }}
                disabled={loadingStrategies}
              >
                <SelectTrigger id="masterAccount">
                  <SelectValue placeholder="Select Master Account" />
                </SelectTrigger>
                <SelectContent>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.strategyId} value={strategy.accountId}>
                      {strategy.name} ({strategy.accountId.substring(0, 8)}...)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="strategy">Strategy</Label>
              <Select
                value={selectedStrategy}
                onValueChange={setSelectedStrategy}
                disabled={!selectedMasterAccount || loadingStrategies}
              >
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="All Strategies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Strategies</SelectItem>
                  {strategies
                    .filter((s) => s.accountId === selectedMasterAccount)
                    .map((strategy) => (
                      <SelectItem key={strategy.strategyId} value={strategy.strategyId}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!selectedMasterAccount ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Please select a master account to view performance</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading calendar data...</span>
            </div>
          ) : (
            <PerformanceCalendar
              month={selectedMonth}
              year={selectedYear}
              calendarData={calendarDays}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
              onDayClick={handleDayClick}
              strategyId={selectedStrategy !== 'all' ? selectedStrategy : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Live Trading History Modal */}
      {selectedDate && (
        <LiveTradingHistoryModal
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          date={selectedDate}
          masterAccountId={selectedMasterAccount}
          strategyId={selectedStrategy !== 'all' ? selectedStrategy : undefined}
        />
      )}
    </div>
  )
}

