'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EconomicCalendar } from '@/components/currency/EconomicCalendar'
import { EconomicCalendarNotificationSettings } from '@/components/currency/EconomicCalendarNotificationSettings'
import { InvestingComWidget } from '@/components/currency/InvestingComWidget'
import { Settings, Calendar, Globe, BarChart3 } from 'lucide-react'

export default function EconomicCalendarPage() {
  const [showSettings, setShowSettings] = useState(false)
  const [activeTab, setActiveTab] = useState('live')

  return (
    <div className="space-y-6">
      {/* Header with Settings Toggle */}
      <Card className="bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-red-500" />
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                  Economic Calendar
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Track economic events and manage notification preferences
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="border-red-500/30 dark:border-red-500/50"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showSettings ? 'Hide Settings' : 'Notification Settings'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Notification Settings */}
      {showSettings && (
        <EconomicCalendarNotificationSettings />
      )}

      {/* Tabbed Calendar Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger 
            value="live" 
            className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >
            <Globe className="w-4 h-4" />
            Live Calendar
          </TabsTrigger>
          <TabsTrigger 
            value="custom" 
            className="flex items-center gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4" />
            Custom View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-6">
          <InvestingComWidget />
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="space-y-4">
            {/* Info Card for Custom View */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Custom Calendar View
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      This view shows sample data for demonstration. For real-time economic events, 
                      use the "Live Calendar" tab above. Notifications work with both views.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <EconomicCalendar />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
