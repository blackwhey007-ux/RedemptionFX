import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  increment,
  onSnapshot,
  limit,
  getDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebaseConfig'
import { Event, EventApplication, AdminEventNotification, EventType, ApplicationStatus } from '@/types/event'

const EVENTS_COLLECTION = 'events'
const EVENT_APPLICATIONS_COLLECTION = 'event_applications'
const ADMIN_NOTIFICATIONS_COLLECTION = 'admin_notifications'

// Event CRUD Operations

export const getAllEvents = async (): Promise<Event[]> => {
  try {
    const q = query(collection(db, EVENTS_COLLECTION), orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      startDate: doc.data().startDate?.toDate?.()?.toISOString() || doc.data().startDate,
      endDate: doc.data().endDate?.toDate?.()?.toISOString() || doc.data().endDate
    })) as Event[]
    
    return events
  } catch (error) {
    console.error('Error getting all events:', error)
    throw new Error('Failed to get events')
  }
}

export const getActiveEvents = async (): Promise<Event[]> => {
  try {
    // Remove orderBy to avoid composite index requirement - sort in memory instead
    const q = query(
      collection(db, EVENTS_COLLECTION), 
      where('isActive', '==', true)
    )
    const querySnapshot = await getDocs(q)
    
    const events = querySnapshot.docs.map(doc => {
      try {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
          endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
        } as Event
      } catch (dateError) {
        console.error('Error converting dates for event:', doc.id, dateError)
        // Return event with fallback dates
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startDate: data.startDate || new Date().toISOString(),
          endDate: data.endDate || new Date().toISOString()
        } as Event
      }
    })
    
    // Sort by creation date in memory (newest first)
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    // Filter by date range in memory
    const now = new Date()
    return events.filter(event => {
      try {
        const startDate = event.startDate ? new Date(event.startDate) : null
        const endDate = event.endDate ? new Date(event.endDate) : null
        
        if (startDate && now < startDate) return false
        if (endDate && now > endDate) return false
        
        return true
      } catch (filterError) {
        console.error('Error filtering event by date:', event.id, filterError)
        return true // Include event if date filtering fails
      }
    })
  } catch (error) {
    console.error('Error getting active events:', error)
    throw new Error('Failed to get active events')
  }
}

export const getEventById = async (eventId: string): Promise<Event | null> => {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, eventId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        startDate: data.startDate?.toDate?.()?.toISOString() || data.startDate,
        endDate: data.endDate?.toDate?.()?.toISOString() || data.endDate
      } as Event
    }
    return null
  } catch (error) {
    console.error('Error getting event by ID:', error)
    throw new Error('Failed to get event')
  }
}

