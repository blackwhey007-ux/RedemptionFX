export type PromotionType = 'discount' | 'telegram' | 'copytrading' | 'coaching' | 'custom' | 'flash-sale' | 'premium' | 'limited-time' | 'interactive' | 'video'

export type PromotionAnimation = 'none' | 'float' | 'pulse' | 'bounce' | 'rotate' | 'slide' | 'glow' | '3d-flip' | 'particle' | 'neon'

export type PromotionPlacement = 'trading-journal' | 'dashboard' | 'metrics' | 'profiles' | 'all-pages'

export interface Promotion {
  id: string
  adminId: string
  type: PromotionType
  title: string
  description: string
  ctaText: string
  ctaLink: string
  linkType?: 'internal' | 'external'
  // New fields for page selection and redirect
  displayPage?: string // Which page to show the promotion on
  redirectPath?: string // Where to redirect when clicked
  redirectType?: 'internal' | 'external' // Type of redirect
  isActive: boolean
  targetAudience: 'vip' | 'guest' | 'both'
  displayOrder: number
  createdAt: string
  updatedAt: string
  icon?: string
  color?: string
  
  // Enhanced Features
  animation?: PromotionAnimation
  placement?: PromotionPlacement[]
  startDate?: string
  endDate?: string
  maxViews?: number
  currentViews?: number
  clickCount?: number
  conversionRate?: number
  
  // Advanced Customization
  customCSS?: string
  backgroundImage?: string
  videoUrl?: string
  interactiveElements?: {
    countdownTimer?: boolean
    progressBar?: boolean
    hoverEffects?: boolean
    soundEffects?: boolean
  }
  
  // Analytics
  impressions?: number
  clicks?: number
  conversions?: number
  lastViewed?: string
}

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  discount: 'Discount Offer',
  telegram: 'Telegram Group',
  copytrading: 'Copy Trading',
  coaching: '1-on-1 Coaching',
  custom: 'Custom Offer',
  'flash-sale': 'Flash Sale',
  premium: 'Premium Service',
  'limited-time': 'Limited Time Offer',
  interactive: 'Interactive Experience',
  video: 'Video Promotion'
}

export const PROMOTION_TYPE_ICONS: Record<PromotionType, string> = {
  discount: 'Gift',
  telegram: 'MessageCircle',
  copytrading: 'TrendingUp',
  coaching: 'GraduationCap',
  custom: 'Sparkles',
  'flash-sale': 'Zap',
  premium: 'Crown',
  'limited-time': 'Clock',
  interactive: 'MousePointer',
  video: 'Play'
}

export const PROMOTION_COLORS: Record<PromotionType, string> = {
  discount: 'from-yellow-400 to-orange-500',
  telegram: 'from-blue-400 to-blue-600',
  copytrading: 'from-green-400 to-green-600',
  coaching: 'from-purple-400 to-purple-600',
  custom: 'from-pink-400 to-pink-600',
  'flash-sale': 'from-red-500 to-red-700',
  premium: 'from-yellow-300 to-yellow-600',
  'limited-time': 'from-orange-500 to-red-600',
  interactive: 'from-indigo-500 to-purple-600',
  video: 'from-blue-500 to-purple-600'
}

export const PROMOTION_ANIMATION_LABELS: Record<PromotionAnimation, string> = {
  none: 'No Animation',
  float: 'Floating',
  pulse: 'Pulse',
  bounce: 'Bounce',
  rotate: 'Rotate',
  slide: 'Slide',
  glow: 'Glow',
  '3d-flip': '3D Flip',
  particle: 'Particle Effects',
  neon: 'Neon Glow'
}

export const PROMOTION_PLACEMENT_LABELS: Record<PromotionPlacement, string> = {
  'trading-journal': 'Trading Journal',
  'dashboard': 'Dashboard',
  'metrics': 'Metrics Dashboard',
  'profiles': 'Profiles Page',
  'all-pages': 'All Pages'
}
