'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Bell, Save, Settings } from 'lucide-react'
import { EconomicCalendarPreferences, COUNTRY_FLAGS, EVENT_TYPES } from '@/types/economic-calendar'
import { economicCalendarService } from '@/lib/services/economicCalendarService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const COUNTRIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'CNY', 'SEK', 'NOK', 'DKK'
]

export function EconomicCalendarNotificationSettings() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<EconomicCalendarPreferences>({
    userId: user?.uid || '',
    enabledNotifications: false,
    notificationTime: 30,
    highImpactOnly: true,
    selectedCountries: [],
    selectedEventTypes: [],
    lastUpdated: new Date()
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.uid) return

      try {
        setLoading(true)
        const prefs = await economicCalendarService.getUserPreferences(user.uid)
        if (prefs) {
          setPreferences(prefs)
        } else {
          // Set default preferences
          setPreferences({
            userId: user.uid,
            enabledNotifications: false,
            notificationTime: 30,
            highImpactOnly: true,
            selectedCountries: ['USD', 'EUR', 'GBP'],
            selectedEventTypes: ['GDP', 'Employment', 'Interest Rates'],
            lastUpdated: new Date()
          })
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error)
        toast.error('Failed to load notification preferences')
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user?.uid])

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setSaving(true)
      await economicCalendarService.saveUserPreferences(user.uid, preferences)
      toast.success('Notification preferences saved successfully!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleCountryToggle = (country: string, checked: boolean) => {
    const newCountries = checked
      ? [...preferences.selectedCountries, country]
      : preferences.selectedCountries.filter(c => c !== country)
    
    setPreferences({
      ...preferences,
      selectedCountries: newCountries
    })
  }

  const handleEventTypeToggle = (eventType: string, checked: boolean) => {
    const newEventTypes = checked
      ? [...preferences.selectedEventTypes, eventType]
      : preferences.selectedEventTypes.filter(e => e !== eventType)
    
    setPreferences({
      ...preferences,
      selectedEventTypes: newEventTypes
    })
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50">
        <CardContent className="p-6">
          <div className="text-center">
            <Settings className="w-8 h-8 text-red-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-400">Loading notification settings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-500" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="enable-notifications" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Enable Economic Calendar Notifications
            </Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get notified about upcoming economic events
            </p>
          </div>
          <Switch
            id="enable-notifications"
            checked={preferences.enabledNotifications}
            onCheckedChange={(checked) => setPreferences({ ...preferences, enabledNotifications: checked })}
          />
        </div>

        {preferences.enabledNotifications && (
          <>
            {/* Notification Time */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Notification Time
              </Label>
              <Select
                value={preferences.notificationTime.toString()}
                onValueChange={(value) => setPreferences({ ...preferences, notificationTime: parseInt(value) })}
              >
                <SelectTrigger className="border-red-500/30 dark:border-red-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="15">15 minutes before</SelectItem>
                  <SelectItem value="30">30 minutes before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="120">2 hours before</SelectItem>
                  <SelectItem value="240">4 hours before</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* High Impact Only */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="high-impact-only" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  High Impact Events Only
                </Label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Only notify about high-impact economic events
                </p>
              </div>
              <Switch
                id="high-impact-only"
                checked={preferences.highImpactOnly}
                onCheckedChange={(checked) => setPreferences({ ...preferences, highImpactOnly: checked })}
              />
            </div>

            {/* Selected Countries */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Countries to Monitor
              </Label>
              <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {COUNTRIES.map((country) => (
                  <div key={country} className="flex items-center space-x-2">
                    <Checkbox
                      id={`notify-country-${country}`}
                      checked={preferences.selectedCountries.includes(country)}
                      onCheckedChange={(checked) => handleCountryToggle(country, checked as boolean)}
                    />
                    <Label
                      htmlFor={`notify-country-${country}`}
                      className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1"
                    >
                      {COUNTRY_FLAGS[country]} {country}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Event Types */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Event Types to Monitor
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {EVENT_TYPES.map((eventType) => (
                  <div key={eventType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`notify-event-${eventType}`}
                      checked={preferences.selectedEventTypes.includes(eventType)}
                      onCheckedChange={(checked) => handleEventTypeToggle(eventType, checked as boolean)}
                    />
                    <Label
                      htmlFor={`notify-event-${eventType}`}
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

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}








