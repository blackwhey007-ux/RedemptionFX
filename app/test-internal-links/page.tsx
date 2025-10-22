'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function TestInternalLinksPage() {
  const validInternalPaths = [
    { path: '/dashboard', name: 'Dashboard', description: 'Main dashboard page' },
    { path: '/pricing', name: 'Pricing', description: 'Pricing page' },
    { path: '/dashboard/trading-journal', name: 'Trading Journal', description: 'Trading journal page' },
    { path: '/dashboard/profiles', name: 'Profiles', description: 'Profiles page' },
    { path: '/dashboard/profile', name: 'Profile Settings', description: 'Profile settings page' },
    { path: '/dashboard/currency-database', name: 'Currency Database', description: 'Currency database page' },
    { path: '/dashboard/admin/promotions', name: 'Admin Promotions', description: 'Admin promotions page' },
    { path: '/dashboard/admin/members', name: 'Admin Members', description: 'Admin members page' }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Internal Links</CardTitle>
          <CardDescription>
            Click on any of these links to test internal navigation. These are the valid internal paths that can be used in promotion notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {validInternalPaths.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-start text-left">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{item.path}</div>
                  <div className="text-xs text-gray-400 mt-2">{item.description}</div>
                </Button>
              </Link>
            ))}
          </div>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">How to Use in Promotions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Go to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/dashboard/admin/promotions</code></li>
              <li>Create a new promotion</li>
              <li>Select "Internal (within app)" as Link Type</li>
              <li>Enter one of the valid paths above (e.g., <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/pricing</code>)</li>
              <li>Save the promotion</li>
              <li>VIP/Guest users will receive notifications that link to the correct internal page</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
