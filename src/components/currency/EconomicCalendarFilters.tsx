'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Filter, X, Calendar, Globe, Zap } from 'lucide-react'
import { EconomicCalendarFilters, COUNTRY_FLAGS, EVENT_TYPES } from '@/types/economic-calendar'

interface EconomicCalendarFiltersProps {
  filters: EconomicCalendarFilters
  onFiltersChange: (filters: EconomicCalendarFilters) => void
  onClearFilters: () => void
}

const COUNTRIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'SEK', 'NOK', 'DKK'
]

const IMPACT_LEVELS = [
  { value: 'low', label: 'Low Impact', color: 'text-green-600' },
  { value: 'medium', label: 'Medium Impact', color: 'text-yellow-600' },
  { value: 'high', label: 'High Impact', color: 'text-red-600' }
] as const

export function EconomicCalendarFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: EconomicCalendarFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleDateRangeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: value as any,
      customStartDate: value === 'custom' ? filters.customStartDate : undefined,
      customEndDate: value === 'custom' ? filters.customEndDate : undefined
    })
  }

  const handleCountryToggle = (country: string, checked: boolean) => {
    const newCountries = checked
      ? [...filters.countries, country]
      : filters.countries.filter(c => c !== country)
    
    onFiltersChange({
      ...filters,
      countries: newCountries
    })
  }

  const handleImpactToggle = (impact: 'low' | 'medium' | 'high', checked: boolean) => {
    const newImpacts = checked
      ? [...filters.impactLevels, impact]
      : filters.impactLevels.filter(i => i !== impact)
    
    onFiltersChange({
      ...filters,
      impactLevels: newImpacts
    })
  }

  const handleEventTypeToggle = (eventType: string, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]
      : filters.eventTypes.filter(e => e !== eventType)
    
    onFiltersChange({
      ...filters,
      eventTypes: newEventTypes
    })
  }

  const handleCustomDateChange = (field: 'customStartDate' | 'customEndDate', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value ? new Date(value) : undefined
    })
  }

  const hasActiveFilters = () => {
    return (
      filters.dateRange !== 'week' ||
      filters.countries.length > 0 ||
      filters.impactLevels.length > 0 ||
      filters.eventTypes.length > 0 ||
      (filters.dateRange === 'custom' && (filters.customStartDate || filters.customEndDate))
    )
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.dateRange !== 'week') count++
    if (filters.countries.length > 0) count++
    if (filters.impactLevels.length > 0) count++
    if (filters.eventTypes.length > 0) count++
    if (filters.dateRange === 'custom' && (filters.customStartDate || filters.customEndDate)) count++
    return count
  }

  return (
    <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-500" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-xs h-8 px-3 border-red-500/30 dark:border-red-500/50"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs h-8 px-3"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" />
            Date Range
          </Label>
          <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="border-red-500/30 dark:border-red-500/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {filters.dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Start Date</Label>
                <Input
                  type="date"
                  value={filters.customStartDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleCustomDateChange('customStartDate', e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">End Date</Label>
                <Input
                  type="date"
                  value={filters.customEndDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) => handleCustomDateChange('customEndDate', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {isExpanded && (
          <>
            {/* Countries Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-red-500" />
                Countries
              </Label>
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {COUNTRIES.map((country) => (
                  <div key={country} className="flex items-center space-x-2">
                    <Checkbox
                      id={`country-${country}`}
                      checked={filters.countries.includes(country)}
                      onCheckedChange={(checked) => handleCountryToggle(country, checked as boolean)}
                    />
                    <Label
                      htmlFor={`country-${country}`}
                      className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1"
                    >
                      {COUNTRY_FLAGS[country]} {country}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Levels Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-red-500" />
                Impact Level
              </Label>
              <div className="space-y-2">
                {IMPACT_LEVELS.map((impact) => (
                  <div key={impact.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`impact-${impact.value}`}
                      checked={filters.impactLevels.includes(impact.value as any)}
                      onCheckedChange={(checked) => handleImpactToggle(impact.value, checked as boolean)}
                    />
                    <Label
                      htmlFor={`impact-${impact.value}`}
                      className={`text-xs ${impact.color} flex items-center gap-1`}
                    >
                      {impact.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Types Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Event Types
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {EVENT_TYPES.map((eventType) => (
                  <div key={eventType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${eventType}`}
                      checked={filters.eventTypes.includes(eventType)}
                      onCheckedChange={(checked) => handleEventTypeToggle(eventType, checked as boolean)}
                    />
                    <Label
                      htmlFor={`event-${eventType}`}
                      className="text-xs text-slate-600 dark:text-slate-400"
                    >
                      {eventType}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}








