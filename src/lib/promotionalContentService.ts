import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firestore'

export interface PromotionalContent {
  id: string
  title: string
  description: string
  buttonText: string
  buttonUrl?: string
  pricing?: string
  guarantee?: string
  isActive: boolean
  lastUpdated: string
  type: 'hero' | 'cta'
  // New conversion optimization fields
  backgroundColor?: string
  textColor?: string
  buttonColor?: string
  buttonTextColor?: string
  buttonHoverColor?: string
  borderColor?: string
  urgencyText?: string
  socialProof?: string
  discountCode?: string
  limitedTimeOffer?: boolean
  offerExpiry?: string
}

export class PromotionalContentService {
  private static cache: Map<string, PromotionalContent> = new Map()

  // Get promotional content
  static async getPromotionalContent(contentId: string): Promise<PromotionalContent | null> {
    try {
      // Check cache first
      if (this.cache.has(contentId)) {
        return this.cache.get(contentId)!
      }

      // Try to get from localStorage first (for immediate use)
      const localContent = localStorage.getItem(`promotional-content-${contentId}`)
      if (localContent) {
        const content = JSON.parse(localContent)
        this.cache.set(contentId, content)
        return content
      }

      // Try to get from Firebase
      const docRef = doc(db, 'promotionalContent', contentId)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const content = docSnap.data() as PromotionalContent
        this.cache.set(contentId, content)
        // Also save to localStorage for offline use
        localStorage.setItem(`promotional-content-${contentId}`, JSON.stringify(content))
        return content
      }

      // Return default content if not found
      return this.getDefaultContent(contentId)
    } catch (error) {
      console.error('Error loading promotional content:', error)
      return this.getDefaultContent(contentId)
    }
  }

  // Save promotional content
  static async savePromotionalContent(content: PromotionalContent): Promise<void> {
    try {
      const docRef = doc(db, 'promotionalContent', content.id)
      const contentToSave = {
        ...content,
        lastUpdated: new Date().toISOString()
      }
      
      await setDoc(docRef, contentToSave)
      
      // Update cache
      this.cache.set(content.id, contentToSave)
      
      // Also save to localStorage as backup
      localStorage.setItem(`promotional-content-${content.id}`, JSON.stringify(contentToSave))
      
      console.log('Promotional content saved:', content.id)
    } catch (error) {
      console.error('Error saving promotional content:', error)
      throw error
    }
  }

  // Get default content
  private static getDefaultContent(contentId: string): PromotionalContent | null {
    const defaults: Record<string, PromotionalContent> = {
      'hero-card': {
        id: 'hero-card',
        title: 'Join Our VIP Trading Group',
        description: 'See real results from our professional MT5 account - updated live!',
        buttonText: 'Join VIP Group Now - $99/month',
        buttonUrl: '#',
        pricing: '$99/month',
        guarantee: 'Cancel anytime • No hidden fees • 7-day money-back guarantee',
        isActive: true,
        lastUpdated: new Date().toISOString(),
        type: 'hero',
        // Conversion optimization defaults
        backgroundColor: '#dc2626', // red-600
        textColor: '#ffffff',
        buttonColor: '#ffffff',
        buttonTextColor: '#dc2626',
        buttonHoverColor: '#f3f4f6', // gray-100
        borderColor: '#dc2626',
        urgencyText: 'Limited Time Offer!',
        socialProof: 'Join 500+ successful traders',
        discountCode: 'VIP50',
        limitedTimeOffer: true,
        offerExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      },
      'cta-card': {
        id: 'cta-card',
        title: 'Ready to Get These Results?',
        description: 'Join our exclusive VIP group and receive all these signals in real-time. Limited spots available each month.',
        buttonText: 'Join VIP Group - $99/month',
        buttonUrl: '#',
        pricing: '$99/month',
        guarantee: 'Cancel anytime • No hidden fees • 7-day money-back guarantee',
        isActive: true,
        lastUpdated: new Date().toISOString(),
        type: 'cta',
        // Conversion optimization defaults
        backgroundColor: '#ffffff',
        textColor: '#1f2937', // gray-800
        buttonColor: '#dc2626', // red-600
        buttonTextColor: '#ffffff',
        buttonHoverColor: '#b91c1c', // red-700
        borderColor: '#dc2626',
        urgencyText: 'Only 10 spots left this month!',
        socialProof: '500+ active members',
        discountCode: 'FIRST50',
        limitedTimeOffer: false,
        offerExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      }
    }

    return defaults[contentId] || null
  }

  // Get all promotional content
  static async getAllPromotionalContent(): Promise<PromotionalContent[]> {
    try {
      const heroContent = await this.getPromotionalContent('hero-card')
      const ctaContent = await this.getPromotionalContent('cta-card')
      
      const allContent: PromotionalContent[] = []
      if (heroContent) allContent.push(heroContent)
      if (ctaContent) allContent.push(ctaContent)
      
      return allContent
    } catch (error) {
      console.error('Error loading all promotional content:', error)
      return []
    }
  }
}
