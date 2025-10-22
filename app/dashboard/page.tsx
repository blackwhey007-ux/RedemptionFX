'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to trading journal as the main dashboard
    router.replace('/dashboard/trading-journal')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Redirecting to Trading Journal...
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Please wait while we redirect you.
        </p>
      </div>
    </div>
  )
}


