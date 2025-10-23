'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationFixPage() {
  const { user } = useAuth()
  const { notifications, stats } = useUnifiedNotifications()
  const unreadCount = stats?.unread || 0
  const [loading, setLoading] = useState(false)

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
      toast.error('Failed to send notification')
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
        'This is a test system notification to verify the fix works!'
      )
      toast.success('System notification sent!')
    } catch (error) {
      console.error('Error sending system notification:', error)
      toast.error('Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  const testSound = (type: string) => {
    playNotificationSound(type)
    toast.success(`Playing ${type} sound`)
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Notification Fix</CardTitle>
            <CardDescription>Please sign in to test the notification fix</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Notification Fix</CardTitle>
          <CardDescription>
            Testing the fixed notification system for user: {user.displayName || user.email} ({user.role})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Tests</h3>
              
              <Button 
                onClick={testVIPApprovalNotification} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Test VIP Approval Notification'}
              </Button>
              
              <Button 
                onClick={testSystemNotification} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Test System Notification'}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sound Tests</h3>
              
              <Button onClick={() => testSound('vip_approved')} className="w-full">
                Test VIP Approved Sound
              </Button>
              
              <Button onClick={() => testSound('promotion')} className="w-full">
                Test Promotion Sound
              </Button>
              
              <Button onClick={() => testSound('default')} className="w-full">
                Test Default Sound
              </Button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Current Status</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Total Notifications: {notifications.length}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Unread Notifications: {unreadCount}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              User Role: {user.role}
            </p>
            {user.role === 'admin' && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                Note: Admin users don't see the notification bell. Test with a VIP or Guest account to see the bell.
              </p>
            )}
          </div>

          <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">What Was Fixed</h3>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>✅ Collection name: Changed from 'userNotifications' to 'user_notifications'</li>
              <li>✅ Field name: Changed from 'isRead' to 'read'</li>
              <li>✅ Sound types: Added 'vip_approved' and 'promotion' sound types</li>
              <li>✅ Service methods: Updated all methods to use correct collection and field names</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
