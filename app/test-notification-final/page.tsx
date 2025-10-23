'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationFinalPage() {
  const { user } = useAuth()
  const { notifications, unreadCount, playNotificationSound } = useUnifiedNotifications()
  const [loading, setLoading] = useState(false)

  const testPromotionNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    try {
      await UserNotificationService.createPromotionNotification(
        user.uid,
        {
          id: 'test-promo-' + Date.now(),
          title: 'Test Promotion',
          description: 'This is a test promotion notification to verify the system works correctly.'
        }
      )
      toast.success('Promotion notification sent!')
    } catch (error) {
      console.error('Error sending promotion notification:', error)
      toast.error('Failed to send promotion notification.')
    } finally {
      setLoading(false)
    }
  }

  const testVIPApprovalNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    try {
      await UserNotificationService.createVIPApprovalNotification(
        user.uid,
        user.displayName || 'Test User'
      )
      toast.success('VIP approval notification sent!')
    } catch (error) {
      console.error('Error sending VIP approval notification:', error)
      toast.error('Failed to send VIP approval notification.')
    } finally {
      setLoading(false)
    }
  }

  const testSystemNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }

    setLoading(true)
    try {
      await UserNotificationService.createSystemNotification(
        user.uid,
        'Test System Notification',
        'This is a test system notification to verify the notification system works correctly.'
      )
      toast.success('System notification sent!')
    } catch (error) {
      console.error('Error sending system notification:', error)
      toast.error('Failed to send system notification.')
    } finally {
      setLoading(false)
    }
  }

  const testSoundNotification = (type: string) => {
    playNotificationSound(type)
    toast.success(`Playing ${type} sound notification`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Final Notification Test</CardTitle>
          <CardDescription>
            Test the notification system with proper scrolling and promotion notifications.
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
            <h3 className="text-lg font-semibold">Notification Tests</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={testPromotionNotification} className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Test Promotion Notification'}
              </Button>
              <Button onClick={testVIPApprovalNotification} className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Test VIP Approval Notification'}
              </Button>
              <Button onClick={testSystemNotification} className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Test System Notification'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sound Tests</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button onClick={() => testSoundNotification('default')}>Play Default Sound</Button>
              <Button onClick={() => testSoundNotification('success')}>Play Success Sound</Button>
              <Button onClick={() => testSoundNotification('warning')}>Play Warning Sound</Button>
              <Button onClick={() => testSoundNotification('info')}>Play Info Sound</Button>
              <Button onClick={() => testSoundNotification('vip_approved')}>Play VIP Approved Sound</Button>
              <Button onClick={() => testSoundNotification('promotion')}>Play Promotion Sound</Button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>Click any notification button above</li>
              <li>Check the notification bell in the header (if you're VIP/Guest)</li>
              <li>Click on the bell to see the dropdown with proper scrolling</li>
              <li>Listen for the sound notification</li>
              <li>Click on notifications to mark them as read</li>
              <li>Test creating a promotion from the admin panel to see if notifications are sent</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
