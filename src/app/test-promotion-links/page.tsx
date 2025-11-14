'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserNotificationService } from '@/lib/userNotificationService'
import { useAuth } from '@/contexts/AuthContext'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { UnifiedNotificationProvider } from '@/contexts/UnifiedNotificationContext'
import { toast } from 'sonner'

function TestPromotionLinksInner() {
  const { user } = useAuth()
  const { notifications, stats } = useUnifiedNotifications()
  const unreadCount = stats?.unread || 0
  const [loading, setLoading] = useState(false)

  const testInternalLinkNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }
    setLoading(true)
    try {
      await UserNotificationService.createPromotionNotification(
        user.uid,
        { 
          id: 'test-internal-promo', 
          title: 'Internal Link Test', 
          description: 'This promotion links to the pricing page within the app.',
          ctaLink: '/pricing',
          linkType: 'internal'
        }
      )
      toast.success('Internal link promotion notification sent!')
    } catch (error) {
      console.error('Error sending internal link notification:', error)
      toast.error('Failed to send internal link notification.')
    } finally {
      setLoading(false)
    }
  }

  const testExternalLinkNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }
    setLoading(true)
    try {
      await UserNotificationService.createPromotionNotification(
        user.uid,
        { 
          id: 'test-external-promo', 
          title: 'External Link Test', 
          description: 'This promotion links to an external website.',
          ctaLink: 'https://google.com',
          linkType: 'external'
        }
      )
      toast.success('External link promotion notification sent!')
    } catch (error) {
      console.error('Error sending external link notification:', error)
      toast.error('Failed to send external link notification.')
    } finally {
      setLoading(false)
    }
  }

  const testDashboardLinkNotification = async () => {
    if (!user?.uid) {
      toast.error('Please log in to test notifications')
      return
    }
    setLoading(true)
    try {
      await UserNotificationService.createPromotionNotification(
        user.uid,
        { 
          id: 'test-dashboard-promo', 
          title: 'Dashboard Link Test', 
          description: 'This promotion links to the dashboard page.',
          ctaLink: '/dashboard',
          linkType: 'internal'
        }
      )
      toast.success('Dashboard link promotion notification sent!')
    } catch (error) {
      console.error('Error sending dashboard link notification:', error)
      toast.error('Failed to send dashboard link notification.')
    } finally {
      setLoading(false)
    }
  }

  const testSoundNotification = (type: string) => {
    // Sound notification functionality removed - use browser notifications instead
    toast.success(`Sound notification test for ${type} (functionality removed)`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Promotion Link Types</CardTitle>
          <CardDescription>
            Test different types of promotion notification links (internal vs external).
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
            <h3 className="text-lg font-semibold">Link Type Tests</h3>
            <Button onClick={testInternalLinkNotification} className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Test Internal Link (/pricing)'}
            </Button>
            <Button onClick={testExternalLinkNotification} className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Test External Link (https://google.com)'}
            </Button>
            <Button onClick={testDashboardLinkNotification} className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Test Dashboard Link (/dashboard)'}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sound Tests</h3>
            <div className="grid grid-cols-2 gap-2">
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
              <li>Check the notification bell in the header</li>
              <li>Click on notifications to see how they behave:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li><strong>Internal links</strong> (like /pricing, /dashboard) will navigate within the app</li>
                  <li><strong>External links</strong> (like https://google.com) will open in a new tab</li>
                  <li>Notice the different icons: <span className="inline-flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>External</span> vs <span className="inline-flex items-center"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>Internal</span></li>
                </ul>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TestPromotionLinksPage() {
  return (
    <UnifiedNotificationProvider>
      <TestPromotionLinksInner />
    </UnifiedNotificationProvider>
  )
}
