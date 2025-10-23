'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { NotificationService } from '@/lib/notificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function TestNotificationFinalPage() {
  const { user } = useAuth()
  const { notifications, stats } = useUnifiedNotifications()
  const unreadCount = stats?.unread || 0
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

  const testAdminNotification = async () => {
    if (!user?.isAdmin) {
      toast.error('Only admins can test admin notifications')
      return
    }

    setLoading(true)
    try {
      await NotificationService.createNotification({
        type: 'new_member',
        title: 'Test Admin Notification',
        message: 'This is a test admin notification to verify the system works correctly.',
        memberName: 'Test Member',
        memberEmail: 'test@example.com',
        memberId: 'test-member-id'
      })
      toast.success('Admin notification sent!')
    } catch (error) {
      console.error('Error sending admin notification:', error)
      toast.error('Failed to send admin notification.')
    } finally {
      setLoading(false)
    }
  }

  const testSignalNotification = async () => {
    if (!user?.isAdmin) {
      toast.error('Only admins can test signal notifications')
      return
    }

    setLoading(true)
    try {
      await NotificationService.createNotification({
        signalId: 'test-signal-' + Date.now(),
        signalTitle: 'Test Signal',
        signalCategory: 'free',
        sentTo: 'all',
        message: '🔔 New FREE Signal: EURUSD BUY @ 1.0850'
      })
      toast.success('Signal notification sent!')
    } catch (error) {
      console.error('Error sending signal notification:', error)
      toast.error('Failed to send signal notification.')
    } finally {
      setLoading(false)
    }
  }

  const playNotificationSound = (type: string) => {
    // Simple sound notification using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different frequencies for different types
      const frequencies = {
        default: 800,
        success: 1000,
        warning: 600,
        info: 400,
        vip_approved: 1200,
        promotion: 900
      }
      
      oscillator.frequency.setValueAtTime(frequencies[type as keyof typeof frequencies] || 800, audioContext.currentTime)
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.error('Error playing notification sound:', error)
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
            <h3 className="text-lg font-semibold">User Notification Tests</h3>
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

          {user?.isAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Admin Notification Tests</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button onClick={testAdminNotification} className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Test Admin Notification'}
                </Button>
                <Button onClick={testSignalNotification} className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Test Signal Notification'}
                </Button>
              </div>
            </div>
          )}

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
