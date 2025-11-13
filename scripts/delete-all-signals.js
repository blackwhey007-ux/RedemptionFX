/**
 * Delete All Signals from Firebase
 * 
 * This script deletes:
 * - All documents in 'signals' collection
 * - All documents in 'signalNotifications' collection
 * 
 * DOES NOT affect MT5 trade history or any MT5-related data
 * 
 * Usage:
 * node scripts/delete-all-signals.js
 */

const { initializeApp } = require('firebase/app')
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore')

// Firebase configuration (same as in firebaseConfig.js)
const firebaseConfig = {
  apiKey: "AIzaSyC2mAD18kxnzk6vF9MnZpKk0EUg07g4slk",
  authDomain: "redemptionfx-1d36c.firebaseapp.com",
  projectId: "redemptionfx-1d36c",
  storageBucket: "redemptionfx-1d36c.firebasestorage.app",
  messagingSenderId: "927778138447",
  appId: "1:927778138447:web:68a588ce6083bedaa87d3a"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function deleteAllSignals() {
  console.log('🗑️  Starting signal deletion process...')
  console.log('⚠️  This will permanently delete all signal data')
  console.log('')

  try {
    // Delete all signals
    console.log('📊 Fetching all signals...')
    const signalsRef = collection(db, 'signals')
    const signalsSnapshot = await getDocs(signalsRef)
    
    console.log(`Found ${signalsSnapshot.size} signals to delete`)
    
    if (signalsSnapshot.size > 0) {
      console.log('🗑️  Deleting signals...')
      let deleted = 0
      for (const signalDoc of signalsSnapshot.docs) {
        await deleteDoc(doc(db, 'signals', signalDoc.id))
        deleted++
        if (deleted % 10 === 0) {
          console.log(`   Deleted ${deleted}/${signalsSnapshot.size} signals...`)
        }
      }
      console.log(`✅ Deleted ${deleted} signals successfully!`)
    } else {
      console.log('ℹ️  No signals found to delete')
    }
    
    console.log('')
    
    // Delete all signal notifications
    console.log('🔔 Fetching all signal notifications...')
    const notificationsRef = collection(db, 'signalNotifications')
    const notificationsSnapshot = await getDocs(notificationsRef)
    
    console.log(`Found ${notificationsSnapshot.size} signal notifications to delete`)
    
    if (notificationsSnapshot.size > 0) {
      console.log('🗑️  Deleting signal notifications...')
      let deleted = 0
      for (const notifDoc of notificationsSnapshot.docs) {
        await deleteDoc(doc(db, 'signalNotifications', notifDoc.id))
        deleted++
        if (deleted % 10 === 0) {
          console.log(`   Deleted ${deleted}/${notificationsSnapshot.size} notifications...`)
        }
      }
      console.log(`✅ Deleted ${deleted} signal notifications successfully!`)
    } else {
      console.log('ℹ️  No signal notifications found to delete')
    }
    
    console.log('')
    console.log('🎉 Signal deletion completed successfully!')
    console.log('✅ All signal data has been removed from Firebase')
    console.log('✅ MT5 trade history data is intact and untouched')
    
  } catch (error) {
    console.error('❌ Error deleting signals:', error)
    throw error
  }
}

// Run the deletion
deleteAllSignals()
  .then(() => {
    console.log('')
    console.log('Script completed. Exiting...')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })


