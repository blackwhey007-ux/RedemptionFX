import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

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

async function testPromotionFlow() {
  try {
    console.log('Testing complete promotion flow...')
    
    // Simulate the conditions from the trading journal page
    const currentProfile = {
      id: 'ceGiGhwrWevRN1lKR4xy',
      name: 'VIP',
      userId: 'WQBzyNiwCpZOLExymSC2AuZjVG73', // Admin user ID
      isPublic: true
    }
    
    // Test for Guest user
    const guestUser = {
      uid: 'guest-user-id',
      role: 'guest'
    }
    
    console.log('Testing for Guest user:')
    console.log('  - Current profile is public:', currentProfile.isPublic)
    console.log('  - Current profile belongs to admin:', currentProfile.userId !== guestUser.uid)
    console.log('  - User is not admin:', guestUser.role !== 'admin')
    console.log('  - User is VIP or Guest:', guestUser.role === 'vip' || guestUser.role === 'guest')
    
    const shouldShowPromotions = currentProfile?.isPublic && 
          currentProfile?.userId !== guestUser.uid && 
          guestUser.role !== 'admin' && 
          (guestUser.role === 'vip' || guestUser.role === 'guest')
    
    console.log('  - Should show promotions:', shouldShowPromotions)
    
    if (shouldShowPromotions) {
      // Get active promotions for guest
      const activePromotionsQuery = query(
        collection(db, 'promotions'),
        where('isActive', '==', true)
      )
      const activePromotionsSnapshot = await getDocs(activePromotionsQuery)
      
      const allPromotions = activePromotionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      const guestPromotions = allPromotions.filter(promo => 
        promo.targetAudience === 'guest' || promo.targetAudience === 'both'
      )
      
      console.log('  - Guest promotions found:', guestPromotions.length)
      guestPromotions.forEach(promo => {
        console.log(`    - ${promo.title} (${promo.targetAudience})`)
      })
    }
    
    // Test for VIP user
    const vipUser = {
      uid: 'vip-user-id',
      role: 'vip'
    }
    
    console.log('\nTesting for VIP user:')
    console.log('  - Current profile is public:', currentProfile.isPublic)
    console.log('  - Current profile belongs to admin:', currentProfile.userId !== vipUser.uid)
    console.log('  - User is not admin:', vipUser.role !== 'admin')
    console.log('  - User is VIP or Guest:', vipUser.role === 'vip' || vipUser.role === 'guest')
    
    const shouldShowPromotionsVIP = currentProfile?.isPublic && 
          currentProfile?.userId !== vipUser.uid && 
          vipUser.role !== 'admin' && 
          (vipUser.role === 'vip' || vipUser.role === 'guest')
    
    console.log('  - Should show promotions:', shouldShowPromotionsVIP)
    
    if (shouldShowPromotionsVIP) {
      // Get active promotions for VIP
      const activePromotionsQuery = query(
        collection(db, 'promotions'),
        where('isActive', '==', true)
      )
      const activePromotionsSnapshot = await getDocs(activePromotionsQuery)
      
      const allPromotions = activePromotionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      const vipPromotions = allPromotions.filter(promo => 
        promo.targetAudience === 'vip' || promo.targetAudience === 'both'
      )
      
      console.log('  - VIP promotions found:', vipPromotions.length)
      vipPromotions.forEach(promo => {
        console.log(`    - ${promo.title} (${promo.targetAudience})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error testing promotion flow:', error)
  }
}

testPromotionFlow()
