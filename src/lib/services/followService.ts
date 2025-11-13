/**
 * Follow Service
 * 
 * Handles user relationships including follow/unfollow, notifications, and social features.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { UserRelationship, RelationshipType, FollowStats } from '@/types/community';

// Collection references
const USER_RELATIONSHIPS_COLLECTION = 'user_relationships';
const USERS_COLLECTION = 'users';
const NOTIFICATIONS_COLLECTION = 'community_notifications';

// ============================================================================
// FOLLOW/UNFOLLOW OPERATIONS
// ============================================================================

/**
 * Follow a user
 */
export async function followUser(
  followerId: string, 
  followingId: string,
  notificationPreferences: {
    notifyOnSignals?: boolean;
    notifyOnTrades?: boolean;
    notifyOnAchievements?: boolean;
  } = {}
): Promise<void> {
  try {
    // Check if already following
    const existingRelationship = await getRelationship(followerId, followingId);
    if (existingRelationship && existingRelationship.type === 'follow') {
      throw new Error('Already following this user');
    }

    // Check if trying to follow yourself
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    // Create or update relationship
    const relationshipData: Omit<UserRelationship, 'id'> = {
      followerId,
      followingId,
      type: 'follow',
      notifyOnSignals: notificationPreferences.notifyOnSignals ?? true,
      notifyOnTrades: notificationPreferences.notifyOnTrades ?? false,
      notifyOnAchievements: notificationPreferences.notifyOnAchievements ?? true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (existingRelationship) {
      // Update existing relationship (e.g., from block to follow)
      await updateDoc(doc(db, USER_RELATIONSHIPS_COLLECTION, existingRelationship.id!), relationshipData);
    } else {
      // Create new relationship
      await addDoc(collection(db, USER_RELATIONSHIPS_COLLECTION), relationshipData);
    }

    // Update follower/following counts
    await updateFollowCounts(followerId, followingId, 'follow');

    // Create notification for the user being followed
    await createFollowNotification(followerId, followingId, 'followed');

    console.log(`User ${followerId} followed user ${followingId}`);
  } catch (error) {
    console.error('Error following user:', error);
    throw new Error('Failed to follow user');
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  try {
    const relationship = await getRelationship(followerId, followingId);
    
    if (!relationship || relationship.type !== 'follow') {
      throw new Error('Not following this user');
    }

    // Delete the relationship
    await deleteDoc(doc(db, USER_RELATIONSHIPS_COLLECTION, relationship.id!));

    // Update follower/following counts
    await updateFollowCounts(followerId, followingId, 'unfollow');

    console.log(`User ${followerId} unfollowed user ${followingId}`);
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw new Error('Failed to unfollow user');
  }
}

/**
 * Block a user
 */
export async function blockUser(followerId: string, followingId: string): Promise<void> {
  try {
    // Check if trying to block yourself
    if (followerId === followingId) {
      throw new Error('Cannot block yourself');
    }

    // Remove any existing follow relationship
    const existingRelationship = await getRelationship(followerId, followingId);
    if (existingRelationship && existingRelationship.type === 'follow') {
      await deleteDoc(doc(db, USER_RELATIONSHIPS_COLLECTION, existingRelationship.id!));
      await updateFollowCounts(followerId, followingId, 'unfollow');
    }

    // Create block relationship
    const relationshipData: Omit<UserRelationship, 'id'> = {
      followerId,
      followingId,
      type: 'block',
      notifyOnSignals: false,
      notifyOnTrades: false,
      notifyOnAchievements: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await addDoc(collection(db, USER_RELATIONSHIPS_COLLECTION), relationshipData);

    console.log(`User ${followerId} blocked user ${followingId}`);
  } catch (error) {
    console.error('Error blocking user:', error);
    throw new Error('Failed to block user');
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(followerId: string, followingId: string): Promise<void> {
  try {
    const relationship = await getRelationship(followerId, followingId);
    
    if (!relationship || relationship.type !== 'block') {
      throw new Error('User is not blocked');
    }

    // Delete the block relationship
    await deleteDoc(doc(db, USER_RELATIONSHIPS_COLLECTION, relationship.id!));

    console.log(`User ${followerId} unblocked user ${followingId}`);
  } catch (error) {
    console.error('Error unblocking user:', error);
    throw new Error('Failed to unblock user');
  }
}

// ============================================================================
// RELATIONSHIP QUERIES
// ============================================================================

/**
 * Get relationship between two users
 */
export async function getRelationship(
  followerId: string, 
  followingId: string
): Promise<UserRelationship | null> {
  try {
    const q = query(
      collection(db, USER_RELATIONSHIPS_COLLECTION),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId),
      limit(1)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as UserRelationship;
  } catch (error) {
    console.error('Error getting relationship:', error);
    return null;
  }
}

/**
 * Get users that a user follows
 */
export async function getFollowing(
  userId: string, 
  limitCount: number = 50
): Promise<UserRelationship[]> {
  try {
    const q = query(
      collection(db, USER_RELATIONSHIPS_COLLECTION),
      where('followerId', '==', userId),
      where('type', '==', 'follow'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const relationships: UserRelationship[] = [];

    snapshot.forEach((doc) => {
      relationships.push({
        id: doc.id,
        ...doc.data()
      } as UserRelationship);
    });

    return relationships;
  } catch (error) {
    console.error('Error getting following:', error);
    throw new Error('Failed to get following list');
  }
}

/**
 * Get users that follow a user
 */
export async function getFollowers(
  userId: string, 
  limitCount: number = 50
): Promise<UserRelationship[]> {
  try {
    const q = query(
      collection(db, USER_RELATIONSHIPS_COLLECTION),
      where('followingId', '==', userId),
      where('type', '==', 'follow'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const relationships: UserRelationship[] = [];

    snapshot.forEach((doc) => {
      relationships.push({
        id: doc.id,
        ...doc.data()
      } as UserRelationship);
    });

    return relationships;
  } catch (error) {
    console.error('Error getting followers:', error);
    throw new Error('Failed to get followers list');
  }
}

/**
 * Get follow statistics for a user
 */
export async function getFollowStats(userId: string): Promise<FollowStats> {
  try {
    const [followingSnapshot, followersSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, USER_RELATIONSHIPS_COLLECTION),
        where('followerId', '==', userId),
        where('type', '==', 'follow')
      )),
      getDocs(query(
        collection(db, USER_RELATIONSHIPS_COLLECTION),
        where('followingId', '==', userId),
        where('type', '==', 'follow')
      ))
    ]);

    const following = followingSnapshot.docs.map(doc => doc.data().followingId);
    const followers = followersSnapshot.docs.map(doc => doc.data().followerId);
    
    // Calculate mutual follows
    const mutualFollows = following.filter(id => followers.includes(id)).length;

    return {
      followersCount: followers.length,
      followingCount: following.length,
      mutualFollows
    };
  } catch (error) {
    console.error('Error getting follow stats:', error);
    throw new Error('Failed to get follow statistics');
  }
}

/**
 * Check if user A follows user B
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  try {
    const relationship = await getRelationship(followerId, followingId);
    return relationship?.type === 'follow' || false;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Check if user A is blocked by user B
 */
export async function isBlocked(followerId: string, followingId: string): Promise<boolean> {
  try {
    const relationship = await getRelationship(followerId, followingId);
    return relationship?.type === 'block' || false;
  } catch (error) {
    console.error('Error checking block status:', error);
    return false;
  }
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Update notification preferences for a follow relationship
 */
export async function updateNotificationPreferences(
  followerId: string,
  followingId: string,
  preferences: {
    notifyOnSignals?: boolean;
    notifyOnTrades?: boolean;
    notifyOnAchievements?: boolean;
  }
): Promise<void> {
  try {
    const relationship = await getRelationship(followerId, followingId);
    
    if (!relationship || relationship.type !== 'follow') {
      throw new Error('Not following this user');
    }

    await updateDoc(doc(db, USER_RELATIONSHIPS_COLLECTION, relationship.id!), {
      notifyOnSignals: preferences.notifyOnSignals ?? relationship.notifyOnSignals,
      notifyOnTrades: preferences.notifyOnTrades ?? relationship.notifyOnTrades,
      notifyOnAchievements: preferences.notifyOnAchievements ?? relationship.notifyOnAchievements,
      updatedAt: Timestamp.now()
    });

    console.log(`Updated notification preferences for follow relationship`);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw new Error('Failed to update notification preferences');
  }
}

// ============================================================================
// SUGGESTED USERS
// ============================================================================

/**
 * Get suggested users to follow
 */
export async function getSuggestedUsers(
  userId: string, 
  limitCount: number = 10
): Promise<Array<{
  userId: string;
  userName: string;
  userAvatar?: string;
  mutualFollows: number;
  reason: string;
}>> {
  try {
    // Get users that the current user's followers are following
    const following = await getFollowing(userId, 50);
    const followingIds = following.map(f => f.followingId);
    
    if (followingIds.length === 0) {
      // If user has no follows, suggest popular users
      return await getPopularUsers(limitCount);
    }

    // Get relationships where the user's follows are following other users
    const q = query(
      collection(db, USER_RELATIONSHIPS_COLLECTION),
      where('followerId', 'in', followingIds.slice(0, 10)), // Firestore 'in' limit
      where('type', '==', 'follow')
    );

    const snapshot = await getDocs(q);
    const suggestions = new Map<string, number>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const suggestedUserId = data.followingId;
      
      // Skip if user is already following or it's themselves
      if (suggestedUserId === userId || followingIds.includes(suggestedUserId)) {
        return;
      }

      suggestions.set(suggestedUserId, (suggestions.get(suggestedUserId) || 0) + 1);
    });

    // Convert to array and sort by mutual follows
    const suggestionsArray = Array.from(suggestions.entries())
      .map(([userId, mutualFollows]) => ({
        userId,
        mutualFollows,
        userName: '', // Will be filled below
        userAvatar: '',
        reason: `${mutualFollows} mutual followers`
      }))
      .sort((a, b) => b.mutualFollows - a.mutualFollows)
      .slice(0, limitCount);

    // Get user details
    const userDetails = await Promise.all(
      suggestionsArray.map(async (suggestion) => {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, suggestion.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              ...suggestion,
              userName: userData.displayName || 'Unknown User',
              userAvatar: userData.photoURL
            };
          }
          return suggestion;
        } catch (error) {
          return suggestion;
        }
      })
    );

    return userDetails;
  } catch (error) {
    console.error('Error getting suggested users:', error);
    return [];
  }
}

/**
 * Get popular users to follow
 */
async function getPopularUsers(limitCount: number): Promise<Array<{
  userId: string;
  userName: string;
  userAvatar?: string;
  mutualFollows: number;
  reason: string;
}>> {
  try {
    // Get users with most followers
    const q = query(
      collection(db, USER_RELATIONSHIPS_COLLECTION),
      where('type', '==', 'follow')
    );

    const snapshot = await getDocs(q);
    const followerCounts = new Map<string, number>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const followingId = data.followingId;
      followerCounts.set(followingId, (followerCounts.get(followingId) || 0) + 1);
    });

    // Sort by follower count and get top users
    const topUsers = Array.from(followerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitCount);

    // Get user details
    const userDetails = await Promise.all(
      topUsers.map(async ([userId, followerCount]) => {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
              userId,
              userName: userData.displayName || 'Unknown User',
              userAvatar: userData.photoURL,
              mutualFollows: 0,
              reason: `${followerCount} followers`
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );

    return userDetails.filter(Boolean) as Array<{
      userId: string;
      userName: string;
      userAvatar?: string;
      mutualFollows: number;
      reason: string;
    }>;
  } catch (error) {
    console.error('Error getting popular users:', error);
    return [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update follow counts for users
 */
async function updateFollowCounts(
  followerId: string, 
  followingId: string, 
  action: 'follow' | 'unfollow'
): Promise<void> {
  try {
    const batch = db.batch();

    // Update follower's following count
    const followerRef = doc(db, USERS_COLLECTION, followerId);
    batch.update(followerRef, {
      followingCount: increment(action === 'follow' ? 1 : -1),
      updatedAt: Timestamp.now()
    });

    // Update following user's follower count
    const followingRef = doc(db, USERS_COLLECTION, followingId);
    batch.update(followingRef, {
      followersCount: increment(action === 'follow' ? 1 : -1),
      updatedAt: Timestamp.now()
    });

    await batch.commit();
  } catch (error) {
    console.error('Error updating follow counts:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Create follow notification
 */
async function createFollowNotification(
  followerId: string, 
  followingId: string, 
  type: 'followed' | 'unfollowed'
): Promise<void> {
  try {
    // Get follower's name
    const followerDoc = await getDoc(doc(db, USERS_COLLECTION, followerId));
    const followerData = followerDoc.exists() ? followerDoc.data() : null;
    const followerName = followerData?.displayName || 'Someone';

    const notificationData = {
      userId: followingId,
      type: type === 'followed' ? 'follow' : 'unfollow',
      title: type === 'followed' ? 'New Follower' : 'User Unfollowed',
      message: type === 'followed' 
        ? `${followerName} started following you`
        : `${followerName} stopped following you`,
      fromUserId: followerId,
      fromUserName: followerName,
      isRead: false,
      createdAt: Timestamp.now()
    };

    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
  } catch (error) {
    console.error('Error creating follow notification:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Get mutual follows between two users
 */
export async function getMutualFollows(userId1: string, userId2: string): Promise<string[]> {
  try {
    const [following1, following2] = await Promise.all([
      getFollowing(userId1, 100),
      getFollowing(userId2, 100)
    ]);

    const following1Ids = following1.map(f => f.followingId);
    const following2Ids = following2.map(f => f.followingId);

    return following1Ids.filter(id => following2Ids.includes(id));
  } catch (error) {
    console.error('Error getting mutual follows:', error);
    return [];
  }
}


