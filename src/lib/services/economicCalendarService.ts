import { EconomicEvent, EconomicCalendarData, EconomicCalendarPreferences } from '@/types/economic-calendar'
import { db } from '@/lib/firebaseConfig'
import { doc, getDoc, setDoc } from 'firebase/firestore'

// Sample static data for fallback
const SAMPLE_EVENTS: EconomicEvent[] = [
  {
    id: '1',
    date: new Date(),
    time: '08:30',
    country: 'USD',
    currency: 'USD',
    event: 'Non-Farm Payrolls',
    impact: 'high',
    forecast: '200K',
    previous: '187K',
    description: 'Change in the number of employed people during the previous month',
    timezone: 'EST'
  },
  {
    id: '2',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    time: '10:00',
    country: 'EUR',
    currency: 'EUR',
    event: 'GDP Growth Rate',
    impact: 'medium',
    forecast: '0.3%',
    previous: '0.2%',
    description: 'Quarterly change in gross domestic product',
    timezone: 'CET'
  },
  {
    id: '3',
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    time: '14:00',
    country: 'GBP',
    currency: 'GBP',
    event: 'Bank of England Interest Rate Decision',
    impact: 'high',
    forecast: '5.25%',
    previous: '5.00%',
    description: 'Central bank interest rate decision',
    timezone: 'GMT'
  },
  {
    id: '4',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    time: '09:00',
    country: 'JPY',
    currency: 'JPY',
    event: 'Unemployment Rate',
    impact: 'low',
    forecast: '2.5%',
    previous: '2.6%',
    description: 'Percentage of unemployed workers in the labor force',
    timezone: 'JST'
  }
]

class EconomicCalendarService {
  private static instance: EconomicCalendarService
  private cache: Map<string, EconomicCalendarData> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  static getInstance(): EconomicCalendarService {
    if (!EconomicCalendarService.instance) {
      EconomicCalendarService.instance = new EconomicCalendarService()
    }
    return EconomicCalendarService.instance
  }

  async getEconomicEvents(filters?: {
    dateRange?: string
    countries?: string[]
    impactLevels?: string[]
    eventTypes?: string[]
  }): Promise<EconomicEvent[]> {
    try {
      // Try to fetch from API first
      const apiData = await this.fetchFromAPI(filters)
      if (apiData && apiData.events.length > 0) {
        return apiData.events
      }
    } catch (error) {
      console.warn('Failed to fetch from API, using fallback data:', error)
    }

    // Fallback to sample data
    return this.filterEvents(SAMPLE_EVENTS, filters)
  }

  private async fetchFromAPI(filters?: any): Promise<EconomicCalendarData | null> {
    const cacheKey = JSON.stringify(filters || {})
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_DURATION) {
      return cached
    }

    try {
      const params = new URLSearchParams()
      if (filters?.dateRange) params.append('dateRange', filters.dateRange)
      if (filters?.countries) params.append('countries', filters.countries.join(','))
      if (filters?.impactLevels) params.append('impactLevels', filters.impactLevels.join(','))
      if (filters?.eventTypes) params.append('eventTypes', filters.eventTypes.join(','))

      const response = await fetch(`/api/economic-calendar?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const calendarData: EconomicCalendarData = {
        events: data.events.map((event: any) => ({
          ...event,
          date: new Date(event.date)
        })),
        lastUpdated: new Date(),
        source: 'api'
      }

      this.cache.set(cacheKey, calendarData)
      return calendarData
    } catch (error) {
      console.error('Error fetching from API:', error)
      return null
    }
  }

  private filterEvents(events: EconomicEvent[], filters?: any): EconomicEvent[] {
    if (!filters) return events

    return events.filter(event => {
      // Filter by countries
      if (filters.countries && filters.countries.length > 0) {
        if (!filters.countries.includes(event.country)) return false
      }

      // Filter by impact levels
      if (filters.impactLevels && filters.impactLevels.length > 0) {
        if (!filters.impactLevels.includes(event.impact)) return false
      }

      // Filter by event types
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        const eventType = this.getEventType(event.event)
        if (!filters.eventTypes.includes(eventType)) return false
      }

      // Filter by date range
      if (filters.dateRange) {
        const now = new Date()
        const eventDate = new Date(event.date)
        
        switch (filters.dateRange) {
          case 'today':
            return eventDate.toDateString() === now.toDateString()
          case 'week':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
            return eventDate >= now && eventDate <= weekFromNow
          case 'month':
            const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            return eventDate >= now && eventDate <= monthFromNow
          default:
            return true
        }
      }

      return true
    })
  }

  private getEventType(eventName: string): string {
    const name = eventName.toLowerCase()
    
    if (name.includes('gdp')) return 'GDP'
    if (name.includes('employment') || name.includes('payroll') || name.includes('unemployment')) return 'Employment'
    if (name.includes('interest') || name.includes('rate')) return 'Interest Rates'
    if (name.includes('inflation') || name.includes('cpi') || name.includes('ppi')) return 'Inflation'
    if (name.includes('trade') || name.includes('balance')) return 'Trade Balance'
    if (name.includes('confidence')) return 'Consumer Confidence'
    if (name.includes('manufacturing') || name.includes('pmi')) return 'Manufacturing'
    if (name.includes('retail') || name.includes('sales')) return 'Retail Sales'
    if (name.includes('housing') || name.includes('home')) return 'Housing'
    if (name.includes('central bank') || name.includes('federal reserve') || name.includes('bank of')) return 'Central Bank'
    if (name.includes('government') || name.includes('budget')) return 'Government'
    
    return 'Other'
  }

  async getUserPreferences(userId: string): Promise<EconomicCalendarPreferences | null> {
    try {
      const docRef = doc(db, 'economicCalendarPreferences', userId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          ...data,
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        } as EconomicCalendarPreferences
      }
      
      return null
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  async saveUserPreferences(userId: string, preferences: Partial<EconomicCalendarPreferences>): Promise<void> {
    try {
      const docRef = doc(db, 'economicCalendarPreferences', userId)
      await setDoc(docRef, {
        ...preferences,
        userId,
        lastUpdated: new Date()
      }, { merge: true })
    } catch (error) {
      console.error('Error saving user preferences:', error)
      throw error
    }
  }

  async checkForHighImpactEvents(userId: string): Promise<EconomicEvent[]> {
    try {
      const preferences = await this.getUserPreferences(userId)
      if (!preferences?.enabledNotifications) return []

      const events = await this.getEconomicEvents({
        impactLevels: preferences.highImpactOnly ? ['high'] : ['medium', 'high'],
        countries: preferences.selectedCountries,
        eventTypes: preferences.selectedEventTypes
      })

      const now = new Date()
      const notificationTime = preferences.notificationTime || 30 // 30 minutes default

      return events.filter(event => {
        const eventTime = new Date(event.date)
        const timeDiff = eventTime.getTime() - now.getTime()
        const minutesUntilEvent = timeDiff / (1000 * 60)
        
        return minutesUntilEvent > 0 && minutesUntilEvent <= notificationTime
      })
    } catch (error) {
      console.error('Error checking for high impact events:', error)
      return []
    }
  }
}

export const economicCalendarService = EconomicCalendarService.getInstance()
