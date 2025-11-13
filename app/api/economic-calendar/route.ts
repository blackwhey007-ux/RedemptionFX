import { NextRequest, NextResponse } from 'next/server'
import { EconomicEvent } from '@/types/economic-calendar'

// Sample API data - in production, this would fetch from a real economic calendar API
const SAMPLE_API_EVENTS: EconomicEvent[] = [
  {
    id: 'api-1',
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
    id: 'api-2',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000),
    time: '10:00',
    country: 'EUR',
    currency: 'EUR',
    event: 'GDP Growth Rate Q3',
    impact: 'medium',
    forecast: '0.3%',
    previous: '0.2%',
    description: 'Quarterly change in gross domestic product',
    timezone: 'CET'
  },
  {
    id: 'api-3',
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
    id: 'api-4',
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
  },
  {
    id: 'api-5',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    time: '13:30',
    country: 'USD',
    currency: 'USD',
    event: 'Consumer Price Index (CPI)',
    impact: 'high',
    forecast: '3.2%',
    previous: '3.0%',
    description: 'Monthly change in the price of goods and services',
    timezone: 'EST'
  },
  {
    id: 'api-6',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    time: '10:30',
    country: 'EUR',
    currency: 'EUR',
    event: 'Retail Sales',
    impact: 'medium',
    forecast: '0.4%',
    previous: '0.1%',
    description: 'Monthly change in retail sales volume',
    timezone: 'CET'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const dateRange = searchParams.get('dateRange') || 'week'
    const countries = searchParams.get('countries')?.split(',') || []
    const impactLevels = searchParams.get('impactLevels')?.split(',') || []
    const eventTypes = searchParams.get('eventTypes')?.split(',') || []

    // Filter events based on parameters
    let filteredEvents = SAMPLE_API_EVENTS

    // Filter by countries
    if (countries.length > 0) {
      filteredEvents = filteredEvents.filter(event => countries.includes(event.country))
    }

    // Filter by impact levels
    if (impactLevels.length > 0) {
      filteredEvents = filteredEvents.filter(event => impactLevels.includes(event.impact))
    }

    // Filter by event types
    if (eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const eventType = getEventType(event.event)
        return eventTypes.includes(eventType)
      })
    }

    // Filter by date range
    const now = new Date()
    switch (dateRange) {
      case 'today':
        filteredEvents = filteredEvents.filter(event => 
          event.date.toDateString() === now.toDateString()
        )
        break
      case 'week':
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        filteredEvents = filteredEvents.filter(event => 
          event.date >= now && event.date <= weekFromNow
        )
        break
      case 'month':
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        filteredEvents = filteredEvents.filter(event => 
          event.date >= now && event.date <= monthFromNow
        )
        break
    }

    // Sort by date and time
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    return NextResponse.json({
      events: filteredEvents,
      lastUpdated: new Date().toISOString(),
      source: 'api'
    })

  } catch (error) {
    console.error('Error in economic calendar API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch economic calendar data' },
      { status: 500 }
    )
  }
}

function getEventType(eventName: string): string {
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








