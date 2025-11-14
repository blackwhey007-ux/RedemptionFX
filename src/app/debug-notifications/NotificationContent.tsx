'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { UserNotificationService } from '@/lib/userNotificationService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function NotificationContent() {
  const { user } = useAuth()
  const { notifications, stats, loading } = useUnifiedNotifications()
  const unreadCount = stats?.unread || 0
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    if (user) {
      setDebugInfo({
        userId: user.uid,
        userRole: user.role,
        userEmail: user.email,
        notificationsCount: notifications.length,
        unreadCount: unreadCount,
        loading: loading
      })
    }
  }, [user, notifications, unreadCount, loading])

  const testDirectNotification = async () => {
    if (!user) return
    
    try {
      await UserNotificationService.createSystemNotification(
        user.uid,
        'Direct Test Notification',
        'This notification was created directly through the service'
      )
      console.log('Direct notification added successfully')
    } catch (error) {
      console.error('Error adding direct notification:', error)
    }
  }

  const testServiceNotification = async () => {
    if (!user) return
    
    try {
      await UserNotificationService.createSystemNotification(
        user.uid,
        'Service Test Notification',
        'This notification was created through the service'
      )
      console.log('Service notification added successfully')
    } catch (error) {
      console.error('Error adding service notification:', error)
    }
  }

  const clearAllNotifications = async () => {
    // This would require implementing a clear function in the service
    console.log('Clear notifications not implemented yet')
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Debug Notifications</CardTitle>
            <CardDescription>Please sign in to debug notifications</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
          <CardDescription>Current notification system state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>User ID:</strong> {debugInfo.userId}
            </div>
            <div>
              <strong>User Role:</strong> <Badge>{debugInfo.userRole}</Badge>
            </div>
            <div>
              <strong>User Email:</strong> {debugInfo.userEmail}
            </div>
            <div>
              <strong>Loading:</strong> {debugInfo.loading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Total Notifications:</strong> {debugInfo.notificationsCount}
            </div>
            <div>
              <strong>Unread Count:</strong> {debugInfo.unreadCount}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Notifications</CardTitle>
          <CardDescription>Test different ways to create notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testDirectNotification}>
              Test Direct Notification
            </Button>
            <Button onClick={testServiceNotification}>
              Test Service Notification
            </Button>
            <Button onClick={clearAllNotifications} variant="outline">
              Clear All Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Notifications</CardTitle>
          <CardDescription>All notifications for this user</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div>No notifications found</div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      <p className="text-xs text-gray-500">
                        Type: {notification.type} | 
                        Read: {notification.read ? 'Yes' : 'No'} | 
                        Created: {notification.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                      </p>
                    </div>
                    {!notification.read && (
                      <Badge variant="destructive">Unread</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

