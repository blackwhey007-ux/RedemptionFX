// Firestore database helpers
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Collection references
export const collections = {
  users: 'users',
  signals: 'signals',
  memberTrades: 'memberTrades',
  subscriptions: 'subscriptions',
  analytics: 'analytics',
  performance: 'performance',
  settings: 'settings',
  notifications: 'notifications'
};

// Generic CRUD operations
export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Document not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateDocument = async (collectionName: string, docId: string, data: any) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteDocument = async (collectionName: string, docId: string) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDocuments = async (collectionName: string, constraints: any[] = []) => {
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: documents };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Specific helper functions for our app
export const getSignals = async (limitCount: number = 10) => {
  return getDocuments(collections.signals, [
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  ]);
};

export const getUserTrades = async (userId: string) => {
  return getDocuments(collections.memberTrades, [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  ]);
};

export const getUsers = async () => {
  return getDocuments(collections.users, [
    orderBy('createdAt', 'desc')
  ]);
};

export const getAnalytics = async () => {
  return getDocuments(collections.analytics, [
    orderBy('createdAt', 'desc'),
    limit(30)
  ]);
};

// Export the db instance for direct use if needed
export { db };