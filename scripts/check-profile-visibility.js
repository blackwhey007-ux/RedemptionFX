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

async function checkProfileVisibility() {
  try {
    console.log('Checking profile visibility...')
    
    // Get all profiles
    const profilesQuery = query(collection(db, 'profiles'))
    const profilesSnapshot = await getDocs(profilesQuery)
    console.log('✅ Total profiles found:', profilesSnapshot.docs.length)
    
    profilesSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`  - ${doc.id}: ${data.name} (user: ${data.userId}, public: ${data.isPublic})`)
    })
    
    // Get public profiles
    const publicProfiles = profilesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(profile => profile.isPublic === true)
    console.log('✅ Public profiles found:', publicProfiles.length)
    
    // Get admin profiles
    const adminProfiles = profilesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(profile => profile.userId === 'WQBzyNiwCpZOLExymSC2AuZjVG73') // Your admin user ID
    console.log('✅ Admin profiles found:', adminProfiles.length)
    
    adminProfiles.forEach(profile => {
      console.log(`  - ${profile.id}: ${profile.name} (public: ${profile.isPublic})`)
    })
    
  } catch (error) {
    console.error('❌ Error checking profile visibility:', error)
  }
}

checkProfileVisibility()
