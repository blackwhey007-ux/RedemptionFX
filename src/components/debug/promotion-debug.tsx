'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/contexts/ProfileContext'

export const PromotionDebug: React.FC = () => {
  const { user: authUser } = useAuth()
  const { currentProfile } = useProfile()

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Promotion Debug Info</h3>
      
      <div className="space-y-1">
        <div><strong>Auth User:</strong></div>
        <div>• ID: {authUser?.uid || 'None'}</div>
        <div>• Role: {authUser?.role || 'None'}</div>
        <div>• Email: {authUser?.email || 'None'}</div>
        
        <div className="mt-2"><strong>Current Profile:</strong></div>
        <div>• ID: {currentProfile?.id || 'None'}</div>
        <div>• Name: {currentProfile?.name || 'None'}</div>
        <div>• User ID: {currentProfile?.userId || 'None'}</div>
        <div>• Is Public: {currentProfile?.isPublic ? 'Yes' : 'No'}</div>
        
        <div className="mt-2"><strong>Conditions:</strong></div>
        <div>• Profile is public: {currentProfile?.isPublic ? '✅' : '❌'}</div>
        <div>• Profile belongs to admin: {currentProfile?.userId !== authUser?.uid ? '✅' : '❌'}</div>
        <div>• User is not admin: {authUser?.role !== 'admin' ? '✅' : '❌'}</div>
        <div>• User is VIP or Guest: {(authUser?.role === 'vip' || authUser?.role === 'guest') ? '✅' : '❌'}</div>
        
        <div className="mt-2"><strong>Should Show Promotions:</strong></div>
        <div className="font-bold text-green-400">
          {currentProfile?.isPublic && 
           currentProfile?.userId !== authUser?.uid && 
           authUser?.role !== 'admin' && 
           (authUser?.role === 'vip' || authUser?.role === 'guest') ? '✅ YES' : '❌ NO'}
        </div>
      </div>
    </div>
  )
}

export default PromotionDebug
