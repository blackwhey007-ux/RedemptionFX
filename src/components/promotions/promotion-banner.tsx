'use client'

import React from 'react'
import { Promotion, PROMOTION_TYPE_ICONS, PROMOTION_COLORS } from '@/types/promotion'
import { 
  Gift, 
  MessageCircle, 
  TrendingUp, 
  GraduationCap, 
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PromotionBannerProps {
  promotions: Promotion[]
  userRole: 'vip' | 'guest'
}

const getIcon = (iconName: string) => {
  const iconMap = {
    Gift,
    MessageCircle,
    TrendingUp,
    GraduationCap,
    Sparkles
  }
  return iconMap[iconName as keyof typeof iconMap] || Gift
}

const getColorClass = (type: string) => {
  const colorMap = {
    discount: 'from-yellow-400 to-orange-500',
    telegram: 'from-blue-400 to-blue-600',
    copytrading: 'from-green-400 to-green-600',
    coaching: 'from-purple-400 to-purple-600',
    custom: 'from-pink-400 to-pink-600'
  }
  return colorMap[type as keyof typeof colorMap] || 'from-gray-400 to-gray-600'
}

export const PromotionBanner: React.FC<PromotionBannerProps> = ({ 
  promotions, 
  userRole 
}) => {
  if (!promotions || promotions.length === 0) {
    return null
  }

  const handleCTAClick = (promotion: Promotion) => {
    // Open link in new tab
    window.open(promotion.ctaLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mb-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Special Offers for {userRole === 'vip' ? 'VIP Members' : 'Guests'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Exclusive deals and opportunities just for you
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {promotions.map((promotion) => {
          const IconComponent = getIcon(promotion.icon || PROMOTION_TYPE_ICONS[promotion.type])
          const colorClass = getColorClass(promotion.type)

          return (
            <div
              key={promotion.id}
              className="relative group overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative p-6">
                {/* Icon and Type Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClass} shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-medium border-2 ${promotion.type === 'discount' ? 'border-yellow-400 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 
                      promotion.type === 'telegram' ? 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/20' :
                      promotion.type === 'copytrading' ? 'border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20' :
                      promotion.type === 'coaching' ? 'border-purple-400 text-purple-600 bg-purple-50 dark:bg-purple-900/20' :
                      'border-pink-400 text-pink-600 bg-pink-50 dark:bg-pink-900/20'}`}
                  >
                    {promotion.type.charAt(0).toUpperCase() + promotion.type.slice(1)}
                  </Badge>
                </div>

                {/* Title */}
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {promotion.title}
                </h4>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                  {promotion.description}
                </p>

                {/* CTA Button */}
                <Button
                  onClick={() => handleCTAClick(promotion)}
                  className={`w-full bg-gradient-to-r ${colorClass} hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-105`}
                >
                  <span className="flex items-center justify-center gap-2">
                    {promotion.ctaText}
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </Button>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-8 -translate-x-8" />
            </div>
          )
        })}
      </div>

    </div>
  )
}

export default PromotionBanner
