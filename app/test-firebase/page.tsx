'use client'

import React, { useState } from 'react'
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebaseConfig'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestFirebasePage() {
  const { user } = useAuth()
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testFirebaseConnection = async () => {
    setIsLoading(true)
    setTestResults([])
    
    try {
      addResult('Testing Firebase connection...')
      
      // Test 1: Add a test document
      addResult('Test 1: Adding test document to user_notifications collection...')
      const testDoc = await addDoc(collection(db, 'user_notifications'), {
        userId: user?.uid || 'test-user',
        type: 'system',
        title: 'Firebase Test',
        message: 'This is a test notification to verify Firebase connection',
        read: false,
        createdAt: serverTimestamp(),
        data: {
          soundType: 'info',
          actionUrl: '/dashboard'
        }
      })
      addResult(`✅ Test 1 passed: Document created with ID ${testDoc.id}`)

      // Test 2: Query the collection
      addResult('Test 2: Querying user_notifications collection...')
      const q = query(
        collection(db, 'user_notifications'),
        where('userId', '==', user?.uid || 'test-user')
      )
      const querySnapshot = await getDocs(q)
      addResult(`✅ Test 2 passed: Found ${querySnapshot.docs.length} documents`)

      // Test 3: Test real-time listener
      addResult('Test 3: Testing real-time listener...')
      const unsubscribe = onSnapshot(q, (snapshot) => {
        addResult(`✅ Test 3 passed: Real-time listener working, ${snapshot.docs.length} documents`)
        unsubscribe()
      })

      addResult('🎉 All Firebase tests passed!')
      
    } catch (error) {
      addResult(`❌ Firebase test failed: ${error.message}`)
      console.error('Firebase test error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Firebase Connection Test</CardTitle>
          <CardDescription>
            Test Firebase Firestore connection and user_notifications collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={testFirebaseConnection} 
              disabled={isLoading || !user}
            >
              {isLoading ? 'Testing...' : 'Run Firebase Tests'}
            </Button>
            <Button onClick={clearTestResults} variant="outline">
              Clear Results
            </Button>
          </div>

          {!user && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">Please sign in to run Firebase tests</p>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
