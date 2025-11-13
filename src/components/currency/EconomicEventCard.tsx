'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, MapPin, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { EconomicEvent, COUNTRY_FLAGS, IMPACT_COLORS, IMPACT_ICONS } from '@/types/economic-calendar'
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

interface EconomicEventCardProps {
  event: EconomicEvent
  onNotificationToggle?: (eventId: string, enabled: boolean) => void
  isNotificationEnabled?: boolean
}

export function EconomicEventCard({ 
  event, 
  onNotificationToggle, 
  isNotificationEnabled = false 
}: EconomicEventCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getTimeUntilEvent = () => {
    const now = new Date()
    const eventTime = new Date(event.date)
    const diffMinutes = differenceInMinutes(eventTime, now)
    const diffHours = differenceInHours(eventTime, now)
    const diffDays = differenceInDays(eventTime, now)

    if (diffMinutes < 0) {
      return 'Past event'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`
    } else if (diffHours < 24) {
      return `${diffHours}h`
    } else {
      return `${diffDays}d`
    }
  }

  const getTimeUntilEventColor = () => {
    const now = new Date()
    const eventTime = new Date(event.date)
    const diffMinutes = differenceInMinutes(eventTime, now)

    if (diffMinutes < 0) return 'text-slate-400'
    if (diffMinutes < 60) return 'text-red-500'
    if (diffMinutes < 240) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getForecastChange = () => {
    if (!event.forecast || !event.previous) return null
    
    const forecast = parseFloat(event.forecast.replace(/[^\d.-]/g, ''))
    const previous = parseFloat(event.previous.replace(/[^\d.-]/g, ''))
    
    if (isNaN(forecast) || isNaN(previous)) return null
    
    const change = forecast - previous
    const percentChange = (change / previous) * 100
    
    return {
      change,
      percentChange,
      isPositive: change > 0
    }
  }

  const forecastChange = getForecastChange()

  return (
    <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-black dark:to-slate-900/50 border-red-500/20 dark:border-red-500/30 hover:border-red-500/40 dark:hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {COUNTRY_FLAGS[event.country] || '🌍'}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                {event.event}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {event.country} • {event.timezone}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${IMPACT_COLORS[event.impact]}`}>
              {IMPACT_ICONS[event.impact]} {event.impact.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-6 w-6 p-0"
            >
              <Info className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Time</p>
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {event.time}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">In</p>
            <span className={`text-sm font-bold ${getTimeUntilEventColor()}`}>
              {getTimeUntilEvent()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Forecast</p>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {event.forecast}
              </span>
              {forecastChange && (
                <div className="flex items-center gap-1">
                  {forecastChange.isPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={`text-xs ${forecastChange.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {forecastChange.isPositive ? '+' : ''}{forecastChange.percentChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Previous</p>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {event.previous}
            </span>
          </div>
        </div>

        {event.actual && (
          <div className="mb-3 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Actual Result</p>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {event.actual}
            </span>
          </div>
        )}

        {showDetails && event.description && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {event.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {format(new Date(event.date), 'MMM dd, yyyy')}
            </span>
          </div>
          
          {onNotificationToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNotificationToggle(event.id, !isNotificationEnabled)}
              className={`text-xs h-6 px-2 ${
                isNotificationEnabled 
                  ? 'text-red-600 hover:text-red-700' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {isNotificationEnabled ? '🔔' : '🔕'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}








