'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NotificationService } from '@/lib/notificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationsPage() {
  const { user } = useAuth()
  const { refreshNotifications } = useUnifiedNotifications()

  const testWelcomeNotification = async () => {
    if (!user) return
    
    await NotificationService.createNotification({
      userId: user.uid,
      type: 'welcome',
      title: 'Welcome to RedemptionFX!',
      message: `Welcome ${user.displayName || 'Test User'}! You now have access to our VIP trading signals and exclusive features.`,
      data: {
        soundType: 'success',
        actionUrl: '/dashboard'
      }
    })
    toast.success('Welcome notification sent!')
    refreshNotifications()
  }

  const testVIPApprovalNotification = async () => {
    if (!user) return
    
    await NotificationService.createNotification({
      userId: user.uid,
      type: 'vip_approved',
      title: 'VIP Access Approved!',
      message: `Congratulations ${user.displayName || 'Test User'}! Your VIP membership has been approved. You now have access to live signals and exclusive features.`,
      data: {
        soundType: 'vip_approved',
        actionUrl: '/dashboard/signals'
      }
    })
    toast.success('VIP approval notification sent!')
    refreshNotifications()
  }

  const testPromotionNotification = async () => {
    if (!user) return
    
    await NotificationService.createNotification({
      userId: user.uid,
      type: 'promotion',
      title: 'New Promotion Available!',
      message: 'Check out our latest promotion: Test Promotion',
      data: {
        promotionId: 'test-promo',
        soundType: 'promotion',
        actionUrl: '/dashboard'
      }
    })
    toast.success('Promotion notification sent!')
    refreshNotifications()
  }

  const testAnnouncementNotification = async () => {
    if (!user) return
    
    await NotificationService.createNotification({
      userId: user.uid,
      type: 'announcement',
      title: 'System Announcement',
      message: 'This is a test announcement notification',
      data: {
        soundType: 'info'
      }
    })
    toast.success('Announcement notification sent!')
    refreshNotifications()
  }

  const testPaymentReminderNotification = async () => {
    if (!user) return
    
    await NotificationService.createNotification({
      userId: user.uid,
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: 'Your VIP subscription expires in 7 days. Please renew to continue enjoying our services.',
      data: {
        soundType: 'warning',
        actionUrl: '/upgrade'
      }
    })
    toast.success('Payment reminder notification sent!')
    refreshNotifications()
  }

  const testSoundNotification = async (type: string) => {
    try {
      const { notificationSoundManager } = await import('@/lib/notificationSoundManager')
      await notificationSoundManager.playNotificationSound(
        { soundEnabled: true, soundType: 'default', volume: 0.7, vibrationEnabled: false, browserNotificationsEnabled: false, doNotDisturb: false, notificationTypes: { signals: true, promotions: true, system: true, vip: true, admin: false } },
        type
      )
      toast.success(`Playing ${type} sound notification`)
    } catch (error) {
      toast.error('Failed to play sound')
    }
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
