'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPromotionPages, getNotificationPages, getAllPages } from '@/lib/pageDiscovery'

export default function TestPromotionPagesPage() {
  const promotionPages = getPromotionPages()
  const notificationPages = getNotificationPages()
  const allPages = getAllPages()

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Promotion Page Discovery Test</CardTitle>
          <CardDescription>
            This page shows all available pages for promotion display and notification redirects.
            The system automatically updates when you add new pages to the project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pages for Promotion Display</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotionPages.map((page) => (
                  <div key={page.path} className="p-4 border rounded-lg">
                    <div className="font-medium">{page.name}</div>
                    <div className="text-sm text-gray-500">{page.path}</div>
                    <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mt-2 inline-block">
                      {page.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Pages for Notification Redirects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notificationPages.map((page) => (
                  <div key={page.path} className="p-4 border rounded-lg">
                    <div className="font-medium">{page.name}</div>
                    <div className="text-sm text-gray-500">{page.path}</div>
                    <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                    <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-2 inline-block">
                      {page.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">All Pages (Including Test Pages)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allPages.map((page) => (
                  <div key={page.path} className="p-4 border rounded-lg">
                    <div className="font-medium">{page.name}</div>
                    <div className="text-sm text-gray-500">{page.path}</div>
                    <div className="text-xs text-gray-400 mt-1">{page.description}</div>
                    <div className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                      page.category === 'test' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : page.category === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : page.category === 'dashboard'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {page.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">How to Add New Pages</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>Add your new page to the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">src/lib/pageDiscovery.ts</code> file</li>
                <li>Add the page info to the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">KNOWN_PAGES</code> array</li>
                <li>Specify the category: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">'dashboard'</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">'admin'</code>, <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">'public'</code>, or <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">'test'</code></li>
                <li>The promotion system will automatically include your new page in the dropdowns</li>
                <li>Test pages are excluded from production promotion options</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
