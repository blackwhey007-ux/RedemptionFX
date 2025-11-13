#!/usr/bin/env node

/**
 * Simple Firestore Backup Script
 * 
 * This script exports all Firestore collections to JSON files
 * for backup purposes. Uses Firebase Admin SDK.
 * 
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download Firebase service account key
 * 3. Place it as firebase-service-account.json in project root
 * 
 * Usage: node scripts/backup-firestore-simple.js
 */

const fs = require('fs');
const path = require('path');

// Check if Firebase Admin is available
let admin;
try {
  admin = require('firebase-admin');
} catch (error) {
  console.error('❌ Firebase Admin SDK not found. Install it with: npm install firebase-admin');
  process.exit(1);
}

// Check for service account file
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account file not found.');
  console.error('Please download your Firebase service account key and save it as:');
  console.error('firebase-service-account.json in your project root.');
  console.error('\nTo get your service account key:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Download and rename to firebase-service-account.json');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// Collections to backup (based on current schema)
const COLLECTIONS = [
  'users',
  'signals', 
  'memberTrades',
  'subscriptions',
  'analytics',
  'performance',
  'settings',
  'notifications',
  'profiles',
  'trades',
  'userTrades',
  'paymentSubmissions',
  'announcements',
  'promotions',
  'events',
  'event_applications',
  'admin_notifications',
  'eventNotifications',
  'user_notifications',
  'adminNotifications',
  'signalNotifications'
];

async function backupCollection(collectionName) {
  try {
    console.log(`📦 Backing up: ${collectionName}`);
    
    const snapshot = await db.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Write backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${collectionName}-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(documents, null, 2));
    
    console.log(`✅ ${documents.length} documents saved to ${filename}`);
    return { collection: collectionName, count: documents.length, file: filename };
    
  } catch (error) {
    console.error(`❌ Error backing up ${collectionName}:`, error.message);
    return { collection: collectionName, error: error.message };
  }
}

async function createBackupSummary(results) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalCollections: results.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    totalDocuments: results.reduce((sum, r) => sum + (r.count || 0), 0),
    results: results
  };
  
  const summaryFile = path.join(__dirname, '..', 'backups', `backup-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log(`\n📊 Backup Summary:`);
  console.log(`✅ Successful collections: ${summary.successful}`);
  console.log(`❌ Failed collections: ${summary.failed}`);
  console.log(`📄 Total documents backed up: ${summary.totalDocuments}`);
  console.log(`📁 Summary saved to: ${summaryFile}`);
  
  return summary;
}

async function main() {
  console.log('🚀 Starting Firestore backup process...\n');
  
  const results = [];
  
  for (const collectionName of COLLECTIONS) {
    const result = await backupCollection(collectionName);
    results.push(result);
    
    // Small delay to avoid overwhelming Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const summary = await createBackupSummary(results);
  
  if (summary.failed === 0) {
    console.log('\n🎉 All collections backed up successfully!');
    console.log('\n📁 Backup files are located in: ./backups/');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some collections failed to backup. Check the summary for details.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the backup
main().catch(error => {
  console.error('❌ Backup failed:', error);
  process.exit(1);
});


