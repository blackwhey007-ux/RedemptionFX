/**
 * Utility function to safely convert various timestamp formats to Date objects
 * Handles Firestore Timestamps, serialized timestamps, Date objects, and more
 */
export const getDateFromTimestamp = (timestamp: any): Date => {
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp
  }
  
  // If it's a Firestore Timestamp with toDate method
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate()
  }
  
  // If it's a serialized Timestamp with seconds property
  if (timestamp && typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000)
  }
  
  // If it's a number (milliseconds since epoch)
  if (typeof timestamp === 'number') {
    return new Date(timestamp)
  }
  
  // If it's a string (ISO date string)
  if (typeof timestamp === 'string') {
    return new Date(timestamp)
  }
  
  // If it's an object with _seconds property (Firestore serialized format)
  if (timestamp && typeof timestamp._seconds === 'number') {
    return new Date(timestamp._seconds * 1000)
  }
  
  // Fallback to current date with warning
  console.warn('Unknown timestamp format:', timestamp)
  return new Date()
}

/**
 * Check if a timestamp is a Firestore Timestamp
 */
export const isFirestoreTimestamp = (timestamp: any): boolean => {
  return timestamp && typeof timestamp.toDate === 'function'
}

/**
 * Check if a timestamp is a serialized Firestore Timestamp
 */
export const isSerializedTimestamp = (timestamp: any): boolean => {
  return timestamp && (typeof timestamp.seconds === 'number' || typeof timestamp._seconds === 'number')
}

/**
 * Convert various timestamp formats to milliseconds since epoch
 * Handles Firestore Timestamps, serialized timestamps, Date objects, and more
 */
export const getTimestampMillis = (timestamp: any): number => {
  // If it's a Firestore Timestamp with toMillis method
  if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }
  
  // If it's already a Date object
  if (timestamp instanceof Date) {
    return timestamp.getTime()
  }
  
  // If it's a serialized Timestamp with seconds property
  if (timestamp && typeof timestamp.seconds === 'number') {
    return timestamp.seconds * 1000
  }
  
  // If it's a number (already milliseconds)
  if (typeof timestamp === 'number') {
    return timestamp
  }
  
  // If it's a string, parse it
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime()
  }
  
  // If it's an object with _seconds property (Firestore serialized format)
  if (timestamp && typeof timestamp._seconds === 'number') {
    return timestamp._seconds * 1000
  }
  
  // Fallback to current time with warning
  console.warn('Unknown timestamp format for toMillis:', timestamp)
  return Date.now()
}
