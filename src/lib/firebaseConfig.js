// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2mAD18kxnzk6vF9MnZpKk0EUg07g4slk",
  authDomain: "redemptionfx-1d36c.firebaseapp.com",
  projectId: "redemptionfx-1d36c",
  storageBucket: "redemptionfx-1d36c.firebasestorage.app",
  messagingSenderId: "927778138447",
  appId: "1:927778138447:web:68a588ce6083bedaa87d3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Use production Firebase services (no emulators)
// Commented out emulator connection to use real Firebase services

export default app;