'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DebugLocalStoragePage() {
  const [localStorageData, setLocalStorageData] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<any>(null)

  const refreshData = () => {
    const data = localStorage.getItem('trades')
    setLocalStorageData(data)
    if (data) {
      try {
        const parsed = JSON.parse(data)
        setParsedData(parsed)
      } catch (error) {
        setParsedData({ error: 'Failed to parse JSON' })
      }
    } else {
      setParsedData(null)
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const clearLocalStorage = () => {
    localStorage.removeItem('trades')
    refreshData()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">LocalStorage Debug</h1>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={refreshData}>Refresh Data</Button>
          <Button onClick={clearLocalStorage} variant="destructive">Clear Trades</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Raw localStorage Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {localStorageData || 'No data found'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parsed Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trade Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {parsedData && Array.isArray(parsedData) ? parsedData.length : 0} trades
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
