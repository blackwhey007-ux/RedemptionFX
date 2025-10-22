'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function SignalsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect to free signals by default
    router.replace('/dashboard/signals/free')
  }, [router])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    </div>
  )
}
