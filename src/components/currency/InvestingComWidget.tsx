'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, Globe, Calendar } from 'lucide-react'

interface InvestingComWidgetProps {
  className?: string
}

export function InvestingComWidget({ className }: InvestingComWidgetProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Investing.com Economic Calendar Widget URL
  const widgetUrl = `https://sslecal2.investing.com?` +
    `columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous` +
    `&features=datepicker,timezone` +
    `&countries=5,25,32,6,37,72,22,17,39,14,10,35,43,56,36,110,11,26,12,4` +
    `&calType=week` +
    `&timeZone=8` +
    `&lang=1`

  const handleRefresh = () => {
    setIsLoading(true)
    setHasError(false)
    setLastRefresh(new Date())
    
    // Force iframe reload by changing src
    const iframe = document.getElementById('investing-widget') as HTMLIFrameElement
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const openInNewTab = () => {
    window.open('https://www.investing.com/economic-calendar/', '_blank')
  }

  return (
    <Card className={`bg-gradient-to-br from-white to-red-50/30 dark:from-black dark:to-red-900/10 border-red-500/30 dark:border-red-500/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-red-500" />
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Live Economic Calendar
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Real-time economic events from Investing.com
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-red-500/30 dark:border-red-500/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              className="border-red-500/30 dark:border-red-500/50"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full
            </Button>
          </div>
        </div>
        
        {lastRefresh && (
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {hasError ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Unable to Load Calendar
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              There was an error loading the economic calendar. Please try refreshing or open the full calendar.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleRefresh}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={openInNewTab}
                className="border-red-500/30 dark:border-red-500/50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Full Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Loading economic calendar...
                  </p>
                </div>
              </div>
            )}
            
            <iframe
              id="investing-widget"
              src={widgetUrl}
              width="100%"
              height="600"
              frameBorder="0"
              allowTransparency={true}
              marginWidth={0}
              marginHeight={0}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full border-0"
              title="Investing.com Economic Calendar"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        )}
        
        {/* Footer with info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span>Data provided by Investing.com</span>
              <span>•</span>
              <span>Auto-refreshes every 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Major economies: US, EU, UK, JP, CH, CA, AU</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}








