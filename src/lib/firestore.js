// Firestore database utilities
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
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Export db for use in other files
export { db };

// Generic function to add document
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Generic function to get document by ID
export const getDocument = async (collectionName, docId) => {
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

// Generic function to update document
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Generic function to delete document
export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Generic function to get collection with query
export const getCollection = async (collectionName, queryConstraints = []) => {
  try {
    const q = query(collection(db, collectionName), ...queryConstraints);
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

// Signals collection functions
export const addSignal = async (signalData) => {
  return await addDocument('signals', signalData);
};

export const getSignals = async (limitCount = 50) => {
  return await getCollection('signals', [
    orderBy('postedAt', 'desc'),
    limit(limitCount)
  ]);
};

export const getSignal = async (signalId) => {
  return await getDocument('signals', signalId);
};

export const updateSignal = async (signalId, signalData) => {
  return await updateDocument('signals', signalId, signalData);
};

export const deleteSignal = async (signalId) => {
  return await deleteDocument('signals', signalId);
};

// Users collection functions
export const addUser = async (userData) => {
  return await addDocument('users', userData);
};

export const getUser = async (userId) => {
  return await getDocument('users', userId);
};

export const updateUser = async (userId, userData) => {
  return await updateDocument('users', userId, userData);
};

export const getUsers = async (limitCount = 50) => {
  return await getCollection('users', [limit(limitCount)]);
};

export const getUsersByRole = async (role) => {
  return await getCollection('users', [
    where('role', '==', role),
    limit(50)
  ]);
};

// Member trades collection functions
export const addMemberTrade = async (tradeData) => {
  return await addDocument('memberTrades', tradeData);
};

export const getMemberTrades = async (userId) => {
  return await getCollection('memberTrades', [
    where('userId', '==', userId),
    orderBy('followedAt', 'desc'),
    limit(50)
  ]);
};

export const updateMemberTrade = async (tradeId, tradeData) => {
  return await updateDocument('memberTrades', tradeId, tradeData);
};

// Subscriptions collection functions
export const addSubscription = async (subscriptionData) => {
  return await addDocument('subscriptions', subscriptionData);
};

export const getSubscription = async (subscriptionId) => {
  return await getDocument('subscriptions', subscriptionId);
};

export const getUserSubscription = async (userId) => {
  const result = await getCollection('subscriptions', [
    where('userId', '==', userId),
    limit(1)
  ]);
  
  if (result.success && result.data.length > 0) {
    return { success: true, data: result.data[0] };
  } else {
    return { success: false, error: 'No subscription found' };
  }
};

export const updateSubscription = async (subscriptionId, subscriptionData) => {
  return await updateDocument('subscriptions', subscriptionId, subscriptionData);
};

// Announcements collection functions
export const addAnnouncement = async (announcementData) => {
  return await addDocument('announcements', announcementData);
};

export const getAnnouncements = async (limitCount = 20) => {
  return await getCollection('announcements', [
    orderBy('sentAt', 'desc'),
    limit(limitCount)
  ]);
};

export const updateAnnouncement = async (announcementId, announcementData) => {
  return await updateDocument('announcements', announcementId, announcementData);
};

// Settings collection functions
export const addSetting = async (settingData) => {
  return await addDocument('settings', settingData);
};

export const getSetting = async (settingKey) => {
  const result = await getCollection('settings', [
    where('key', '==', settingKey),
    limit(1)
  ]);
  
  if (result.success && result.data.length > 0) {
    return { success: true, data: result.data[0] };
  } else {
    return { success: false, error: 'Setting not found' };
  }
};

export const updateSetting = async (settingKey, value) => {
  const result = await getCollection('settings', [
    where('key', '==', settingKey),
    limit(1)
  ]);
  
  if (result.success && result.data.length > 0) {
    return await updateDocument('settings', result.data[0].id, { value });
  } else {
    return await addDocument('settings', { key: settingKey, value });
  }
};

// Performance collection functions
export const addPerformance = async (performanceData) => {
  return await addDocument('performance', performanceData);
};

export const getUserPerformance = async (userId) => {
  const result = await getCollection('performance', [
    where('userId', '==', userId),
    limit(1)
  ]);
  
  if (result.success && result.data.length > 0) {
    return { success: true, data: result.data[0] };
  } else {
    return { success: false, error: 'Performance data not found' };
  }
};

export const updateUserPerformance = async (userId, performanceData) => {
  const result = await getCollection('performance', [
    where('userId', '==', userId),
    limit(1)
  ]);
  
  if (result.success && result.data.length > 0) {
    return await updateDocument('performance', result.data[0].id, performanceData);
  } else {
    return await addDocument('performance', { userId, ...performanceData });
  }
};

// Real-time listeners
export const listenToSignals = (callback) => {
  const q = query(collection(db, 'signals'), orderBy('postedAt', 'desc'), limit(20));
  return onSnapshot(q, callback);
};

export const listenToUserTrades = (userId, callback) => {
  const q = query(
    collection(db, 'memberTrades'), 
    where('userId', '==', userId),
    orderBy('followedAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, callback);
};
