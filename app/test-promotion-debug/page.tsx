'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function TestPromotionDebugPage() {
  const { user } = useAuth()
  const { notifications } = useUnifiedNotifications()
  const unreadCount = notifications.filter(n => !n.read).length
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testNotifyAllUsers = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    addDebugInfo('Starting notifyAllUsers test...')
    
    try {
      addDebugInfo('Calling UserNotificationService.notifyAllUsers...')
      
      const result = await UserNotificationService.notifyAllUsers({
        type: 'promotion',
        title: 'Test Promotion Notification',
        message: 'This is a test promotion notification to debug the issue.',
        data: {
          promotionId: 'test-promo-' + Date.now(),
          soundType: 'promotion',
          actionUrl: '/dashboard'
        }
      })
      
      addDebugInfo(`notifyAllUsers returned: ${result}`)
      toast.success(`Promotion notification sent to ${result} users!`)
    } catch (error) {
      addDebugInfo(`Error: ${error}`)
      console.error('Error sending promotion notification:', error)
      toast.error('Failed to send promotion notification.')
    } finally {
      setLoading(false)
    }
  }

  const testNotifyAllVIPUsers = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    addDebugInfo('Starting notifyAllVIPUsers test...')
    
    try {
      addDebugInfo('Calling UserNotificationService.notifyAllVIPUsers...')
      
      const result = await UserNotificationService.notifyAllVIPUsers({
        type: 'promotion',
        title: 'Test VIP Promotion Notification',
        message: 'This is a test VIP promotion notification to debug the issue.',
        data: {
          promotionId: 'test-vip-promo-' + Date.now(),
          soundType: 'promotion',
          actionUrl: '/dashboard'
        }
      })
      
      addDebugInfo(`notifyAllVIPUsers returned: ${result}`)
      toast.success(`VIP promotion notification sent to ${result} users!`)
    } catch (error) {
      addDebugInfo(`Error: ${error}`)
      console.error('Error sending VIP promotion notification:', error)
      toast.error('Failed to send VIP promotion notification.')
    } finally {
      setLoading(false)
    }
  }

  const testDirectNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    addDebugInfo('Starting direct notification test...')
    
    try {
      addDebugInfo('Calling UserNotificationService.createNotification directly...')
      
      const result = await UserNotificationService.createNotification({
        userId: user.uid,
        type: 'promotion',
        title: 'Direct Test Promotion',
        message: 'This is a direct test promotion notification.',
        data: {
          promotionId: 'direct-test-' + Date.now(),
          soundType: 'promotion',
          actionUrl: '/dashboard'
        }
      })
      
      addDebugInfo(`Direct notification created with ID: ${result}`)
      toast.success('Direct notification sent!')
    } catch (error) {
      addDebugInfo(`Error: ${error}`)
      console.error('Error sending direct notification:', error)
      toast.error('Failed to send direct notification.')
    } finally {
      setLoading(false)
    }
  }

  const clearDebugInfo = () => {
    setDebugInfo([])
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Promotion Notification Debug</CardTitle>
          <CardDescription>
            Debug why promotion notifications aren't working from admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Current User Info</h3>
            <p>User ID: {user?.uid || 'N/A'}</p>
            <p>User Role: {user?.role || 'N/A'}</p>
            <p>Total Notifications: {notifications.length}</p>
            <p>Unread Notifications: {unreadCount}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Different Notification Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={testNotifyAllUsers} className="w-full" disabled={loading}>
                {loading ? 'Testing...' : 'Test notifyAllUsers'}
              </Button>
              <Button onClick={testNotifyAllVIPUsers} className="w-full" disabled={loading}>
                {loading ? 'Testing...' : 'Test notifyAllVIPUsers'}
              </Button>
              <Button onClick={testDirectNotification} className="w-full" disabled={loading}>
                {loading ? 'Testing...' : 'Test Direct Notification'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Debug Log</h3>
              <Button onClick={clearDebugInfo} variant="outline" size="sm">
                Clear Log
              </Button>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg max-h-60 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <p className="text-slate-500">No debug information yet. Click a test button above.</p>
              ) : (
                debugInfo.map((info, index) => (
                  <p key={index} className="text-sm font-mono text-slate-700 dark:text-slate-300">
                    {info}
                  </p>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How to Debug:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>Click "Test Direct Notification" first - this should work and create a notification for you</li>
              <li>Click "Test notifyAllUsers" - this should send notifications to all users</li>
              <li>Click "Test notifyAllVIPUsers" - this should send notifications to VIP users only</li>
              <li>Check the debug log for any error messages</li>
              <li>Check if notifications appear in the notification bell</li>
              <li>Check the browser console for any additional error messages</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
