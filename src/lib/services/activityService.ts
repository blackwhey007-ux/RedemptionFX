/**
 * Activity Service
 * 
 * Handles activity feed generation, tracking, and management.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ActivityFeedItem, ActivityType, VisibilityLevel, ActivityFilters } from '@/types/community';

// Collection references
const ACTIVITY_FEED_COLLECTION = 'activity_feed';
const USERS_COLLECTION = 'users';
const TRADES_COLLECTION = 'trades';
const SIGNALS_COLLECTION = 'signals';
const TRADE_DISCUSSIONS_COLLECTION = 'trade_discussions';

// ============================================================================
// ACTIVITY CREATION
// ============================================================================

/**
 * Create activity item
 */
export async function createActivity(
  userId: string,
  type: ActivityType,
  action: string,
  description: string,
  data: any,
  visibility: VisibilityLevel = 'public'
): Promise<string> {
  try {
    // Get user info
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const activityData: Omit<ActivityFeedItem, 'id'> = {
      userId,
      userName: userData?.displayName || 'Unknown User',
      userAvatar: userData?.photoURL,
      type,
      action,
      description,
      data,
      visibility,
      likes: [],
      likeCount: 0,
      comments: [],
      commentCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, ACTIVITY_FEED_COLLECTION), activityData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw new Error('Failed to create activity');
  }
}

/**
 * Create trade activity
 */
