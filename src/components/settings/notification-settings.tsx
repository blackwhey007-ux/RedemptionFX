'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useNotificationPreferences } from '@/contexts/NotificationPreferencesContext'
import { Bell, Volume2, VolumeX, Moon, Sun, Clock, Settings, TestTube } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationSettings() {
  const { preferences, updatePreferences, resetToDefaults, isDNDActive } = useNotificationPreferences()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleUpdate = async (updates: Partial<typeof preferences>) => {
    setIsUpdating(true)
    try {
      await updatePreferences(updates)
      toast.success('Notification preferences updated')
    } catch (error) {
      toast.error('Failed to update preferences')
      console.error('Error updating preferences:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReset = async () => {
    setIsUpdating(true)
    try {
      await resetToDefaults()
      toast.success('Preferences reset to defaults')
    } catch (error) {
      toast.error('Failed to reset preferences')
      console.error('Error resetting preferences:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const testSound = async () => {
    try {
      const { notificationSoundManager } = await import('@/lib/notificationSoundManager')
      await notificationSoundManager.playNotificationSound(preferences, 'test')
      toast.success('Test sound played')
    } catch (error) {
      toast.error('Failed to play test sound')
      console.error('Error playing test sound:', error)
    }
  }

  const testVibration = async () => {
    try {
      const { notificationSoundManager } = await import('@/lib/notificationSoundManager')
      await notificationSoundManager.vibrate(preferences, [200, 100, 200])
      toast.success('Test vibration triggered')
    } catch (error) {
      toast.error('Failed to trigger vibration')
      console.error('Error triggering vibration:', error)
    }
  }

  const testBrowserNotification = async () => {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from RedemptionFX',
            icon: '/images/redemptionfx-logo.png',
            tag: 'test-notification'
          })
          toast.success('Test notification sent')
        } else if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            new Notification('Test Notification', {
              body: 'This is a test notification from RedemptionFX',
              icon: '/images/redemptionfx-logo.png',
              tag: 'test-notification'
            })
            toast.success('Test notification sent')
          } else {
            toast.error('Notification permission denied')
          }
        } else {
          toast.error('Notification permission denied')
        }
      } else {
        toast.error('Browser notifications not supported')
      }
    } catch (error) {
      toast.error('Failed to send test notification')
      console.error('Error sending test notification:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground">
            Customize how you receive notifications
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Reset to Defaults
        </Button>
      </div>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Sound Settings
          </CardTitle>
          <CardDescription>
            Configure notification sounds and volume
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled">Enable Sounds</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for new notifications
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => handleUpdate({ soundEnabled: checked })}
              disabled={isUpdating}
            />
          </div>

          {preferences.soundEnabled && (
            <>
              <div className="space-y-3">
                <Label htmlFor="sound-type">Sound Type</Label>
                <Select
                  value={preferences.soundType}
                  onValueChange={(value: 'default' | 'minimal' | 'custom') => 
                    handleUpdate({ soundType: value })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="volume">Volume</Label>
                <div className="flex items-center gap-4">
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <Slider
                    id="volume"
                    min={0}
                    max={1}
                    step={0.1}
                    value={[preferences.volume]}
                    onValueChange={([value]) => handleUpdate({ volume: value })}
                    disabled={isUpdating}
                    className="flex-1"
                  />
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {Math.round(preferences.volume * 100)}%
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testSound}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  Test Sound
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Browser Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            System notifications from your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-notifications">Enable Browser Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show system notifications for new messages
              </p>
            </div>
            <Switch
              id="browser-notifications"
              checked={preferences.browserNotificationsEnabled}
              onCheckedChange={(checked) => handleUpdate({ browserNotificationsEnabled: checked })}
              disabled={isUpdating}
            />
          </div>

          {preferences.browserNotificationsEnabled && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testBrowserNotification}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vibration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Vibration
          </CardTitle>
          <CardDescription>
            Haptic feedback for mobile devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vibration">Enable Vibration</Label>
              <p className="text-sm text-muted-foreground">
                Vibrate device for new notifications
              </p>
            </div>
            <Switch
              id="vibration"
              checked={preferences.vibrationEnabled}
              onCheckedChange={(checked) => handleUpdate({ vibrationEnabled: checked })}
              disabled={isUpdating}
            />
          </div>

          {preferences.vibrationEnabled && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testVibration}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Test Vibration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Do Not Disturb */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isDNDActive() ? <Moon className="w-5 h-5 text-orange-500" /> : <Sun className="w-5 h-5" />}
            Do Not Disturb
            {isDNDActive() && <Badge variant="destructive">Active</Badge>}
          </CardTitle>
          <CardDescription>
            Temporarily disable notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dnd-enabled">Enable Do Not Disturb</Label>
              <p className="text-sm text-muted-foreground">
                Disable all notifications when active
              </p>
            </div>
            <Switch
              id="dnd-enabled"
              checked={preferences.doNotDisturb}
              onCheckedChange={(checked) => handleUpdate({ doNotDisturb: checked })}
              disabled={isUpdating}
            />
          </div>

          {preferences.doNotDisturb && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dnd-start">Start Time</Label>
                  <Input
                    id="dnd-start"
                    type="time"
                    value={preferences.dndSchedule?.start || '22:00'}
                    onChange={(e) => handleUpdate({
                      dndSchedule: {
                        ...preferences.dndSchedule,
                        start: e.target.value,
                        end: preferences.dndSchedule?.end || '08:00'
                      }
                    })}
                    disabled={isUpdating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dnd-end">End Time</Label>
                  <Input
                    id="dnd-end"
                    type="time"
                    value={preferences.dndSchedule?.end || '08:00'}
                    onChange={(e) => handleUpdate({
                      dndSchedule: {
                        ...preferences.dndSchedule,
                        start: preferences.dndSchedule?.start || '22:00',
                        end: e.target.value
                      }
                    })}
                    disabled={isUpdating}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Notifications will be disabled during this time period
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {Object.entries(preferences.notificationTypes).map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`notification-${type}`} className="capitalize">
                    {type} Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {type === 'signals' && 'Trading signals and market updates'}
                    {type === 'promotions' && 'Special offers and promotions'}
                    {type === 'system' && 'System updates and maintenance'}
                    {type === 'vip' && 'VIP exclusive content and features'}
                    {type === 'admin' && 'Administrative notifications'}
                  </p>
                </div>
                <Switch
                  id={`notification-${type}`}
                  checked={enabled}
                  onCheckedChange={(checked) => handleUpdate({
                    notificationTypes: {
                      ...preferences.notificationTypes,
                      [type]: checked
                    }
                  })}
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Status
          </CardTitle>
          <CardDescription>
            Current notification system status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Do Not Disturb</span>
              <Badge variant={isDNDActive() ? 'destructive' : 'secondary'}>
                {isDNDActive() ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Browser Notifications</span>
              <Badge variant={preferences.browserNotificationsEnabled ? 'default' : 'secondary'}>
                {preferences.browserNotificationsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Sound</span>
              <Badge variant={preferences.soundEnabled ? 'default' : 'secondary'}>
                {preferences.soundEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Vibration</span>
              <Badge variant={preferences.vibrationEnabled ? 'default' : 'secondary'}>
                {preferences.vibrationEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}









