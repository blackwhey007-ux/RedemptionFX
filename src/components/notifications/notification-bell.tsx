'use client'

import React, { useState } from 'react'
import { Bell, Check, X, ExternalLink, ArrowRight, Gift, Users, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useUserNotifications, UserNotification } from '@/contexts/UserNotificationContext'
import { formatDistanceToNow } from 'date-fns'

const getNotificationIcon = (type: UserNotification['type']) => {
  switch (type) {
    case 'welcome':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'vip_approved':
      return <Users className="w-4 h-4 text-blue-500" />
    case 'promotion':
      return <Gift className="w-4 h-4 text-yellow-500" />
    case 'announcement':
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    case 'system':
      return <Info className="w-4 h-4 text-gray-500" />
    case 'payment_reminder':
      return <AlertCircle className="w-4 h-4 text-red-500" />
    default:
      return <Bell className="w-4 h-4 text-gray-500" />
  }
}

const getNotificationColor = (type: UserNotification['type']) => {
  switch (type) {
    case 'welcome':
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
    case 'vip_approved':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    case 'promotion':
      return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10'
    case 'announcement':
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10'
    case 'system':
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10'
    case 'payment_reminder':
      return 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10'
  }
}

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useUserNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id)
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

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const recentNotifications = notifications.slice(0, 10) // Show only last 10 notifications

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
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

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute right-0 top-12 z-[9999] w-80 max-h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl overflow-hidden">
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
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-80 w-full">
                  {loading ? (
                    <div className="p-4 text-center text-slate-500">
                      Loading notifications...
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
                          <div
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                              !notification.read ? 'font-medium' : 'opacity-75'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-slate-500">
                                    {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                                  </span>
                                  {notification.data?.actionUrl && (
                                    notification.data.actionUrl.startsWith('http') ? (
                                      <ExternalLink className="w-3 h-3 text-slate-400" />
                                    ) : (
                                      <ArrowRight className="w-3 h-3 text-slate-400" />
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {index < recentNotifications.length - 1 && (
                            <Separator className="mx-3" />
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
