export type EventType = 'discount_code' | 'service' | 'coaching' | 'live_trading'

export type EventStatus = 'active' | 'inactive' | 'completed' | 'cancelled'

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface Event {
  id: string
  title: string
  description: string
  eventType: EventType
  status: EventStatus
  capacity: number
  currentApplications: number
  startDate: string
  endDate: string
  isActive: boolean
  createdBy: string // Admin user ID
  createdAt: string
  updatedAt: string
  
  // Event-specific fields
  pricing?: string
  requirements?: string
  location?: string // For live trading sessions
  
  // Time slots for live trading events
  timeSlots?: TimeSlot[]
  
  // Discount code specific
  discountCode?: string
  discountPercentage?: number
  
  // Service/coaching specific
  duration?: string
  maxParticipants?: number
}

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  date: string
  capacity: number
  currentApplications: number
  isAvailable: boolean
}

export interface EventApplication {
  id: string
  eventId: string
  userId: string
  appliedAt: string
  status: ApplicationStatus
  userInfo: {
    displayName: string
    email: string
    role: string
  }
  selectedTimeSlot?: string // For live trading events
  notes?: string // Optional notes from user
  adminNotes?: string // Admin notes for approval/rejection
}

export interface AdminEventNotification {
  id: string
  type: 'event_application'
  title: string
  message: string
  eventId: string
  applicationId: string
  userId: string
  timestamp: Date
  read: boolean
  eventTitle: string
  applicantName: string
}

// Event type labels and icons for UI
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  discount_code: 'Discount Code',
  service: 'Service',
  coaching: 'Coaching Session',
  live_trading: 'Live Trading Session'
}

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  discount_code: 'Gift',
  service: 'Settings',
  coaching: 'GraduationCap',
  live_trading: 'TrendingUp'
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  discount_code: 'from-green-400 to-green-600',
  service: 'from-blue-400 to-blue-600',
  coaching: 'from-purple-400 to-purple-600',
  live_trading: 'from-orange-400 to-red-600'
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
}




