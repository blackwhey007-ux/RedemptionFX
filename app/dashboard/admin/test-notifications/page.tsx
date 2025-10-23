'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  TestTube, 
  Users, 
  Signal, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Volume2,
  VolumeX
} from 'lucide-react'
import { UserNotificationService } from '@/lib/userNotificationService'
import { NotificationService } from '@/lib/notificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

export default function AdminTestNotificationsPage() {
  const { user } = useAuth()
  const { notifications, stats, refreshNotifications } = useUnifiedNotifications()
  const [loading, setLoading] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const unreadCount = stats?.unread || 0
  const totalCount = stats?.total || 0

  // User notification tests - send to all users
  const testPromotionNotification = async () => {
    setLoading(true)
    try {
      const userCount = await UserNotificationService.notifyAllUsers({
        type: 'promotion',
        title: 'Test Promotion - 50% Off VIP',
        message: 'This is a test promotion notification to verify the system works correctly.',
        data: {
          promotionId: 'test-promo-' + Date.now(),
          soundType: 'promotion',
          actionUrl: '/dashboard/pricing'
        }
      })
      toast.success(`Promotion notification sent to ${userCount} users!`)
    } catch (error) {
      console.error('Error sending promotion notification:', error)
      toast.error('Failed to send promotion notification.')
    } finally {
      setLoading(false)
    }
  }

  const testVIPApprovalNotification = async () => {
    setLoading(true)
    try {
      const vipCount = await UserNotificationService.notifyAllVIPUsers({
        type: 'vip_approved',
        title: 'VIP Status Approved!',
        message: 'Congratulations! Your VIP status has been approved. Enjoy exclusive trading signals and features.',
        data: {
          soundType: 'vip_approved',
          actionUrl: '/dashboard/signals/vip'
        }
      })
      toast.success(`VIP approval notification sent to ${vipCount} VIP users!`)
    } catch (error) {
      console.error('Error sending VIP approval notification:', error)
      toast.error('Failed to send VIP approval notification.')
    } finally {
      setLoading(false)
    }
  }

  const testSystemNotification = async () => {
    setLoading(true)
    try {
      const userCount = await UserNotificationService.notifyAllUsers({
        type: 'system',
        title: 'System Maintenance Notice',
        message: 'This is a test system notification to verify the notification system works correctly.',
        data: {
          soundType: 'info',
          actionUrl: '/dashboard'
        }
      })
      toast.success(`System notification sent to ${userCount} users!`)
    } catch (error) {
      console.error('Error sending system notification:', error)
      toast.error('Failed to send system notification.')
    } finally {
      setLoading(false)
    }
  }

  // Admin notification tests
  const testNewMemberNotification = async () => {
    setLoading(true)
    try {
      await NotificationService.createNotification({
        type: 'new_member',
        title: 'New Member Registration',
        message: 'Test User (test@example.com) has registered',
        memberName: 'Test User',
        memberEmail: 'test@example.com',
        memberId: 'test-member-' + Date.now()
      })
      toast.success('New member notification sent!')
    } catch (error) {
      console.error('Error sending new member notification:', error)
      toast.error('Failed to send new member notification.')
    } finally {
      setLoading(false)
    }
  }

  const testPaymentNotification = async () => {
    setLoading(true)
    try {
      await NotificationService.createNotification({
        type: 'payment_received',
        title: 'Payment Received',
        message: 'VIP subscription payment received from Test User ($99.99)',
        memberName: 'Test User',
        memberEmail: 'test@example.com',
        memberId: 'test-member-' + Date.now()
      })
      toast.success('Payment notification sent!')
    } catch (error) {
      console.error('Error sending payment notification:', error)
      toast.error('Failed to send payment notification.')
    } finally {
      setLoading(false)
    }
  }

  const testEventApplicationNotification = async () => {
    setLoading(true)
    try {
      await NotificationService.createNotification({
        type: 'event_application',
        title: 'New Event Application',
        message: 'Test User applied to "Forex Masterclass"',
        memberName: 'Test User',
        memberEmail: 'test@example.com',
        memberId: 'test-member-' + Date.now(),
        eventId: 'test-event-' + Date.now(),
        eventTitle: 'Forex Masterclass',
        applicationId: 'test-app-' + Date.now(),
        applicantName: 'Test User'
      })
      toast.success('Event application notification sent!')
    } catch (error) {
      console.error('Error sending event application notification:', error)
      toast.error('Failed to send event application notification.')
    } finally {
      setLoading(false)
    }
  }

  // Signal notification tests
  const testFreeSignalNotification = async () => {
    setLoading(true)
    try {
      await NotificationService.createNotification({
        signalId: 'test-free-signal-' + Date.now(),
        signalTitle: 'EURUSD Free Signal',
        signalCategory: 'free',
        sentTo: 'all',
        message: '🔔 New FREE Signal: EURUSD BUY @ 1.0850\n🛑 SL: 1.0800 | 🎯 TP: 1.0900'
      })
      toast.success('Free signal notification sent! This should appear for ALL users (VIP and Guest).')
    } catch (error) {
      console.error('Error sending free signal notification:', error)
      toast.error('Failed to send free signal notification.')
    } finally {
      setLoading(false)
    }
  }

  const testVIPSignalNotification = async () => {
    setLoading(true)
    try {
      await NotificationService.createNotification({
        signalId: 'test-vip-signal-' + Date.now(),
        signalTitle: 'GBPUSD VIP Signal',
        signalCategory: 'vip',
        sentTo: 'vip',
        message: '👑 New VIP Signal: GBPUSD SELL @ 1.2650\n🛑 SL: 1.2700 | 🎯 TP: 1.2550 | TP2: 1.2450'
      })
      toast.success('VIP signal notification sent! This should appear for VIP users only.')
    } catch (error) {
      console.error('Error sending VIP signal notification:', error)
      toast.error('Failed to send VIP signal notification.')
    } finally {
      setLoading(false)
    }
  }

  // Sound notification tests
  const playNotificationSound = (type: string) => {
    if (!soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      const frequencies = {
        default: 800,
        success: 1000,
        warning: 600,
        info: 400,
        vip_approved: 1200,
        promotion: 900,
        signal: 1100
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

  const refreshNotificationsData = async () => {
    setLoading(true)
    try {
      await refreshNotifications()
      toast.success('Notifications refreshed!')
    } catch (error) {
      console.error('Error refreshing notifications:', error)
      toast.error('Failed to refresh notifications.')
    } finally {
      setLoading(false)
    }
  }

  const cleanupOldNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cron/cleanup-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysOld: 7 }) // Clean up notifications older than 7 days for testing
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Cleanup completed: ${result.message}`)
        await refreshNotifications() // Refresh to show updated counts
      } else {
        toast.error(`Cleanup failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error cleaning up notifications:', error)
      toast.error('Failed to cleanup notifications.')
    } finally {
      setLoading(false)
    }
  }

  if (!user?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This page is only accessible to admin users.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-red-600" />
            Notification Testing
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Test all notification types and verify the notification system is working correctly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-2"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNotificationsData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={cleanupOldNotifications}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <AlertCircle className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Cleanup Old
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Unread Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalCount - unreadCount}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Read Notifications</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Notification Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Notification Tests
          </CardTitle>
          <CardDescription>
            Test notifications that are sent to all VIP and Guest users (promotions, VIP approvals, system messages).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={testPromotionNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test Promotion Notification'}
            </Button>
            <Button 
              onClick={testVIPApprovalNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test VIP Approval Notification'}
            </Button>
            <Button 
              onClick={testSystemNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test System Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Notification Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Notification Tests
          </CardTitle>
          <CardDescription>
            Test notifications that are sent to all admin users (new members, payments, event applications).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={testNewMemberNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test New Member Notification'}
            </Button>
            <Button 
              onClick={testPaymentNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test Payment Notification'}
            </Button>
            <Button 
              onClick={testEventApplicationNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test Event Application Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signal Notification Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            Signal Notification Tests
          </CardTitle>
          <CardDescription>
            Test notifications for trading signals (free and VIP signals).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testFreeSignalNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test Free Signal Notification'}
            </Button>
            <Button 
              onClick={testVIPSignalNotification} 
              className="w-full" 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Sending...' : 'Test VIP Signal Notification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sound Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Sound Notification Tests
          </CardTitle>
          <CardDescription>
            Test different notification sounds to verify audio feedback is working.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button onClick={() => testSoundNotification('default')} variant="outline" size="sm">
              Default Sound
            </Button>
            <Button onClick={() => testSoundNotification('success')} variant="outline" size="sm">
              Success Sound
            </Button>
            <Button onClick={() => testSoundNotification('warning')} variant="outline" size="sm">
              Warning Sound
            </Button>
            <Button onClick={() => testSoundNotification('info')} variant="outline" size="sm">
              Info Sound
            </Button>
            <Button onClick={() => testSoundNotification('vip_approved')} variant="outline" size="sm">
              VIP Approved
            </Button>
            <Button onClick={() => testSoundNotification('promotion')} variant="outline" size="sm">
              Promotion
            </Button>
            <Button onClick={() => testSoundNotification('signal')} variant="outline" size="sm">
              Signal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Current User Info:</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>User ID:</strong> {user?.uid || 'N/A'}</p>
                  <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
                  <p><strong>Is Admin:</strong> {user?.isAdmin ? 'Yes' : 'No'}</p>
                  <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Notification Status:</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>Total Notifications:</strong> {totalCount}</p>
                  <p><strong>Unread Count:</strong> {unreadCount}</p>
                  <p><strong>Read Count:</strong> {totalCount - unreadCount}</p>
                  <p><strong>Sound Enabled:</strong> {soundEnabled ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">How to Test Notifications:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li><strong>For User Notifications:</strong> Click "Test Promotion Notification" or "Test System Notification" - these will be sent to ALL VIP and Guest users</li>
                <li><strong>For VIP Notifications:</strong> Click "Test VIP Approval Notification" - this will be sent to VIP users only</li>
                <li><strong>For Signal Notifications:</strong> Click "Test Free Signal" (all users) or "Test VIP Signal" (VIP only)</li>
                <li><strong>For Admin Notifications:</strong> Click any admin notification test - these appear for admin users only</li>
                <li>Check the notification bell in the header for new notifications</li>
                <li>Click on the bell to see the dropdown with notifications</li>
                <li>Click on individual notifications to mark them as read</li>
                <li>Listen for sound notifications (toggle sound on/off with the button above)</li>
                <li>Use the refresh button to reload notification data</li>
                <li>Use the "Cleanup Old" button to remove notifications older than 7 days</li>
              </ol>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold mb-2">What to Verify:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                <li><strong>User Notifications:</strong> VIP and Guest users should see promotion and system notifications</li>
                <li><strong>VIP Notifications:</strong> Only VIP users should see VIP approval notifications</li>
                <li><strong>Signal Notifications:</strong> Free signals appear for all users, VIP signals only for VIP users</li>
                <li><strong>Admin Notifications:</strong> Only admin users see admin notifications</li>
                <li>Notifications appear in the notification bell immediately</li>
                <li>Unread count updates correctly</li>
                <li>Marking notifications as read works</li>
                <li>Sound notifications play (if enabled)</li>
                <li>Real-time updates work without page refresh</li>
              </ul>
            </div>

            <Separator />

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-yellow-800 dark:text-yellow-200">⚠️ Important Testing Notes:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                <li>To test user notifications, you need to have VIP or Guest user accounts</li>
                <li>Admin users will see admin notifications but may not see user notifications</li>
                <li>Signal notifications work differently - they use the signalNotifications collection</li>
                <li>If notifications don't appear, check the browser console for error messages</li>
                <li>Make sure the notification bell is using the UnifiedNotificationContext</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
