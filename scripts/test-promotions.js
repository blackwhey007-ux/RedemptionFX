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

async function testPromotions() {
  try {
    console.log('Testing promotions collection...')
    
    // Test 1: Get all promotions
    const allPromotionsQuery = query(collection(db, 'promotions'))
    const allPromotionsSnapshot = await getDocs(allPromotionsQuery)
    console.log('✅ Total promotions found:', allPromotionsSnapshot.docs.length)
    
    allPromotionsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`  - ${doc.id}: ${data.title} (${data.targetAudience}, active: ${data.isActive})`)
    })
    
    // Test 2: Get active promotions
    const activePromotionsQuery = query(
      collection(db, 'promotions'),
      where('isActive', '==', true)
    )
    const activePromotionsSnapshot = await getDocs(activePromotionsQuery)
    console.log('✅ Active promotions found:', activePromotionsSnapshot.docs.length)
    
    activePromotionsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`  - ${doc.id}: ${data.title} (${data.targetAudience})`)
    })
    
    // Test 3: Get guest promotions
    const guestPromotions = activePromotionsSnapshot.docs
      .map(doc => doc.data())
      .filter(promo => promo.targetAudience === 'guest' || promo.targetAudience === 'both')
    console.log('✅ Guest promotions found:', guestPromotions.length)
    
    // Test 4: Get VIP promotions
    const vipPromotions = activePromotionsSnapshot.docs
      .map(doc => doc.data())
      .filter(promo => promo.targetAudience === 'vip' || promo.targetAudience === 'both')
    console.log('✅ VIP promotions found:', vipPromotions.length)
    
  } catch (error) {
    console.error('❌ Error testing promotions:', error)
  }
}

testPromotions()
