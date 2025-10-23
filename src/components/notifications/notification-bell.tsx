'use client'

import React, { useState } from 'react'
import { Bell, Check, X, ExternalLink, ArrowRight, Gift, Users, AlertCircle, Info, CheckCircle, Settings, MoreHorizontal, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { NotificationItem } from './notification-item'
import { formatDistanceToNow } from 'date-fns'

interface NotificationBellProps {
  className?: string
  maxNotifications?: number
  showSettings?: boolean
}

export function NotificationBell({ 
  className, 
  maxNotifications = 10,
  showSettings = true 
}: NotificationBellProps) {
  const { 
    notifications, 
    stats, 
    loading, 
    error,
    markAsRead, 
    markAllAsRead, 
    refreshNotifications,
    clearError
  } = useUnifiedNotifications()
  
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      const notificationType = getNotificationType(notification)
      await markAsRead(notification.id, notificationType)
    }
    
    // Handle action URL if present
    if (notification.data?.actionUrl) {
      const actionUrl = notification.data.actionUrl
      
      // Check if it's an external URL (starts with http)
      if (actionUrl.startsWith('http')) {
        window.open(actionUrl, '_blank')
      } else {
        // Internal link - navigate within the app
        // Add a small delay to ensure the notification is marked as read first
        setTimeout(() => {
          window.location.href = actionUrl
        }, 100)
      }
    }
  }

  const getNotificationType = (notification: any): string => {
    if ('userId' in notification) return 'user'
    if ('signalId' in notification) return 'signal'
    if ('eventId' in notification) return 'event'
    return 'admin'
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const recentNotifications = notifications.slice(0, maxNotifications)
  const unreadCount = stats?.unread || 0

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {showSettings && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={refreshNotifications}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {unreadCount > 0 && (
                <DropdownMenuItem onClick={handleMarkAllAsRead}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark all as read
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-12 z-[9999] w-96 max-h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden">
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-3 px-4 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Notifications</CardTitle>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="p-1 h-6 w-6"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <CardDescription className="mt-1">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </CardDescription>
                )}
                {error && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                    {error}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearError}
                      className="ml-2 h-auto p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-80 w-full">
                  {loading && recentNotifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading notifications...</p>
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {recentNotifications.map((notification, index) => (
                        <div key={notification.id}>
                          <NotificationItem
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDelete={() => {}}
                            onActionClick={handleNotificationClick}
                            showActions={false}
                            compact={true}
                          />
                          {index < recentNotifications.length - 1 && (
                            <Separator className="mx-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
