// Firebase Authentication helpers
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  VIP: 'vip',
  GUEST: 'guest'
};

// Admin email (hardcoded owner)
const ADMIN_EMAIL = 'blackwhey007@gmail.com';

// Check if user is admin by email
export const checkAdminRole = (email) => {
  return email === ADMIN_EMAIL;
};

// Assign user role based on email
export const assignUserRole = (email) => {
  return checkAdminRole(email) ? USER_ROLES.ADMIN : USER_ROLES.GUEST;
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign up with email and password
export const signUpWithEmail = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, {
      displayName: userData.displayName || userData.name || 'Trader'
    });
    
    // Create user document in Firestore with role assignment
    const userRole = assignUserRole(user.email);
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: userData.displayName || userData.name || 'Trader',
      role: userRole,
      status: 'active',
      profileSettings: {
        displayName: userData.displayName || userData.name || 'Trader',
        photoURL: null,
        photoStoragePath: null,
        bio: null,
        timezone: 'UTC',
        discordUsername: null,
        telegramUsername: null,
        displayNameChangeRequested: null,
        displayNameChangeStatus: 'none'
      },
      paymentInfo: {
        cryptoWallet: '',
        amount: 0,
        currency: 'USDT',
        txHash: '',
        paidAt: null,
        expiresAt: null
      },
      createdAt: new Date(),
      lastLogin: new Date(),
      isEmailVerified: false,
      ...userData
    });
    
    // Send email verification
    await sendEmailVerification(user);
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      // Create user document for new Google users with role assignment
      const userRole = assignUserRole(user.email);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: userRole,
        status: 'active',
        profileSettings: {
          displayName: user.displayName,
          photoURL: user.photoURL,
          photoStoragePath: null,
          bio: null,
          timezone: 'UTC',
          discordUsername: null,
          telegramUsername: null,
          displayNameChangeRequested: null,
          displayNameChangeStatus: 'none'
        },
        paymentInfo: {
          cryptoWallet: '',
          amount: 0,
          currency: 'USDT',
          txHash: '',
          paidAt: null,
          expiresAt: null
        },
        createdAt: new Date(),
        lastLogin: new Date(),
        isEmailVerified: true
      });
    } else {
      // Update last login
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: new Date()
      });
    }
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Get current user
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get user data from Firestore
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update user data
export const updateUserData = async (uid, data) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Check if user is admin
export const isAdmin = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData.success) {
      return userData.data.role === USER_ROLES.ADMIN;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Check if user is VIP
export const isVIP = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData.success) {
      return userData.data.role === USER_ROLES.VIP;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Check if user is guest
export const isGuest = async (uid) => {
  try {
    const userData = await getUserData(uid);
    if (userData.success) {
      return userData.data.role === USER_ROLES.GUEST;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// Update user role (admin only)
export const updateUserRole = async (uid, newRole) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      role: newRole,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update profile settings
export const updateProfileSettings = async (uid, settings) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      'profileSettings': {
        ...settings,
        updatedAt: new Date()
      },
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Request display name change (requires admin approval)
export const requestDisplayNameChange = async (uid, newDisplayName) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      'profileSettings.displayNameChangeRequested': newDisplayName,
      'profileSettings.displayNameChangeStatus': 'pending',
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Approve/reject display name change (admin only)
export const handleDisplayNameChange = async (uid, approved, newDisplayName = null) => {
  try {
    const updates = {
      'profileSettings.displayNameChangeStatus': approved ? 'approved' : 'rejected',
      updatedAt: new Date()
    };
    
    if (approved && newDisplayName) {
      updates['profileSettings.displayName'] = newDisplayName;
      updates['profileSettings.displayNameChangeRequested'] = null;
    }
    
    await updateDoc(doc(db, 'users', uid), updates);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update Firebase Auth profile (displayName, photoURL)
export const updateFirebaseProfile = async (profileData) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    await updateProfile(user, profileData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update Firebase Auth email
export const updateFirebaseEmail = async (newEmail, currentPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    // Re-authenticate user before changing email
    await signInWithEmailAndPassword(auth, user.email, currentPassword);
    await updateEmail(user, newEmail);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update Firebase Auth password
export const updateFirebasePassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    // Re-authenticate user before changing password
    await signInWithEmailAndPassword(auth, user.email, currentPassword);
    await updatePassword(user, newPassword);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Upload profile photo to Firebase Storage
export const uploadProfilePhoto = async (file, userId) => {
  console.log('uploadProfilePhoto called with:', { fileName: file?.name, fileSize: file?.size, fileType: file?.type, userId });
  
  try {
    if (!file || !userId) {
      console.error('Missing file or userId:', { file: !!file, userId: !!userId });
      throw new Error('File and userId are required');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      throw new Error('File must be an image');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      throw new Error('File size must be less than 5MB');
    }

    console.log('Creating storage reference...');
    // Create storage reference
    const storageRef = ref(storage, `profile-photos/${userId}/${Date.now()}-${file.name}`);
    
    console.log('Uploading file to Firebase Storage...');
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Upload completed, getting download URL...');
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    
    return { success: true, downloadURL };
  } catch (error) {
    console.error('uploadProfilePhoto error:', error);
    return { success: false, error: error.message };
  }
};

// Delete profile photo from Firebase Storage
export const deleteProfilePhoto = async (photoURL) => {
  try {
    if (!photoURL) {
      return { success: true };
    }

    // Extract file path from URL
    const url = new URL(photoURL);
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
    
    if (!pathMatch) {
      return { success: true }; // Not a Firebase Storage URL, ignore
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, filePath);
    
    await deleteObject(fileRef);
    
    return { success: true };
  } catch (error) {
    // Don't throw error if file doesn't exist
    if (error.code === 'storage/object-not-found') {
      return { success: true };
    }
    return { success: false, error: error.message };
  }
};

// Update profile photo (upload new photo and update Firebase Auth + Firestore)
export const updateProfilePhoto = async (file, userId) => {
  console.log('updateProfilePhoto called with:', { file: file?.name, userId });
  
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('No authenticated user');
      throw new Error('No authenticated user');
    }
    
    if (user.uid !== userId) {
      console.error('User ID mismatch:', { currentUserId: user.uid, requestedUserId: userId });
      throw new Error('Unauthorized');
    }

    console.log('Getting current photo URL...');
    // Get current photo URL to delete old one later
    const currentPhotoURL = user.photoURL;

    console.log('Uploading new photo...');
    // Upload new photo
    const uploadResult = await uploadProfilePhoto(file, userId);
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      console.error('Upload failed:', uploadResult.error);
      throw new Error(uploadResult.error);
    }

    console.log('Updating Firebase Auth profile...');
    // Update Firebase Auth profile
    const authResult = await updateFirebaseProfile({
      displayName: user.displayName,
      photoURL: uploadResult.downloadURL
    });

    console.log('Firebase Auth update result:', authResult);

    if (!authResult.success) {
      console.error('Firebase Auth update failed, cleaning up uploaded file...');
      // If Firebase Auth update fails, delete the uploaded file
      await deleteProfilePhoto(uploadResult.downloadURL);
      throw new Error(authResult.error);
    }

    console.log('Updating Firestore user document...');
    // Update Firestore user document
    const firestoreResult = await updateUserData(userId, {
      photoURL: uploadResult.downloadURL,
      'profileSettings.photoURL': uploadResult.downloadURL
    });

    console.log('Firestore update result:', firestoreResult);

    if (!firestoreResult.success) {
      console.error('Firestore update failed:', firestoreResult.error);
      throw new Error(firestoreResult.error);
    }

    console.log('Cleaning up old photo...');
    // Delete old photo if it exists and is different
    if (currentPhotoURL && currentPhotoURL !== uploadResult.downloadURL) {
      await deleteProfilePhoto(currentPhotoURL);
    }

    console.log('Photo update completed successfully');
    return { success: true, photoURL: uploadResult.downloadURL };
  } catch (error) {
    console.error('updateProfilePhoto error:', error);
    return { success: false, error: error.message };
  }
};