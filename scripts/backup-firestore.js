#!/usr/bin/env node

/**
 * Firestore Backup Script
 * 
 * This script exports all Firestore collections to JSON files
 * for backup purposes before making schema changes.
 * 
 * Usage: node scripts/backup-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('../firebase-service-account.json'); // You'll need to download this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// Collections to backup
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
    console.log(`📦 Backing up collection: ${collectionName}`);
    
    const snapshot = await db.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${collectionName}-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Backed up ${documents.length} documents to ${filename}`);
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
    results: results
  };
  
  const summaryFile = path.join(__dirname, '..', 'backups', `backup-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  console.log(`\n📊 Backup Summary:`);
  console.log(`✅ Successful: ${summary.successful}`);
  console.log(`❌ Failed: ${summary.failed}`);
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