export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'currentApplications'>): Promise<string> => {
  try {
    console.log('Creating event with data:', eventData)
    
    // Prepare data with proper date handling
    const dataToSave: any = {
      title: eventData.title,
      description: eventData.description,
      eventType: eventData.eventType,
      status: eventData.status,
      capacity: eventData.capacity,
      currentApplications: 0,
      isActive: eventData.isActive,
      createdBy: eventData.createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    
    // Handle start date - convert ISO string to Timestamp
    if (eventData.startDate) {
      try {
        const startDateObj = new Date(eventData.startDate)
        if (!isNaN(startDateObj.getTime())) {
          dataToSave.startDate = Timestamp.fromDate(startDateObj)
        } else {
          throw new Error('Invalid start date')
        }
      } catch (e) {
        console.error('Error parsing start date:', e)
        throw new Error('Invalid start date format')
      }
    }
    
    // Handle end date - convert ISO string to Timestamp
    if (eventData.endDate) {
      try {
        const endDateObj = new Date(eventData.endDate)
        if (!isNaN(endDateObj.getTime())) {
          dataToSave.endDate = Timestamp.fromDate(endDateObj)
        } else {
          throw new Error('Invalid end date')
        }
      } catch (e) {
        console.error('Error parsing end date:', e)
        throw new Error('Invalid end date format')
      }
    }
    
    // Only add optional fields if they have values (not undefined)
    if (eventData.pricing !== undefined && eventData.pricing !== '') {
      dataToSave.pricing = eventData.pricing
    }
    if (eventData.requirements !== undefined && eventData.requirements !== '') {
      dataToSave.requirements = eventData.requirements
    }
    if (eventData.location !== undefined && eventData.location !== '') {
      dataToSave.location = eventData.location
    }
    if (eventData.discountCode !== undefined && eventData.discountCode !== '') {
      dataToSave.discountCode = eventData.discountCode
    }
    if (eventData.discountPercentage !== undefined && eventData.discountPercentage > 0) {
      dataToSave.discountPercentage = eventData.discountPercentage
    }
    if (eventData.duration !== undefined && eventData.duration !== '') {
      dataToSave.duration = eventData.duration
    }
    if (eventData.maxParticipants !== undefined && eventData.maxParticipants > 0) {
      dataToSave.maxParticipants = eventData.maxParticipants
    }
    
    console.log('Final data to save:', dataToSave)
    
    const docRef = await addDoc(collection(db, EVENTS_COLLECTION), dataToSave)
    
    console.log('Event created with ID:', docRef.id)
    return docRef.id
  } catch (error: any) {
    console.error('Error creating event:', error)
    const errorMessage = error?.message || 'Failed to create event'
    throw new Error(errorMessage)
  }
}

export const updateEvent = async (eventId: string, eventData: Partial<Event>): Promise<void> => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId)
    const updateData: any = {
      ...eventData,
      updatedAt: serverTimestamp()
    }
    
    // Handle start date - convert ISO string to Timestamp
    if (eventData.startDate !== undefined) {
      if (eventData.startDate) {
        try {
          const startDateObj = new Date(eventData.startDate)
          if (!isNaN(startDateObj.getTime())) {
            updateData.startDate = Timestamp.fromDate(startDateObj)
          } else {
            throw new Error('Invalid start date')
          }
        } catch (e) {
          console.error('Error parsing start date:', e)
          throw new Error('Invalid start date format')
        }
      } else {
        updateData.startDate = null
      }
    }
    
    // Handle end date - convert ISO string to Timestamp
    if (eventData.endDate !== undefined) {
      if (eventData.endDate) {
        try {
          const endDateObj = new Date(eventData.endDate)
          if (!isNaN(endDateObj.getTime())) {
            updateData.endDate = Timestamp.fromDate(endDateObj)
          } else {
            throw new Error('Invalid end date')
          }
        } catch (e) {
          console.error('Error parsing end date:', e)
          throw new Error('Invalid end date format')
        }
      } else {
        updateData.endDate = null
      }
    }
    
    await updateDoc(eventRef, updateData)
    console.log('Event updated:', eventId)
  } catch (error) {
    console.error('Error updating event:', error)
    throw new Error('Failed to update event')
  }
}

export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    // Delete all applications for this event first
    const applicationsQuery = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      where('eventId', '==', eventId)
    )
    const applicationsSnapshot = await getDocs(applicationsQuery)
    
    const batch = writeBatch(db)
    applicationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    // Delete the event
    const eventRef = doc(db, EVENTS_COLLECTION, eventId)
    batch.delete(eventRef)
    
    await batch.commit()
    console.log('Event and related applications deleted:', eventId)
  } catch (error) {
    console.error('Error deleting event:', error)
    throw new Error('Failed to delete event')
  }
}

export const toggleEventStatus = async (eventId: string, isActive: boolean): Promise<void> => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId)
    await updateDoc(eventRef, {
      isActive,
      updatedAt: serverTimestamp()
    })
    console.log('Event status toggled:', eventId, isActive)
  } catch (error) {
    console.error('Error toggling event status:', error)
    throw new Error('Failed to toggle event status')
  }
}

// Event Application Operations

