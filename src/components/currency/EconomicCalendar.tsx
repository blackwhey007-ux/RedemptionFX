'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Calendar, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import { EconomicEvent, EconomicCalendarFilters } from '@/types/economic-calendar'
import { economicCalendarService } from '@/lib/services/economicCalendarService'
import { EconomicEventCard } from './EconomicEventCard'
import { EconomicCalendarFilters as FiltersComponent } from './EconomicCalendarFilters'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { economicCalendarNotificationService } from '@/lib/services/economicCalendarNotificationService'
import { toast } from 'sonner'

interface EconomicCalendarProps {
  onNotificationToggle?: (eventId: string, enabled: boolean) => void
}

export function EconomicCalendar({ onNotificationToggle }: EconomicCalendarProps) {
  const { user } = useAuth()
  const { showBrowserNotification } = useUnifiedNotifications()
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [notificationEnabledEvents, setNotificationEnabledEvents] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<EconomicCalendarFilters>({
    dateRange: 'week',
    countries: [],
    impactLevels: [],
    eventTypes: []
  })

  const fetchEvents = useCallback(async (showLoading = true) => {
    if (!user?.uid) return

    try {
      if (showLoading) setLoading(true)
      setError(null)

      const fetchedEvents = await economicCalendarService.getEconomicEvents({
        dateRange: filters.dateRange,
        countries: filters.countries,
        impactLevels: filters.impactLevels,
        eventTypes: filters.eventTypes
      })

      setEvents(fetchedEvents)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching economic events:', err)
      setError('Failed to load economic calendar data')
      toast.error('Failed to load economic calendar data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.uid, filters])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEvents(false)
    toast.success('Economic calendar updated')
  }

  const handleFiltersChange = (newFilters: EconomicCalendarFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({
      dateRange: 'week',
      countries: [],
      impactLevels: [],
      eventTypes: []
    })
  }

  const handleNotificationToggle = async (eventId: string, enabled: boolean) => {
    if (!user?.uid) return

    try {
      const newEnabledEvents = new Set(notificationEnabledEvents)
      if (enabled) {
        newEnabledEvents.add(eventId)
      } else {
        newEnabledEvents.delete(eventId)
      }
      setNotificationEnabledEvents(newEnabledEvents)

      // Here you would typically save the notification preference to the backend
      // For now, we'll just show a toast
      toast.success(
        enabled 
          ? 'Notifications enabled for this event' 
          : 'Notifications disabled for this event'
      )

      if (onNotificationToggle) {
        onNotificationToggle(eventId, enabled)
      }
    } catch (error) {
      console.error('Error toggling notification:', error)
      toast.error('Failed to update notification preference')
    }
  }

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents(false)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchEvents])

  // Fetch events when filters change
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Check for high-impact events that need notifications
  useEffect(() => {
    const checkHighImpactEvents = async () => {
      if (!user?.uid) return

      try {
        // Start notification scheduling for this user
        await economicCalendarNotificationService.scheduleEventNotifications(user.uid)
        
        const highImpactEvents = await economicCalendarService.checkForHighImpactEvents(user.uid)
        if (highImpactEvents.length > 0) {
          toast.info(
            `${highImpactEvents.length} high-impact event${highImpactEvents.length > 1 ? 's' : ''} coming up soon!`,
            {
              duration: 5000
            }
          )
        }
      } catch (error) {
        console.error('Error checking high-impact events:', error)
      }
    }

    checkHighImpactEvents()

    // Cleanup on unmount
    return () => {
      if (user?.uid) {
        economicCalendarNotificationService.stopScheduling(user.uid)
      }
    }
  }, [user?.uid, events])

  const getEventStats = () => {
    const now = new Date()
    const upcoming = events.filter(event => new Date(event.date) > now)
    const highImpact = upcoming.filter(event => event.impact === 'high')
    const today = upcoming.filter(event => 
      new Date(event.date).toDateString() === now.toDateString()
    )

    return { upcoming: upcoming.length, highImpact: highImpact.length, today: today.length }
  }

  const stats = getEventStats()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
            <p className="text-lg text-slate-600 dark:text-slate-400">Loading economic calendar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-red-500" />
                Economic Calendar
              </CardTitle>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Track upcoming economic events that impact forex markets
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.upcoming}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Upcoming Events</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.highImpact}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">High Impact</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.today}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Today</div>
            </div>
          </div>
          
          {lastUpdated && (
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <FiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-black dark:to-slate-900/50">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Try adjusting your filters or check back later for new events.
            </p>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-red-500/30 dark:border-red-500/50"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Events Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((event) => (
              <EconomicEventCard
                key={event.id}
                event={event}
                onNotificationToggle={handleNotificationToggle}
                isNotificationEnabled={notificationEnabledEvents.has(event.id)}
              />
            ))}
          </div>

          {/* Load More Button (if needed) */}
          {events.length >= 20 && (
            <div className="text-center">
              <Button
                variant="outline"
                className="border-red-500/30 dark:border-red-500/50"
                onClick={handleRefresh}
              >
                Load More Events
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
