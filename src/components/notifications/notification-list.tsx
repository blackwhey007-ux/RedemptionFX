'use client'

import React, { useState, useMemo } from 'react'
import { 
  Bell, 
  Filter, 
  Search, 
  Check, 
  Trash2, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  X,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { NotificationItem } from './notification-item'
import { useUnifiedNotifications } from '@/contexts/UnifiedNotificationContext'
import { getDateFromTimestamp } from '@/lib/utils/timestamp'
import { Notification, NotificationFilters } from '@/types/notification'
import { cn } from '@/lib/utils'

interface NotificationListProps {
  className?: string
  maxHeight?: string
  showFilters?: boolean
  showBulkActions?: boolean
  compact?: boolean
  onNotificationClick?: (notification: Notification) => void
}

export function NotificationList({
  className,
  maxHeight = '400px',
  showFilters = true,
  showBulkActions = true,
  compact = false,
  onNotificationClick
}: NotificationListProps) {
  const {
    notifications,
    stats,
    loading,
    error,
    hasMore,
    loadMoreNotifications,
    markAsRead,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    clearError,
    setFilters,
    currentFilters
  } = useUnifiedNotifications()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterRead, setFilterRead] = useState<string>('all')

  // Filter notifications based on search and filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(notification => notification.type === filterType)
    }

    // Read status filter
    if (filterRead === 'unread') {
      filtered = filtered.filter(notification => !notification.read)
    } else if (filterRead === 'read') {
      filtered = filtered.filter(notification => notification.read)
    }

    return filtered
  }, [notifications, searchQuery, filterType, filterRead])

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {}
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    filteredNotifications.forEach(notification => {
      const notificationDate = getDateFromTimestamp(notification.createdAt)
      let groupKey: string

      if (notificationDate >= today) {
        groupKey = 'Today'
      } else if (notificationDate >= yesterday) {
        groupKey = 'Yesterday'
      } else if (notificationDate >= weekAgo) {
        groupKey = 'This Week'
      } else {
        groupKey = notificationDate.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        })
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(notification)
    })

    return groups
  }, [filteredNotifications])

  const handleSelectNotification = (notificationId: string, selected: boolean) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(notificationId)
      } else {
        newSet.delete(notificationId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)))
    } else {
      setSelectedNotifications(new Set())
    }
  }

  const handleBulkMarkAsRead = async () => {
    const selectedIds = Array.from(selectedNotifications)
    const notificationsToUpdate = selectedIds.map(id => {
      const notification = notifications.find(n => n.id === id)
      return {
        id,
        type: getNotificationType(notification!)
      }
    })

    await markMultipleAsRead(notificationsToUpdate)
    setSelectedNotifications(new Set())
  }

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedNotifications)
    for (const id of selectedIds) {
      const notification = notifications.find(n => n.id === id)
      if (notification) {
        await deleteNotification(id, getNotificationType(notification))
      }
    }
    setSelectedNotifications(new Set())
  }

  const getNotificationType = (notification: Notification): string => {
    if ('userId' in notification) return 'user'
    if ('signalId' in notification) return 'signal'
    if ('eventId' in notification) return 'event'
    return 'admin'
  }

  const applyFilters = () => {
    const filters: NotificationFilters = {}
    
    if (filterType !== 'all') {
      filters.type = filterType as any
    }
    
    if (filterRead === 'unread') {
      filters.read = false
    } else if (filterRead === 'read') {
      filters.read = true
    }

    setFilters(filters)
    setShowFiltersPanel(false)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('all')
    setFilterRead('all')
    setFilters({})
    setShowFiltersPanel(false)
  }

  const notificationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'welcome', label: 'Welcome' },
    { value: 'vip_approved', label: 'VIP Access' },
    { value: 'promotion', label: 'Promotion' },
    { value: 'announcement', label: 'Announcement' },
    { value: 'system', label: 'System' },
    { value: 'payment_reminder', label: 'Payment' },
    { value: 'signal', label: 'Signal' },
    { value: 'new_member', label: 'New Member' },
    { value: 'event_application', label: 'Event' }
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Notifications</h3>
          {stats && (
            <Badge variant="secondary">
              {stats.unread} unread
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshNotifications}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFiltersPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterRead} onValueChange={setFilterRead}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && selectedNotifications.size > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedNotifications.size === filteredNotifications.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedNotifications.size} selected
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkMarkAsRead}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Mark as Read
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <ScrollArea className={maxHeight}>
          <CardContent className="p-0">
            {loading && filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No notifications found</p>
                {searchQuery && (
                  <Button variant="outline" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-0">
                {Object.entries(groupedNotifications).map(([groupName, groupNotifications]) => (
                  <div key={groupName}>
                    <div className="sticky top-0 bg-background border-b px-4 py-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{groupName}</h4>
                    </div>
                    
                    <div className="space-y-0">
                      {groupNotifications.map((notification, index) => (
                        <div key={notification.id} className="relative">
                          {showBulkActions && (
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                              <Checkbox
                                checked={selectedNotifications.has(notification.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectNotification(notification.id, checked as boolean)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          
                          <div className={cn(showBulkActions && 'pl-10')}>
                            <NotificationItem
                              notification={notification}
                              onMarkAsRead={markAsRead}
                              onDelete={deleteNotification}
                              onActionClick={onNotificationClick}
                              showActions={!showBulkActions}
                              compact={compact}
                            />
                          </div>
                          
                          {index < groupNotifications.length - 1 && (
                            <Separator className="mx-4" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="p-4 border-t">
                    <Button
                      variant="outline"
                      onClick={loadMoreNotifications}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More Notifications'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  )
}