export const getEventApplications = async (eventId: string): Promise<EventApplication[]> => {
  try {
    const q = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      where('eventId', '==', eventId),
      orderBy('appliedAt', 'asc') // First-come-first-served order
    )
    
    const querySnapshot = await getDocs(q)
    const applications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedAt: doc.data().appliedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as EventApplication[]
    
    return applications
  } catch (error) {
    console.error('Error getting event applications:', error)
    throw new Error('Failed to get event applications')
  }
}

export const getAllApplications = async (): Promise<EventApplication[]> => {
  try {
    const q = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      orderBy('appliedAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const applications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      appliedAt: doc.data().appliedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    })) as EventApplication[]
    
    return applications
  } catch (error) {
    console.error('Error getting all applications:', error)
    throw new Error('Failed to get applications')
  }
}

export const getUserApplications = async (userId: string): Promise<EventApplication[]> => {
  try {
    // Remove orderBy to avoid composite index requirement - sort in memory instead
    const q = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const applications = querySnapshot.docs.map(doc => {
      try {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          appliedAt: data.appliedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        } as EventApplication
      } catch (dateError) {
        console.error('Error converting dates for application:', doc.id, dateError)
        // Return application with fallback date
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          appliedAt: new Date().toISOString()
        } as EventApplication
      }
    })
    
    // Sort by applied date in memory (newest first)
    applications.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
    
    return applications
  } catch (error) {
    console.error('Error getting user applications:', error)
    throw new Error('Failed to get user applications')
  }
}

export const applyToEvent = async (
  eventId: string, 
  userId: string, 
  userInfo: { displayName: string; email: string; role: string },
  selectedTimeSlot?: string,
  notes?: string
): Promise<string> => {
  try {
    // Check if event exists and has capacity
    const event = await getEventById(eventId)
    if (!event) {
      throw new Error('Event not found')
    }
    
    if (!event.isActive) {
      throw new Error('Event is not active')
    }
    
    if (event.currentApplications >= event.capacity) {
      throw new Error('Event is at full capacity')
    }
    
    // Check if user already applied
    const existingApplicationQuery = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      where('eventId', '==', eventId),
      where('userId', '==', userId)
    )
    const existingApplicationSnapshot = await getDocs(existingApplicationQuery)
    
    if (!existingApplicationSnapshot.empty) {
      throw new Error('You have already applied to this event')
    }
    
    // Create application - only include defined fields to avoid Firestore undefined value errors
    const applicationData: any = {
      eventId,
      userId,
      appliedAt: serverTimestamp(),
      status: 'pending' as ApplicationStatus,
      userInfo
    }
    
    // Only add optional fields if they have values
    if (selectedTimeSlot !== undefined && selectedTimeSlot !== '') {
      applicationData.selectedTimeSlot = selectedTimeSlot
    }
    if (notes !== undefined && notes !== '') {
      applicationData.notes = notes
    }
    
    const docRef = await addDoc(collection(db, EVENT_APPLICATIONS_COLLECTION), applicationData)
    
    // Update event application count
    const eventRef = doc(db, EVENTS_COLLECTION, eventId)
    await updateDoc(eventRef, {
      currentApplications: increment(1),
      updatedAt: serverTimestamp()
    })
    
    // Create admin notification
    await createAdminNotification({
      type: 'event_application',
      title: 'New Event Application',
      message: `${userInfo.displayName} applied to "${event.title}"`,
      eventId,
      applicationId: docRef.id,
      userId,
      eventTitle: event.title,
      applicantName: userInfo.displayName
    })
    
    console.log('Application created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error applying to event:', error)
    throw error
  }
}

export const updateApplicationStatus = async (
  applicationId: string, 
  status: ApplicationStatus,
  adminNotes?: string
): Promise<void> => {
  try {
    const applicationRef = doc(db, EVENT_APPLICATIONS_COLLECTION, applicationId)
    const updateData: any = {
      status,
      updatedAt: serverTimestamp()
    }
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes
    }
    
    await updateDoc(applicationRef, updateData)
    console.log('Application status updated:', applicationId, status)
  } catch (error) {
    console.error('Error updating application status:', error)
    throw new Error('Failed to update application status')
  }
}

