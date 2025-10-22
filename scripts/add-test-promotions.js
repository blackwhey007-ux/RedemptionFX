import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq",
  authDomain: "redemptionfx-1d36c.firebaseapp.com",
  projectId: "redemptionfx-1d36c",
  storageBucket: "redemptionfx-1d36c.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Test promotions data
const testPromotions = [
  {
    adminId: 'WQBzyNiwCpZOLExymSC2AuZjVG73', // Your admin user ID
    type: 'discount',
    title: '50% Off VIP Membership',
    description: 'Join our VIP community and get 50% off your first month! Access live signals, Discord community, and exclusive trading insights.',
    ctaText: 'Claim Discount',
    ctaLink: 'https://example.com/discount',
    isActive: true,
    targetAudience: 'guest',
    displayOrder: 1,
    icon: 'Gift',
    color: 'from-yellow-400 to-orange-500',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    adminId: 'WQBzyNiwCpZOLExymSC2AuZjVG73',
    type: 'telegram',
    title: 'Join Our VIP Telegram',
    description: 'Get instant access to our exclusive VIP Telegram group with live signals and real-time market analysis.',
    ctaText: 'Join Telegram',
    ctaLink: 'https://t.me/redemptionfx_vip',
    isActive: true,
    targetAudience: 'vip',
    displayOrder: 2,
    icon: 'MessageCircle',
    color: 'from-blue-400 to-blue-600',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    adminId: 'WQBzyNiwCpZOLExymSC2AuZjVG73',
    type: 'copytrading',
    title: 'Copy Trading Service',
    description: 'Automatically copy our trades with our advanced copy trading service. Set it and forget it!',
    ctaText: 'Learn More',
    ctaLink: 'https://example.com/copytrading',
    isActive: true,
    targetAudience: 'both',
    displayOrder: 3,
    icon: 'TrendingUp',
    color: 'from-green-400 to-green-600',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    adminId: 'WQBzyNiwCpZOLExymSC2AuZjVG73',
    type: 'coaching',
    title: '1-on-1 Trading Coaching',
    description: 'Get personalized trading coaching from our expert team. Learn advanced strategies and improve your trading skills.',
    ctaText: 'Book Session',
    ctaLink: 'https://example.com/coaching',
    isActive: true,
    targetAudience: 'both',
    displayOrder: 4,
    icon: 'GraduationCap',
    color: 'from-purple-400 to-purple-600',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
]

async function addTestPromotions() {
  try {
    console.log('Adding test promotions to Firestore...')
    
    for (const promotion of testPromotions) {
      const docRef = await addDoc(collection(db, 'promotions'), promotion)
      console.log(`✅ Added promotion: ${promotion.title} with ID: ${docRef.id}`)
    }
    
    console.log('🎉 All test promotions added successfully!')
  } catch (error) {
    console.error('❌ Error adding promotions:', error)
  }
}

addTestPromotions()
