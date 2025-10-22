import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, connectFirestoreEmulator } from 'firebase/firestore'

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

async function testFirestoreRules() {
  try {
    console.log('Testing Firestore rules...')
    
    // Test 1: Get all promotions (should work)
    const allPromotionsQuery = query(collection(db, 'promotions'))
    const allPromotionsSnapshot = await getDocs(allPromotionsQuery)
    console.log('✅ Get all promotions - Success:', allPromotionsSnapshot.docs.length, 'docs')
    
    // Test 2: Get active promotions (should work)
    const activePromotionsQuery = query(
      collection(db, 'promotions'),
      where('isActive', '==', true)
    )
    const activePromotionsSnapshot = await getDocs(activePromotionsQuery)
    console.log('✅ Get active promotions - Success:', activePromotionsSnapshot.docs.length, 'docs')
    
    // Test 3: Get promotions by target audience (should work)
    const guestPromotionsQuery = query(
      collection(db, 'promotions'),
      where('targetAudience', '==', 'guest')
    )
    const guestPromotionsSnapshot = await getDocs(guestPromotionsQuery)
    console.log('✅ Get guest promotions - Success:', guestPromotionsSnapshot.docs.length, 'docs')
    
    // Test 4: Get promotions by target audience (should work)
    const vipPromotionsQuery = query(
      collection(db, 'promotions'),
      where('targetAudience', '==', 'vip')
    )
    const vipPromotionsSnapshot = await getDocs(vipPromotionsQuery)
    console.log('✅ Get VIP promotions - Success:', vipPromotionsSnapshot.docs.length, 'docs')
    
    // Test 5: Get promotions by target audience (should work)
    const bothPromotionsQuery = query(
      collection(db, 'promotions'),
      where('targetAudience', '==', 'both')
    )
    const bothPromotionsSnapshot = await getDocs(bothPromotionsQuery)
    console.log('✅ Get both promotions - Success:', bothPromotionsSnapshot.docs.length, 'docs')
    
    console.log('\n🎉 All Firestore queries are working correctly!')
    
  } catch (error) {
    console.error('❌ Error testing Firestore rules:', error)
    console.error('Error details:', error.message)
  }
}

testFirestoreRules()
