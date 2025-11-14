'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
// Commented out to prevent build errors - useUnifiedNotifications requires provider context
// import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { UserNotificationService } from '@/lib/userNotificationService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Disable static generation for this test page
export const dynamic = 'force-dynamic'

export default function TestSimpleNotificationPage() {
  const { user } = useAuth()
  // Commented out useUnifiedNotifications to prevent build errors during static generation
  // This hook requires UnifiedNotificationProvider which isn't available during build time
  // Can be re-enabled locally for development/testing
  // const { notifications, stats, loading } = useUnifiedNotifications()
  // const unreadCount = stats?.unread || 0
  
  // Fallback values for production build
  const notifications: any[] = []
  const loading = false
  const unreadCount = 0
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testCreateNotification = async () => {
    if (!user) {
      addResult('❌ No user logged in')
      return
    }

    try {
      addResult('Creating test notification...')
      
      // Test direct notification creation
      await UserNotificationService.createSystemNotification(
        user.uid,
        'Test Notification',
        'This is a test notification to verify the system works'
      )
      
      addResult('✅ Notification created successfully!')
    } catch (error) {
      addResult(`❌ Error creating notification: ${error.message}`)
    }
  }

  const testServiceNotification = async () => {
    if (!user) {
      addResult('❌ No user logged in')
      return
    }

    try {
      addResult('Creating service notification...')
      
      await UserNotificationService.createSystemNotification(
        user.uid,
        'Service Test',
        'This notification was created through the service'
      )
      
      addResult('✅ Service notification created successfully!')
    } catch (error) {
      addResult(`❌ Error creating service notification: ${error.message}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  useEffect(() => {
    if (user) {
      addResult(`User logged in: ${user.email} (${user.role})`)
    }
  }, [user])

  // Commented out useEffect that depends on notifications - using fallback values instead
  // useEffect(() => {
  //   addResult(`Notifications loaded: ${notifications.length}, Unread: ${unreadCount}`)
  // }, [notifications, unreadCount])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Simple Notifications</CardTitle>
            <CardDescription>Please sign in to test notifications</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple Notification Test</CardTitle>
          <CardDescription>Test notification creation and display</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testCreateNotification}>
              Test Direct Notification
            </Button>
            <Button onClick={testServiceNotification}>
              Test Service Notification
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <strong>User:</strong> {user.email}
            </div>
            <div>
              <strong>Role:</strong> <Badge>{user.role}</Badge>
            </div>
            <div>
              <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Total Notifications:</strong> {notifications.length}
            </div>
            <div>
              <strong>Unread Count:</strong> {unreadCount}
            </div>
            <div>
              <strong>Status:</strong> {unreadCount > 0 ? 'Has notifications' : 'No notifications'}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Real-time test results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">No test results yet</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {result}
                </div>
              ))
            )}
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
