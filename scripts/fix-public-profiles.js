// Script to identify and fix public profile issues
// This script helps identify profiles that might be incorrectly marked as public

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function checkPublicProfiles() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Checking all profiles for public profile issues...');
    
    // Get all profiles
    const profilesSnapshot = await getDocs(collection(db, 'profiles'));
    
    console.log(`📊 Found ${profilesSnapshot.docs.length} total profiles`);
    
    const publicProfiles = [];
    const userProfiles = new Map();
    
    profilesSnapshot.docs.forEach(doc => {
      const profile = { id: doc.id, ...doc.data() };
      
      if (profile.isPublic === true) {
        publicProfiles.push(profile);
      }
      
      // Group by user
      if (!userProfiles.has(profile.userId)) {
        userProfiles.set(profile.userId, []);
      }
      userProfiles.get(profile.userId).push(profile);
    });
    
    console.log(`\n🔓 Found ${publicProfiles.length} public profiles:`);
    publicProfiles.forEach(profile => {
      console.log(`  - "${profile.name}" (${profile.accountType}) by user: ${profile.userId}`);
    });
    
    console.log(`\n👥 User profile distribution:`);
    userProfiles.forEach((profiles, userId) => {
      const publicCount = profiles.filter(p => p.isPublic === true).length;
      const privateCount = profiles.filter(p => p.isPublic !== true).length;
      console.log(`  User ${userId}: ${profiles.length} total (${publicCount} public, ${privateCount} private)`);
    });
    
    // Check for potential issues
    console.log(`\n⚠️  Potential issues:`);
    let issuesFound = false;
    
    userProfiles.forEach((profiles, userId) => {
      const publicProfiles = profiles.filter(p => p.isPublic === true);
      if (publicProfiles.length > 0) {
        // Check if this user has multiple public profiles (might be suspicious)
        if (publicProfiles.length > 1) {
          console.log(`  - User ${userId} has ${publicProfiles.length} public profiles (consider reviewing)`);
          issuesFound = true;
        }
        
        // Check if public profiles have generic names like "VIP" or "Other"
        publicProfiles.forEach(profile => {
          if (profile.name.toLowerCase().includes('vip') || 
              profile.name.toLowerCase().includes('other') ||
              profile.name.toLowerCase().includes('guest')) {
            console.log(`  - Profile "${profile.name}" by ${userId} might be incorrectly public`);
            issuesFound = true;
          }
        });
      }
    });
    
    if (!issuesFound) {
      console.log(`  ✅ No obvious issues found`);
    }
    
    console.log(`\n💡 Recommendations:`);
    console.log(`  - Review public profiles to ensure they should be public`);
    console.log(`  - Consider setting isPublic to false for user-created profiles`);
    console.log(`  - Only admin-created profiles should typically be public`);
    
  } catch (error) {
    console.error('❌ Error checking profiles:', error);
  }
}

// Run the check
checkPublicProfiles();
