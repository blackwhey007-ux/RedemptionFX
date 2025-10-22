'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUserNotifications } from '@/contexts/UserNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationsPage() {
  const { user } = useAuth()
  const { addNotification, playNotificationSound } = useUserNotifications()

  const testWelcomeNotification = async () => {
    if (!user) return
    
    await UserNotificationService.createWelcomeNotification(
      user.uid, 
      user.displayName || 'Test User'
    )
    toast.success('Welcome notification sent!')
  }

  const testVIPApprovalNotification = async () => {
    if (!user) return
    
    await UserNotificationService.createVIPApprovalNotification(
      user.uid, 
      user.displayName || 'Test User'
    )
    toast.success('VIP approval notification sent!')
  }

  const testPromotionNotification = async () => {
    if (!user) return
    
    await UserNotificationService.createPromotionNotification(
      user.uid,
      {
        title: 'Test Promotion',
        message: 'This is a test promotion notification',
        id: 'test-promo'
      }
    )
    toast.success('Promotion notification sent!')
  }

  const testAnnouncementNotification = async () => {
    if (!user) return
    
    await UserNotificationService.createAnnouncementNotification(
      user.uid,
      'System Announcement',
      'This is a test announcement notification'
    )
    toast.success('Announcement notification sent!')
  }

  const testPaymentReminderNotification = async () => {
    if (!user) return
    
    await UserNotificationService.createPaymentReminderNotification(
      user.uid,
      7
    )
    toast.success('Payment reminder notification sent!')
  }

  const testSoundNotification = (type: string) => {
    playNotificationSound(type)
    toast.success(`Playing ${type} sound notification`)
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
            Test different types of notifications and sounds for {user.role} users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Notification Types</h3>
              
              <Button onClick={testWelcomeNotification} className="w-full">
                Test Welcome Notification
              </Button>
              
              <Button onClick={testVIPApprovalNotification} className="w-full">
                Test VIP Approval Notification
              </Button>
              
              <Button onClick={testPromotionNotification} className="w-full">
                Test Promotion Notification
              </Button>
              
              <Button onClick={testAnnouncementNotification} className="w-full">
                Test Announcement Notification
              </Button>
              
              <Button onClick={testPaymentReminderNotification} className="w-full">
                Test Payment Reminder Notification
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sound Tests</h3>
              
              <Button onClick={() => testSoundNotification('default')} className="w-full">
                Test Default Sound
              </Button>
              
              <Button onClick={() => testSoundNotification('success')} className="w-full">
                Test Success Sound
              </Button>
              
              <Button onClick={() => testSoundNotification('warning')} className="w-full">
                Test Warning Sound
              </Button>
              
              <Button onClick={() => testSoundNotification('info')} className="w-full">
                Test Info Sound
              </Button>
              
              <Button onClick={() => testSoundNotification('vip_approved')} className="w-full">
                Test VIP Approved Sound
              </Button>
              
              <Button onClick={() => testSoundNotification('promotion')} className="w-full">
                Test Promotion Sound
              </Button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>Click any notification button above</li>
              <li>Check the notification bell in the header (if you're VIP/Guest)</li>
              <li>Listen for the sound notification</li>
              <li>Click on notifications to mark them as read</li>
              <li>Test different user roles to see different notification behaviors</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
