'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  getAllEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent, 
  toggleEventStatus,
  getEventApplications,
  getAllApplications,
  updateApplicationStatus,
  markNotificationAsRead
} from '@/lib/eventService'
import { 
  Event, 
  EventApplication, 
  EventType, 
  ApplicationStatus,
  EVENT_TYPE_LABELS, 
  EVENT_TYPE_ICONS,
  EVENT_TYPE_COLORS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS
} from '@/types/event'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Gift,
  Settings,
  GraduationCap,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

const getIcon = (iconName: string) => {
  const iconMap = {
    Gift,
    Settings,
    GraduationCap,
    TrendingUp
  }
  return iconMap[iconName as keyof typeof iconMap] || Gift
}

export default function AdminEventsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [events, setEvents] = useState<Event[]>([])
  const [applications, setApplications] = useState<EventApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<EventApplication | null>(null)
  const [eventApplications, setEventApplications] = useState<EventApplication[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'discount_code' as EventType,
    capacity: 10,
    startDate: null as Date | null,
    endDate: null as Date | null,
    pricing: '',
    requirements: '',
    location: '',
    discountCode: '',
    discountPercentage: 0,
    duration: '',
    maxParticipants: 5
  })

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Load data
  useEffect(() => {
    if (user?.role === 'admin') {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const [eventsData, applicationsData] = await Promise.all([
        getAllEvents(),
        getAllApplications()
      ])
      setEvents(eventsData)
      setApplications(applicationsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    try {
      if (!user?.uid) return

      // Validate required fields
      if (!formData.title || !formData.description) {
        toast.error('Please fill in title and description')
        return
      }

      if (!formData.startDate || !formData.endDate) {
        toast.error('Please select start and end dates')
        return
      }

      console.log('Form data before creating event:', formData)
      console.log('Start date type:', typeof formData.startDate, 'Value:', formData.startDate)
      console.log('End date type:', typeof formData.endDate, 'Value:', formData.endDate)

      const eventData: any = {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        status: 'active' as const,
        capacity: formData.capacity,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        isActive: true,
        createdBy: user.uid
      }

      // Only add optional fields if they have values
      if (formData.pricing && formData.pricing.trim() !== '') {
        eventData.pricing = formData.pricing
      }
      if (formData.requirements && formData.requirements.trim() !== '') {
        eventData.requirements = formData.requirements
      }
      if (formData.location && formData.location.trim() !== '') {
        eventData.location = formData.location
      }
      if (formData.discountCode && formData.discountCode.trim() !== '') {
        eventData.discountCode = formData.discountCode
      }
      if (formData.discountPercentage && formData.discountPercentage > 0) {
        eventData.discountPercentage = formData.discountPercentage
      }
      if (formData.duration && formData.duration.trim() !== '') {
        eventData.duration = formData.duration
      }
      if (formData.maxParticipants && formData.maxParticipants > 0) {
        eventData.maxParticipants = formData.maxParticipants
      }

      console.log('Event data to be sent:', eventData)

      await createEvent(eventData)
      toast.success('Event created successfully')
      setShowCreateDialog(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error creating event:', error)
      toast.error(error?.message || 'Failed to create event')
    }
  }

  const handleUpdateEvent = async () => {
    try {
      if (!selectedEvent) return

      await updateEvent(selectedEvent.id, {
        title: formData.title,
        description: formData.description,
        eventType: formData.eventType,
        capacity: formData.capacity,
        startDate: formData.startDate?.toISOString(),
        endDate: formData.endDate?.toISOString(),
        pricing: formData.pricing || undefined,
        requirements: formData.requirements || undefined,
        location: formData.location || undefined,
        discountCode: formData.discountCode || undefined,
        discountPercentage: formData.discountPercentage || undefined,
        duration: formData.duration || undefined,
        maxParticipants: formData.maxParticipants || undefined
      })

      toast.success('Event updated successfully')
      setShowEditDialog(false)
      setSelectedEvent(null)
      resetForm()
      loadData()
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error('Failed to update event')
    }
  }

  const handleDeleteEvent = async () => {
    try {
      if (!selectedEvent) return

      await deleteEvent(selectedEvent.id)
      toast.success('Event deleted successfully')
      setShowDeleteDialog(false)
      setSelectedEvent(null)
      loadData()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  const handleToggleStatus = async (event: Event) => {
    try {
      await toggleEventStatus(event.id, !event.isActive)
      toast.success(`Event ${event.isActive ? 'deactivated' : 'activated'}`)
      loadData()
    } catch (error) {
      console.error('Error toggling event status:', error)
      toast.error('Failed to update event status')
    }
  }

  const handleViewApplications = async (event: Event) => {
    try {
      const apps = await getEventApplications(event.id)
      setEventApplications(apps)
      setSelectedEvent(event)
      setShowApplicationsDialog(true)
    } catch (error) {
      console.error('Error loading applications:', error)
      toast.error('Failed to load applications')
    }
  }

  const handleUpdateApplicationStatus = async (applicationId: string, status: ApplicationStatus) => {
    try {
      await updateApplicationStatus(applicationId, status)
      toast.success('Application status updated')
      loadData()
      if (selectedEvent) {
        const apps = await getEventApplications(selectedEvent.id)
        setEventApplications(apps)
      }
    } catch (error) {
      console.error('Error updating application status:', error)
      toast.error('Failed to update application status')
    }
  }

  const handleEditClick = (event: Event) => {
    setSelectedEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      capacity: event.capacity,
      startDate: event.startDate ? new Date(event.startDate) : null,
      endDate: event.endDate ? new Date(event.endDate) : null,
      pricing: event.pricing || '',
      requirements: event.requirements || '',
      location: event.location || '',
      discountCode: event.discountCode || '',
      discountPercentage: event.discountPercentage || 0,
      duration: event.duration || '',
      maxParticipants: event.maxParticipants || 5
    })
    setShowEditDialog(true)
  }

  const handleDeleteClick = (event: Event) => {
    setSelectedEvent(event)
    setShowDeleteDialog(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventType: 'discount_code',
      capacity: 10,
      startDate: null,
      endDate: null,
      pricing: '',
      requirements: '',
      location: '',
      discountCode: '',
      discountPercentage: 0,
      duration: '',
      maxParticipants: 5
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  const pendingApplications = applications.filter(app => app.status === 'pending').length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 shadow-xl shadow-red-500/20 mb-8">
        <CardHeader>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Calendar className="w-6 h-6 text-red-500" />
              Event Management System
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Manage events, track applications, and monitor capacity
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Events</p>
                <p className="text-2xl font-bold">{events.filter(e => e.isActive).length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingApplications}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Events
        </h2>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const IconComponent = getIcon(EVENT_TYPE_ICONS[event.eventType])
          const colorClass = EVENT_TYPE_COLORS[event.eventType]

          return (
            <Card key={event.id} className="relative group overflow-hidden hover:shadow-xl transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass} shadow-lg`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={event.isActive ? "default" : "secondary"}
                      className={event.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : ""}
                    >
                      {event.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                  {event.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span className="font-medium">{event.currentApplications}/{event.capacity}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Start:</span>
                    <span className="font-medium">{formatDate(event.startDate)}</span>
                  </div>
                  {event.pricing && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{event.pricing}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewApplications(event)}
                    className="flex-1"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Applications
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(event)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(event)}
                    className={event.isActive ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                  >
                    {event.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(event)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create a new event for users to apply to
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Live Trading Session"
                />
              </div>
              <div>
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value) => setFormData({...formData, eventType: value as EventType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="pricing">Pricing (Optional)</Label>
                <Input
                  id="pricing"
                  value={formData.pricing}
                  onChange={(e) => setFormData({...formData, pricing: e.target.value})}
                  placeholder="e.g., $50 or Free"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <DateTimePicker
                  label="Start Date & Time"
                  value={formData.startDate}
                  onChange={(date) => setFormData({...formData, startDate: date})}
                  placeholder="Select start date and time"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">When the event starts</p>
              </div>
              <div>
                <DateTimePicker
                  label="End Date & Time"
                  value={formData.endDate}
                  onChange={(date) => setFormData({...formData, endDate: date})}
                  placeholder="Select end date and time"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">When the event ends</p>
              </div>
            </div>

            {formData.eventType === 'discount_code' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discountCode">Discount Code</Label>
                  <Input
                    id="discountCode"
                    value={formData.discountCode}
                    onChange={(e) => setFormData({...formData, discountCode: e.target.value})}
                    placeholder="e.g., SAVE50"
                  />
                </div>
                <div>
                  <Label htmlFor="discountPercentage">Discount %</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({...formData, discountPercentage: parseInt(e.target.value) || 0})}
                    placeholder="50"
                  />
                </div>
              </div>
            )}

            {formData.eventType === 'live_trading' && (
              <div>
                <Label htmlFor="location">Location/Platform</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Discord, Zoom, etc."
                />
              </div>
            )}

            <div>
              <Label htmlFor="requirements">Requirements (Optional)</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                placeholder="Any requirements for participants..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Live Trading Session"
                />
              </div>
              <div>
                <Label htmlFor="edit-eventType">Event Type</Label>
                <Select value={formData.eventType} onValueChange={(value) => setFormData({...formData, eventType: value as EventType})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="edit-pricing">Pricing (Optional)</Label>
                <Input
                  id="edit-pricing"
                  value={formData.pricing}
                  onChange={(e) => setFormData({...formData, pricing: e.target.value})}
                  placeholder="e.g., $50 or Free"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <DateTimePicker
                  label="Start Date & Time"
                  value={formData.startDate}
                  onChange={(date) => setFormData({...formData, startDate: date})}
                  placeholder="Select start date and time"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">When the event starts</p>
              </div>
              <div>
                <DateTimePicker
                  label="End Date & Time"
                  value={formData.endDate}
                  onChange={(date) => setFormData({...formData, endDate: date})}
                  placeholder="Select end date and time"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">When the event ends</p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-requirements">Requirements (Optional)</Label>
              <Textarea
                id="edit-requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                placeholder="Any requirements for participants..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEvent}>
              Update Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Applications Dialog */}
      <Dialog open={showApplicationsDialog} onOpenChange={setShowApplicationsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Applications</DialogTitle>
            <DialogDescription>
              Applications for "{selectedEvent?.title}" (First-come-first-served order)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {eventApplications.map((application, index) => (
              <Card key={application.id} className={`${index === 0 ? 'ring-2 ring-green-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{application.userInfo.displayName}</h4>
                        <p className="text-sm text-muted-foreground">{application.userInfo.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={APPLICATION_STATUS_COLORS[application.status]}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(application.appliedAt)}
                      </span>
                    </div>
                  </div>
                  
                  {application.notes && (
                    <p className="text-sm text-muted-foreground mb-2">{application.notes}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateApplicationStatus(application.id, 'approved')}
                      disabled={application.status !== 'pending'}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleUpdateApplicationStatus(application.id, 'rejected')}
                      disabled={application.status !== 'pending'}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {eventApplications.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No applications yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This will also delete all related applications and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
