'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getActivePromotions } from '@/lib/promotionService'
import { Promotion } from '@/types/promotion'
// import { EnhancedPromotionBanner } from './enhanced-promotion-banner'

interface PromotionDisplayProps {
  className?: string
  maxPromotions?: number
  placement?: string
}

export const PromotionDisplay: React.FC<PromotionDisplayProps> = ({
  className = '',
  maxPromotions = 3,
  placement
}) => {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedPromotions, setDismissedPromotions] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  useEffect(() => {
    loadPromotions()
  }, [])

  useEffect(() => {
    // Load dismissed promotions from localStorage
    const dismissed = localStorage.getItem('dismissedPromotions')
    if (dismissed) {
      try {
        setDismissedPromotions(new Set(JSON.parse(dismissed)))
      } catch (error) {
        console.error('Error parsing dismissed promotions:', error)
      }
    }
  }, [])

  const loadPromotions = async () => {
    try {
      const allPromotions = await getActivePromotions('guest')
      
      // Filter by placement if specified
      let filteredPromotions = allPromotions
      if (placement) {
        filteredPromotions = allPromotions.filter(promo => 
          promo.placement?.includes(placement as any) || 
          promo.placement?.includes('all-pages')
        )
      }

      // Filter out dismissed promotions
      const activePromotions = filteredPromotions.filter(
        promo => !dismissedPromotions.has(promo.id)
      )

      // Filter by current page if placement is specific
      if (placement && placement !== 'all-pages') {
        const pagePromotions = activePromotions.filter(promo => {
          if (!promo.placement || promo.placement.includes('all-pages')) return true
          
          const currentPage = pathname.replace('/dashboard/', '').replace('/dashboard', '')
          return promo.placement.some(p => {
            switch (p) {
              case 'dashboard':
                return currentPage === '' || currentPage === 'dashboard'
              case 'trading-journal':
                return currentPage.includes('trading-journal')
              case 'metrics':
                return currentPage.includes('metrics') || currentPage.includes('performance')
              case 'profiles':
                return currentPage.includes('profiles')
              default:
                return false
            }
          })
        })
        
        setPromotions(pagePromotions.slice(0, maxPromotions))
      } else {
        setPromotions(activePromotions.slice(0, maxPromotions))
      }
    } catch (error) {
      console.error('Error loading promotions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (promotionId: string) => {
    const newDismissed = new Set(dismissedPromotions)
    newDismissed.add(promotionId)
    setDismissedPromotions(newDismissed)
    
    // Save to localStorage
    localStorage.setItem('dismissedPromotions', JSON.stringify([...newDismissed]))
    
    // Remove from current promotions
    setPromotions(prev => prev.filter(p => p.id !== promotionId))
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-2xl h-32 w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  if (promotions.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {promotions.map((promotion) => (
        <div key={promotion.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">{promotion.title}</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">{promotion.description}</p>
            </div>
            <button 
              onClick={() => handleDismiss(promotion.id)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PromotionDisplay
