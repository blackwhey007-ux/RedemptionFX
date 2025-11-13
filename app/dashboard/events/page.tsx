'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { 
  getActiveEvents, 
  applyToEvent,
  getUserApplications
} from '@/lib/eventService'
import { 
  Event, 
  EventApplication, 
  EventType,
  EVENT_TYPE_LABELS, 
  EVENT_TYPE_ICONS,
  EVENT_TYPE_COLORS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS
} from '@/types/event'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardDecorativeOrb } from '@/components/ui/card'
import { StatsCard } from '@/components/ui/stats-card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Users,
  Clock,
  Gift,
  Settings,
  GraduationCap,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  XCircle
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

export default function EventsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [events, setEvents] = useState<Event[]>([])
  const [userApplications, setUserApplications] = useState<EventApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [applyingToEvent, setApplyingToEvent] = useState<string | null>(null)
  const [showApplyDialog, setShowApplyDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [applicationNotes, setApplicationNotes] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in')
    }
  }, [user, authLoading, router])

  // Load data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('Starting to load events and applications...')
      
      // Load events and applications separately to identify which one fails
      let eventsData: Event[] = []
      let applicationsData: EventApplication[] = []
      
      try {
        console.log('Loading active events...')
        eventsData = await getActiveEvents()
        console.log('Successfully loaded events:', eventsData.length)
      } catch (eventsError) {
        console.error('Error loading events:', eventsError)
        toast.error('Failed to load events')
        throw eventsError
      }
      
      try {
        console.log('Loading user applications...')
        applicationsData = await getUserApplications(user?.uid || '')
        console.log('Successfully loaded applications:', applicationsData.length)
      } catch (applicationsError) {
        console.error('Error loading applications:', applicationsError)
        // Don't throw here - we can still show events even if applications fail
        toast.error('Failed to load your applications')
      }
      
      setEvents(eventsData)
      setUserApplications(applicationsData)
      console.log('Data loading completed successfully')
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyToEvent = async (event: Event) => {
    if (!user) return
    
    setSelectedEvent(event)
    setApplicationNotes('')
    setShowApplyDialog(true)
  }

  const confirmApplication = async () => {
    if (!selectedEvent || !user) return

    try {
      setApplyingToEvent(selectedEvent.id)
      
      await applyToEvent(
        selectedEvent.id,
        user.uid,
        {
          displayName: user.displayName || user.email || 'Unknown User',
          email: user.email || '',
          role: user.role || 'guest'
        },
        undefined, // No time slot selection for now
        applicationNotes && applicationNotes.trim() !== '' ? applicationNotes : undefined
      )
      
      toast.success('Application submitted successfully!')
      setShowApplyDialog(false)
      setSelectedEvent(null)
      setApplicationNotes('')
      loadData() // Refresh data to show updated applications
    } catch (error: any) {
      console.error('Error applying to event:', error)
      toast.error(error.message || 'Failed to apply to event')
    } finally {
      setApplyingToEvent(null)
    }
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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserApplicationForEvent = (eventId: string) => {
    return userApplications.find(app => app.eventId === eventId)
  }

  const isEventFull = (event: Event) => {
    return event.currentApplications >= event.capacity
  }

  const getRemainingSpots = (event: Event) => {
    return event.capacity - event.currentApplications
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const pendingCount = userApplications.filter(app => app.status === 'pending').length
  const approvedCount = userApplications.filter(app => app.status === 'approved').length

  return (
    <div className="max-w-7xl mx-auto space-y-6 w-full box-border">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-500" />
          Events
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Apply to events and track your applications
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Available Events"
          value={events.length}
          trend="Open for registration"
          icon={Calendar}
          decorativeColor="blue"
        />
        <StatsCard
          title="My Applications"
          value={userApplications.length}
          trend={`${approvedCount} approved, ${pendingCount} pending`}
          icon={Users}
          decorativeColor="green"
        />
        <StatsCard
          title="Pending Review"
          value={pendingCount}
          trend="Awaiting approval"
          icon={AlertCircle}
          decorativeColor="gold"
        />
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="available">Available Events ({events.length})</TabsTrigger>
          <TabsTrigger value="my-applications">My Applications ({userApplications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6">

          {/* Events Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const IconComponent = getIcon(EVENT_TYPE_ICONS[event.eventType])
              const colorClass = EVENT_TYPE_COLORS[event.eventType]
              const userApplication = getUserApplicationForEvent(event.id)
              const isFull = isEventFull(event)
              const remainingSpots = getRemainingSpots(event)

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
                      {isFull && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          Full
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="relative">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                      {event.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Spots:
                        </span>
                        <span className={`font-medium ${isFull ? 'text-red-600' : remainingSpots <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {remainingSpots} remaining
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Start:
                        </span>
                        <span className="font-medium">{formatDateShort(event.startDate)}</span>
                      </div>
                      {event.pricing && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium text-green-600">{event.pricing}</span>
                        </div>
                      )}
                    </div>

                    {/* Application Status or Apply Button */}
                    {userApplication ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge className={APPLICATION_STATUS_COLORS[userApplication.status]}>
                            {APPLICATION_STATUS_LABELS[userApplication.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Applied:</span>
                          <span className="font-medium">{formatDateShort(userApplication.appliedAt)}</span>
                        </div>
                        {userApplication.status === 'pending' && (
                          <div className="flex items-center gap-1 text-yellow-600 text-sm">
                            <AlertCircle className="w-3 h-3" />
                            First-come-first-served
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleApplyToEvent(event)}
                        disabled={isFull}
                        className={`w-full ${
                          isFull 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : `bg-gradient-to-r ${colorClass} hover:opacity-90 text-white`
                        }`}
                      >
                        {isFull ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Event Full
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Apply Now
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {events.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Available</h3>
                <p className="text-muted-foreground">
                  Check back later for new events and opportunities.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-applications" className="space-y-6">
          <div className="space-y-4">
            {userApplications.map((application) => {
              const event = events.find(e => e.id === application.eventId)
              if (!event) return null

              const IconComponent = getIcon(EVENT_TYPE_ICONS[event.eventType])
              const colorClass = EVENT_TYPE_COLORS[event.eventType]

              return (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass} shadow-lg`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {EVENT_TYPE_LABELS[event.eventType]}
                          </p>
                        </div>
                      </div>
                      <Badge className={APPLICATION_STATUS_COLORS[application.status]}>
                        {APPLICATION_STATUS_LABELS[application.status]}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Applied On</p>
                        <p className="font-medium">{formatDate(application.appliedAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Event Start</p>
                        <p className="font-medium">{formatDate(event.startDate)}</p>
                      </div>
                      {event.pricing && (
                        <div>
                          <p className="text-sm text-muted-foreground">Price</p>
                          <p className="font-medium text-green-600">{event.pricing}</p>
                        </div>
                      )}
                    </div>

                    {application.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">Your Notes</p>
                        <p className="text-sm bg-muted p-2 rounded">{application.notes}</p>
                      </div>
                    )}

                    {application.adminNotes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Admin Notes</p>
                        <p className="text-sm bg-muted p-2 rounded">{application.adminNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {userApplications.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground">
                  Apply to available events to see your applications here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Apply to Event Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to Event</DialogTitle>
            <DialogDescription>
              Apply to "{selectedEvent?.title}" - First-come-first-served basis
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Event:</strong> {selectedEvent?.title}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Type:</strong> {selectedEvent && EVENT_TYPE_LABELS[selectedEvent.eventType]}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Start:</strong> {selectedEvent && formatDate(selectedEvent.startDate)}
              </p>
              {selectedEvent?.pricing && (
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Price:</strong> {selectedEvent.pricing}
                </p>
              )}
              <div className="flex items-center gap-2 text-yellow-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Applications are processed on a first-come-first-served basis</span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Any additional information or questions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmApplication}
              disabled={applyingToEvent === selectedEvent?.id}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {applyingToEvent === selectedEvent?.id ? 'Applying...' : 'Apply Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