export async function createTradeActivity(
  userId: string,
  tradeId: string,
  tradeData: any
): Promise<void> {
  try {
    const action = tradeData.result === 'WIN' ? 'won_trade' : 
                   tradeData.result === 'LOSS' ? 'lost_trade' : 'closed_trade';
    
    const description = tradeData.result === 'WIN' 
      ? `Won ${tradeData.pair} trade (+${tradeData.pips} pips)`
      : tradeData.result === 'LOSS'
      ? `Lost ${tradeData.pair} trade (${tradeData.pips} pips)`
      : `Closed ${tradeData.pair} trade (${tradeData.pips} pips)`;

    await createActivity(
      userId,
      'trade',
      action,
      description,
      {
        tradeId,
        pair: tradeData.pair,
        result: tradeData.result,
        pips: tradeData.pips,
        profit: tradeData.profit
      },
      'public'
    );
  } catch (error) {
    console.error('Error creating trade activity:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Create achievement activity
 */
export async function createAchievementActivity(
  userId: string,
  achievementId: string,
  achievementName: string,
  achievementIcon: string
): Promise<void> {
  try {
    await createActivity(
      userId,
      'achievement',
      'earned_achievement',
      `Earned achievement: ${achievementName}`,
      {
        achievementId,
        achievementName,
        achievementIcon
      },
      'public'
    );
  } catch (error) {
    console.error('Error creating achievement activity:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Create signal activity
 */
export async function createSignalActivity(
  signalId: string,
  signalData: any
): Promise<void> {
  try {
    // This would typically be created by admin when posting signals
    await createActivity(
      'admin', // or the actual admin user ID
      'signal',
      'posted_signal',
      `Posted new ${signalData.pair} ${signalData.type} signal`,
      {
        signalId,
        pair: signalData.pair,
        type: signalData.type,
        category: signalData.category
      },
      'public'
    );
  } catch (error) {
    console.error('Error creating signal activity:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Create comment activity
 */
export async function createCommentActivity(
  userId: string,
  commentId: string,
  signalId: string,
  commentText: string
): Promise<void> {
  try {
    await createActivity(
      userId,
      'comment',
      'commented_on_signal',
      `Commented on signal: ${commentText.substring(0, 50)}...`,
      {
        commentId,
        signalId,
        commentText
      },
      'public'
    );
  } catch (error) {
    console.error('Error creating comment activity:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Create follow activity
 */
export async function createFollowActivity(
  followerId: string,
  followingId: string,
  action: 'followed' | 'unfollowed'
): Promise<void> {
  try {
    await createActivity(
      followerId,
      'follow',
      action,
      action === 'followed' ? 'Started following a trader' : 'Unfollowed a trader',
      {
        followingId,
        action
      },
      'public'
    );
  } catch (error) {
    console.error('Error creating follow activity:', error);
    // Don't throw here as it's not critical
  }
}

// ============================================================================
// ACTIVITY QUERIES
// ============================================================================

/**
 * Get activity feed for a user
 */
export async function getActivityFeed(
  userId: string,
  filters: ActivityFilters = {},
  limitCount: number = 20,
  lastDoc?: any
): Promise<{ activities: ActivityFeedItem[], lastDoc: any }> {
  try {
    let q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // Apply filters
    if (filters.type && filters.type.length > 0) {
      q = query(q, where('type', 'in', filters.type));
    }

    if (filters.visibility) {
      q = query(q, where('visibility', '==', filters.visibility));
    }

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const activities: ActivityFeedItem[] = [];
    let newLastDoc = null;

    snapshot.forEach((doc) => {
      const activity = {
        id: doc.id,
        ...doc.data()
      } as ActivityFeedItem;
      
      // Filter by visibility
      if (activity.visibility === 'public' || 
          activity.visibility === 'followers' ||
          activity.userId === userId) {
        activities.push(activity);
      }
      
      newLastDoc = doc;
    });

    return { activities, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    throw new Error('Failed to fetch activity feed');
  }
}

/**
 * Get user's activity feed
 */
export async function getUserActivityFeed(
  userId: string,
  limitCount: number = 20,
  lastDoc?: any
): Promise<{ activities: ActivityFeedItem[], lastDoc: any }> {
  try {
    let q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const activities: ActivityFeedItem[] = [];
    let newLastDoc = null;

    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as ActivityFeedItem);
      newLastDoc = doc;
    });

    return { activities, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error fetching user activity feed:', error);
    throw new Error('Failed to fetch user activity feed');
  }
}

/**
 * Get activity feed for followed users
 */
export async function getFollowingActivityFeed(
  userId: string,
  followingIds: string[],
  limitCount: number = 20,
  lastDoc?: any
): Promise<{ activities: ActivityFeedItem[], lastDoc: any }> {
  try {
    if (followingIds.length === 0) {
      return { activities: [], lastDoc: null };
    }

    let q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where('userId', 'in', followingIds.slice(0, 10)), // Firestore 'in' limit
      where('visibility', 'in', ['public', 'followers']),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const activities: ActivityFeedItem[] = [];
    let newLastDoc = null;

    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as ActivityFeedItem);
      newLastDoc = doc;
    });

    return { activities, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error fetching following activity feed:', error);
    throw new Error('Failed to fetch following activity feed');
  }
}

// ============================================================================
// ACTIVITY ENGAGEMENT
// ============================================================================

/**
 * Like/unlike an activity
 */
export async function toggleActivityLike(activityId: string, userId: string): Promise<boolean> {
  try {
    const activityRef = doc(db, ACTIVITY_FEED_COLLECTION, activityId);
    const activitySnap = await getDoc(activityRef);
    
    if (!activitySnap.exists()) {
      throw new Error('Activity not found');
    }

    const activityData = activitySnap.data();
    const isLiked = activityData.likes?.includes(userId) || false;

    if (isLiked) {
      // Unlike
      await updateDoc(activityRef, {
        likes: arrayRemove(userId),
        likeCount: increment(-1),
        updatedAt: Timestamp.now()
      });
      return false;
    } else {
      // Like
      await updateDoc(activityRef, {
        likes: arrayUnion(userId),
        likeCount: increment(1),
        updatedAt: Timestamp.now()
      });
      return true;
    }
  } catch (error) {
    console.error('Error toggling activity like:', error);
    throw new Error('Failed to toggle like');
  }
}

// ============================================================================
// ACTIVITY STATISTICS
// ============================================================================

/**
 * Get activity statistics
 */
export async function getActivityStats(): Promise<{
  totalActivities: number;
  activitiesByType: { [key in ActivityType]: number };
  recentActivities: number;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    activityCount: number;
  }>;
}> {
  try {
    const q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(1000) // Get recent activities
    );

    const snapshot = await getDocs(q);
    let totalActivities = 0;
    const activitiesByType = {
      trade: 0,
      achievement: 0,
      signal: 0,
      comment: 0,
      follow: 0,
      like: 0
    };
    
    const userActivityCounts = new Map<string, number>();
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Last 7 days
    let recentActivities = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalActivities++;
      
      // Count by type
      if (activitiesByType.hasOwnProperty(data.type)) {
        activitiesByType[data.type as ActivityType]++;
      }
      
      // Count by user
      const userId = data.userId;
      userActivityCounts.set(userId, (userActivityCounts.get(userId) || 0) + 1);
      
      // Count recent activities
      if (data.createdAt.toDate() > recentDate) {
        recentActivities++;
      }
    });

    // Get most active users
    const sortedUsers = Array.from(userActivityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const mostActiveUsers = await Promise.all(
      sortedUsers.map(async ([userId, activityCount]) => {
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
          const userData = userDoc.exists() ? userDoc.data() : null;
          return {
            userId,
            userName: userData?.displayName || 'Unknown User',
            activityCount
          };
        } catch (error) {
          return {
            userId,
            userName: 'Unknown User',
            activityCount
          };
        }
      })
    );

    return {
      totalActivities,
      activitiesByType,
      recentActivities,
      mostActiveUsers
    };
  } catch (error) {
    console.error('Error getting activity stats:', error);
    throw new Error('Failed to get activity statistics');
  }
}

/**
 * Get user's activity statistics
 */
export async function getUserActivityStats(userId: string): Promise<{
  totalActivities: number;
  activitiesByType: { [key in ActivityType]: number };
  recentActivities: number;
  averageActivitiesPerDay: number;
}> {
  try {
    const q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let totalActivities = 0;
    const activitiesByType = {
      trade: 0,
      achievement: 0,
      signal: 0,
      comment: 0,
      follow: 0,
      like: 0
    };
    
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Last 7 days
    let recentActivities = 0;
    let oldestActivity: Date | null = null;

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalActivities++;
      
      // Count by type
      if (activitiesByType.hasOwnProperty(data.type)) {
        activitiesByType[data.type as ActivityType]++;
      }
      
      // Count recent activities
      if (data.createdAt.toDate() > recentDate) {
        recentActivities++;
      }
      
      // Track oldest activity for average calculation
      const activityDate = data.createdAt.toDate();
      if (!oldestActivity || activityDate < oldestActivity) {
        oldestActivity = activityDate;
      }
    });

    // Calculate average activities per day
    let averageActivitiesPerDay = 0;
    if (oldestActivity) {
      const daysDiff = Math.max(1, Math.ceil((Date.now() - oldestActivity.getTime()) / (1000 * 60 * 60 * 24)));
      averageActivitiesPerDay = totalActivities / daysDiff;
    }

    return {
      totalActivities,
      activitiesByType,
      recentActivities,
      averageActivitiesPerDay: Math.round(averageActivitiesPerDay * 100) / 100
    };
  } catch (error) {
    console.error('Error getting user activity stats:', error);
    throw new Error('Failed to get user activity statistics');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clean up old activities (for maintenance)
 */
export async function cleanupOldActivities(daysOld: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const q = query(
      collection(db, ACTIVITY_FEED_COLLECTION),
      where('createdAt', '<', Timestamp.fromDate(cutoffDate))
    );

    const snapshot = await getDocs(q);
    const batch = db.batch();
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    console.log(`Cleaned up ${snapshot.size} old activities`);
    return snapshot.size;
  } catch (error) {
    console.error('Error cleaning up old activities:', error);
    throw new Error('Failed to cleanup old activities');
  }
}

/**
 * Get activity by ID
 */
export async function getActivity(activityId: string): Promise<ActivityFeedItem | null> {
  try {
    const doc = await getDoc(doc(db, ACTIVITY_FEED_COLLECTION, activityId));
    
    if (!doc.exists()) {
      return null;
    }
    
    return {
      id: doc.id,
      ...doc.data()
    } as ActivityFeedItem;
  } catch (error) {
    console.error('Error getting activity:', error);
    throw new Error('Failed to get activity');
  }
}


