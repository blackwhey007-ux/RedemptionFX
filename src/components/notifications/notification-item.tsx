'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  Users, 
  Gift, 
  AlertCircle, 
  Info, 
  Bell, 
  ExternalLink, 
  ArrowRight,
  Clock,
  Trash2,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Notification } from '@/types/notification'
import { cn } from '@/lib/utils'
import { getDateFromTimestamp } from '@/lib/utils/timestamp'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string, type: string) => void
  onDelete: (id: string, type: string) => void
  onActionClick?: (notification: Notification) => void
  showActions?: boolean
  compact?: boolean
}

const getNotificationIcon = (type: Notification['type']) => {
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
    case 'signal':
      return <Bell className="w-4 h-4 text-purple-500" />
    case 'new_member':
      return <Users className="w-4 h-4 text-green-500" />
    case 'payment_received':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'role_changed':
      return <Users className="w-4 h-4 text-blue-500" />
    case 'event_application':
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    case 'event':
      return <Calendar className="w-4 h-4 text-indigo-500" />
    default:
      return <Bell className="w-4 h-4 text-gray-500" />
  }
}

const getNotificationColor = (type: Notification['type'], read: boolean) => {
  if (read) {
    return 'border-l-gray-300 bg-gray-50 dark:bg-gray-900/20'
  }

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
    case 'signal':
      return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10'
    case 'new_member':
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
    case 'payment_received':
      return 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
    case 'role_changed':
      return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
    case 'event_application':
      return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10'
    case 'event':
      return 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
    default:
      return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10'
  }
}

const getNotificationTypeLabel = (type: Notification['type']) => {
  switch (type) {
    case 'welcome':
      return 'Welcome'
    case 'vip_approved':
      return 'VIP Access'
    case 'promotion':
      return 'Promotion'
    case 'announcement':
      return 'Announcement'
    case 'system':
      return 'System'
    case 'payment_reminder':
      return 'Payment'
    case 'signal':
      return 'Signal'
    case 'new_member':
      return 'New Member'
    case 'payment_received':
      return 'Payment'
    case 'role_changed':
      return 'Role Change'
    case 'event_application':
      return 'Event'
    case 'event':
      return 'Event'
    default:
      return 'Notification'
  }
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onActionClick,
  showActions = true,
  compact = false
}: NotificationItemProps) {
  const handleClick = () => {
    console.log('🔔 NotificationItem: CLICKED!', { 
      id: notification.id, 
      read: notification.read,
      type: notification.type,
      title: notification.title
    })
    
    if (!notification.read) {
      const notificationType = getNotificationType(notification)
      console.log('🔔 NotificationItem: Marking as read:', { 
        id: notification.id, 
        type: notificationType,
        notificationType: notification.type,
        hasUserId: 'userId' in notification,
        hasSignalId: 'signalId' in notification,
        hasEventId: 'eventId' in notification
      })
      onMarkAsRead(notification.id, notificationType)
    }
    
    if (onActionClick) {
      onActionClick(notification)
    }
  }

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onMarkAsRead(notification.id, getNotificationType(notification))
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(notification.id, getNotificationType(notification))
  }

  const getActionUrl = () => {
    if ('data' in notification && notification.data?.actionUrl) {
      return notification.data.actionUrl
    }
    return null
  }

  const getNotificationType = (notification: Notification): string => {
    if ('userId' in notification) return 'user'
    if ('signalId' in notification) return 'signal'
    if ('eventId' in notification) return 'event'
    return 'admin'
  }

  const actionUrl = getActionUrl()
  const isExternalUrl = actionUrl?.startsWith('http')

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
        getNotificationColor(notification.type, notification.read),
        !notification.read && 'ring-1 ring-blue-200 dark:ring-blue-800'
      )}
      onClick={handleClick}
    >
      <CardContent className={cn('p-4', compact && 'p-3')}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={cn(
                    'text-sm font-medium text-slate-900 dark:text-slate-100 truncate',
                    !notification.read && 'font-semibold'
                  )}>
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                
                <div className={cn(
                  'text-xs text-slate-600 dark:text-slate-400',
                  compact ? 'line-clamp-1' : 'line-clamp-2'
                )}>
                  {/* Enhanced display for signal notifications */}
                  {notification.type === 'signal' && 'signalId' in notification ? (
                    <div className="space-y-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {notification.signalTitle}
                      </div>
                      <div className="text-xs whitespace-pre-line font-mono">
                        {notification.message}
                      </div>
                    </div>
                  ) : (
                    <p>{notification.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5"
                    >
                      {getNotificationTypeLabel(notification.type)}
                    </Badge>
                    
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(getDateFromTimestamp(notification.createdAt), { addSuffix: true })}
                    </div>
                  </div>

                  {actionUrl && (
                    <div className="flex-shrink-0">
                      {isExternalUrl ? (
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {showActions && (
                <div className="flex items-center gap-1 ml-2">
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAsRead}
                      className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/20"
                    >
                      <Check className="w-3 h-3 text-green-600" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Import Calendar icon
import { Calendar } from 'lucide-react'
