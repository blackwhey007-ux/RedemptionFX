'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { useUserNotifications } from '@/contexts/UserNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationSimplePage() {
  const { user } = useAuth()
  const { notifications, unreadCount, loading, addNotification, playNotificationSound } = useUserNotifications()
  const [testMessage, setTestMessage] = useState('')

  const testDirectNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }
    if (!testMessage.trim()) {
      toast.error('Please enter a test message')
      return
    }
    
    try {
      await addNotification({
        userId: user.uid,
        type: 'system',
        title: 'Test Notification',
        message: testMessage,
        data: { soundType: 'info' }
      })
      toast.success('Test notification sent!')
      setTestMessage('')
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
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
            <CardTitle>Test Notifications</CardTitle>
            <CardDescription>Please sign in to test notifications</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Notification System</CardTitle>
          <CardDescription>
            Current user: {user.displayName || user.email} ({user.role})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Notification Status</h3>
            <p>Loading: {loading ? 'Yes' : 'No'}</p>
            <p>Total Notifications: {notifications.length}</p>
            <p>Unread Notifications: {unreadCount}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Direct Notification</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter test message"
                className="flex-1 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
              />
              <Button onClick={testDirectNotification} disabled={loading}>
                Send Test
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Sounds</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => testSound('default')}>Default Sound</Button>
              <Button onClick={() => testSound('success')}>Success Sound</Button>
              <Button onClick={() => testSound('warning')}>Warning Sound</Button>
              <Button onClick={() => testSound('info')}>Info Sound</Button>
              <Button onClick={() => testSound('vip_approved')}>VIP Approved Sound</Button>
              <Button onClick={() => testSound('promotion')}>Promotion Sound</Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-slate-500">No notifications yet</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className={`p-3 border rounded-lg ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
                      </div>
                      <div className="text-xs text-slate-500">
                        {notification.read ? 'Read' : 'Unread'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