export const cancelApplication = async (applicationId: string): Promise<void> => {
  try {
    // Get application to update event count
    const applicationRef = doc(db, EVENT_APPLICATIONS_COLLECTION, applicationId)
    const applicationSnap = await getDoc(applicationRef)
    
    if (applicationSnap.exists()) {
      const applicationData = applicationSnap.data()
      
      // Update application status
      await updateDoc(applicationRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      })
      
      // Decrease event application count
      const eventRef = doc(db, EVENTS_COLLECTION, applicationData.eventId)
      await updateDoc(eventRef, {
        currentApplications: increment(-1),
        updatedAt: serverTimestamp()
      })
      
      console.log('Application cancelled:', applicationId)
    }
  } catch (error) {
    console.error('Error cancelling application:', error)
    throw new Error('Failed to cancel application')
  }
}

// Admin Notification Operations

export const createAdminNotification = async (notificationData: Omit<AdminEventNotification, 'id' | 'timestamp' | 'read'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, ADMIN_NOTIFICATIONS_COLLECTION), {
      ...notificationData,
      timestamp: serverTimestamp(),
      read: false
    })
    
    console.log('Admin notification created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating admin notification:', error)
    throw new Error('Failed to create admin notification')
  }
}

export const getAdminNotifications = async (): Promise<AdminEventNotification[]> => {
  try {
    const q = query(
      collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(50)
    )
    
    const querySnapshot = await getDocs(q)
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date()
    })) as AdminEventNotification[]
    
    return notifications
  } catch (error) {
    console.error('Error getting admin notifications:', error)
    throw new Error('Failed to get admin notifications')
  }
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, ADMIN_NOTIFICATIONS_COLLECTION, notificationId)
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: serverTimestamp()
    })
    console.log('Notification marked as read:', notificationId)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw new Error('Failed to mark notification as read')
  }
}

// Real-time listeners

export const subscribeToActiveEvents = (callback: (events: Event[]) => void) => {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    )

    return onSnapshot(q, (querySnapshot) => {
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        startDate: doc.data().startDate?.toDate?.()?.toISOString() || doc.data().startDate,
        endDate: doc.data().endDate?.toDate?.()?.toISOString() || doc.data().endDate
      })) as Event[]

      // Filter by date range
      const now = new Date()
      const filteredEvents = events.filter(event => {
        const startDate = event.startDate ? new Date(event.startDate) : null
        const endDate = event.endDate ? new Date(event.endDate) : null
        
        if (startDate && now < startDate) return false
        if (endDate && now > endDate) return false
        
        return true
      })

      callback(filteredEvents)
    })
  } catch (error) {
    console.error('Error subscribing to events:', error)
    callback([])
  }
}

export const subscribeToEventApplications = (eventId: string, callback: (applications: EventApplication[]) => void) => {
  try {
    const q = query(
      collection(db, EVENT_APPLICATIONS_COLLECTION),
      where('eventId', '==', eventId),
      orderBy('appliedAt', 'asc')
    )

    return onSnapshot(q, (querySnapshot) => {
      const applications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        appliedAt: doc.data().appliedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      })) as EventApplication[]

      callback(applications)
    })
  } catch (error) {
    console.error('Error subscribing to event applications:', error)
    callback([])
  }
}

export const subscribeToAdminNotifications = (callback: (notifications: AdminEventNotification[]) => void) => {
  try {
    const q = query(
      collection(db, ADMIN_NOTIFICATIONS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(50)
    )

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      })) as AdminEventNotification[]

      callback(notifications)
    })
  } catch (error) {
    console.error('Error subscribing to admin notifications:', error)
    callback([])
  }
}
