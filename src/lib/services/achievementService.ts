/**
 * Achievement Service
 * 
 * Handles achievement checking, awarding, and progress tracking.
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
  Timestamp,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  Achievement, 
  UserAchievement, 
  AchievementType, 
  AchievementRarity,
  ACHIEVEMENT_TEMPLATES 
} from '@/types/gamification';

// Collection references
const ACHIEVEMENTS_COLLECTION = 'achievements';
const USER_ACHIEVEMENTS_COLLECTION = 'user_achievements';
const TRADES_COLLECTION = 'trades';
const USERS_COLLECTION = 'users';
const EXPERIENCE_TRANSACTIONS_COLLECTION = 'experience_transactions';

// ============================================================================
// ACHIEVEMENT MANAGEMENT
// ============================================================================

/**
 * Initialize achievements from templates
 */
export async function initializeAchievements(): Promise<void> {
  try {
    console.log('Initializing achievements from templates...');
    
    const batch = writeBatch(db);
    let count = 0;
    
    for (const template of ACHIEVEMENT_TEMPLATES) {
      // Check if achievement already exists
      const existingQuery = query(
        collection(db, ACHIEVEMENTS_COLLECTION),
        where('name', '==', template.name),
        limit(1)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        const achievement: Omit<Achievement, 'id'> = {
          ...template,
          requirements: {
            ...template.requirements,
            timeframe: (template.requirements?.timeframe as 'monthly' | 'daily' | 'weekly' | 'allTime' | undefined) || 'allTime'
          } as Achievement['requirements'],
          earnedByCount: 0,
          totalEarned: 0,
          isActive: true,
          isHidden: false,
          isRepeatable: false,
          difficulty: getDifficultyFromRarity(template.rarity),
          tags: [template.category.toLowerCase()],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
        
        const achievementDocRef = doc(collection(db, ACHIEVEMENTS_COLLECTION));
        batch.set(achievementDocRef, achievement);
        count++;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Initialized ${count} achievements`);
    } else {
      console.log('All achievements already initialized');
    }
  } catch (error) {
    console.error('Error initializing achievements:', error);
    throw new Error('Failed to initialize achievements');
  }
}

/**
 * Get all available achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const q = query(
      collection(db, ACHIEVEMENTS_COLLECTION),
      where('isActive', '==', true),
      orderBy('rarity', 'asc'),
      orderBy('difficulty', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const achievements: Achievement[] = [];
    
    snapshot.forEach((doc) => {
      achievements.push({
        id: doc.id,
        ...doc.data()
      } as Achievement);
    });
    
    return achievements;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    throw new Error('Failed to fetch achievements');
  }
}

/**
 * Get user's achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const q = query(
      collection(db, USER_ACHIEVEMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const userAchievements: UserAchievement[] = [];
    
    snapshot.forEach((doc) => {
      userAchievements.push({
        id: doc.id,
        ...doc.data()
      } as UserAchievement);
    });
    
    return userAchievements;
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    throw new Error('Failed to fetch user achievements');
  }
}

/**
 * Get user's completed achievements
 */
export async function getUserCompletedAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const userAchievements = await getUserAchievements(userId);
    return userAchievements.filter(achievement => achievement.isCompleted);
  } catch (error) {
    console.error('Error fetching user completed achievements:', error);
    throw new Error('Failed to fetch user completed achievements');
  }
}

// ============================================================================
// ACHIEVEMENT CHECKING & AWARDING
// ============================================================================

/**
 * Check and award achievements for a user
 */
export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    const awardedAchievements: string[] = [];
    
    // Get user's current achievements
    const userAchievements = await getUserAchievements(userId);
    const completedAchievementIds = userAchievements
      .filter(ua => ua.isCompleted)
      .map(ua => ua.achievementId);
    
    // Get all active achievements
    const achievements = await getAllAchievements();
    
    // Check each achievement
    for (const achievement of achievements) {
      // Skip if already completed (unless repeatable)
      if (completedAchievementIds.includes(achievement.id!) && !achievement.isRepeatable) {
        continue;
      }
      
      // Check if user meets requirements
      const progress = await checkAchievementProgress(userId, achievement);
      
      if (progress.isCompleted) {
        // Award achievement
        await awardAchievement(userId, achievement, progress.progress);
        awardedAchievements.push(achievement.name);
        
        // Award experience
        await awardExperience(userId, achievement.rewards.experience, 'achievement', achievement.id);
      } else {
        // Update progress
        await updateAchievementProgress(userId, achievement.id!, progress.progress);
      }
    }
    
    return awardedAchievements;
  } catch (error) {
    console.error('Error checking and awarding achievements:', error);
    throw new Error('Failed to check achievements');
  }
}

/**
 * Check achievement progress for a user
 */
async function checkAchievementProgress(
  userId: string, 
  achievement: Achievement
): Promise<{ progress: number; isCompleted: boolean }> {
  try {
    const { type, threshold } = achievement.requirements;
    
    let progress = 0;
    
    switch (type) {
      case 'trade_count':
        progress = await getUserTradeCount(userId);
        break;
      case 'win_rate':
        progress = await getUserWinRate(userId);
        break;
      case 'profit':
        progress = await getUserTotalProfit(userId);
        break;
      case 'streak':
        progress = await getUserStreak(userId);
        break;
      case 'social':
        progress = await getUserSocialActivity(userId);
        break;
      default:
        progress = 0;
    }
    
    return {
      progress,
      isCompleted: progress >= threshold
    };
  } catch (error) {
    console.error('Error checking achievement progress:', error);
    return { progress: 0, isCompleted: false };
  }
}

/**
 * Award achievement to user
 */
async function awardAchievement(
  userId: string, 
  achievement: Achievement, 
  progress: number
): Promise<void> {
  try {
    const userAchievementData: Omit<UserAchievement, 'id'> = {
      userId,
      achievementId: achievement.id!,
      progress,
      threshold: achievement.requirements.threshold,
      isCompleted: true,
      completedAt: Timestamp.now(),
      progressUpdatedAt: Timestamp.now(),
      earnedCount: 1,
      lastEarnedAt: Timestamp.now(),
      createdAt: Timestamp.now()
    };
    
    await addDoc(collection(db, USER_ACHIEVEMENTS_COLLECTION), userAchievementData);
    
    // Update achievement stats
    await updateDoc(doc(db, ACHIEVEMENTS_COLLECTION, achievement.id!), {
      earnedByCount: increment(1),
      totalEarned: increment(1),
      updatedAt: Timestamp.now()
    });
    
    console.log(`Awarded achievement "${achievement.name}" to user ${userId}`);
  } catch (error) {
    console.error('Error awarding achievement:', error);
    throw new Error('Failed to award achievement');
  }
}

/**
 * Update achievement progress
 */
async function updateAchievementProgress(
  userId: string, 
  achievementId: string, 
  progress: number
): Promise<void> {
  try {
    // Check if user achievement record exists
    const userAchievementQuery = query(
      collection(db, USER_ACHIEVEMENTS_COLLECTION),
      where('userId', '==', userId),
      where('achievementId', '==', achievementId),
      limit(1)
    );
    
    const snapshot = await getDocs(userAchievementQuery);
    
    if (snapshot.empty) {
      // Create new progress record
      const userAchievementData: Omit<UserAchievement, 'id'> = {
        userId,
        achievementId,
        progress,
        threshold: 0, // Will be set when we get achievement details
        isCompleted: false,
        progressUpdatedAt: Timestamp.now(),
        earnedCount: 0,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, USER_ACHIEVEMENTS_COLLECTION), userAchievementData);
    } else {
      // Update existing progress
      const doc = snapshot.docs[0];
      await updateDoc(doc.ref, {
        progress,
        progressUpdatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error updating achievement progress:', error);
    throw new Error('Failed to update achievement progress');
  }
}

// ============================================================================
// PROGRESS CALCULATION HELPERS
// ============================================================================

/**
 * Get user's total trade count
 */
async function getUserTradeCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting user trade count:', error);
    return 0;
  }
}

/**
 * Get user's win rate
 */
async function getUserWinRate(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    let totalTrades = 0;
    let winningTrades = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalTrades++;
      if (data.result === 'WIN') {
        winningTrades++;
      }
    });
    
    return totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  } catch (error) {
    console.error('Error getting user win rate:', error);
    return 0;
  }
}

/**
 * Get user's total profit
 */
async function getUserTotalProfit(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    let totalProfit = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalProfit += data.profit || 0;
    });
    
    return totalProfit;
  } catch (error) {
    console.error('Error getting user total profit:', error);
    return 0;
  }
}

/**
 * Get user's current streak
 */
async function getUserStreak(userId: string): Promise<number> {
  try {
    // This is a simplified implementation
    // In a real app, you'd want to track streaks more precisely
    const q = query(
      collection(db, TRADES_COLLECTION),
      where('userId', '==', userId),
      orderBy('entryTime', 'desc'),
      limit(30) // Check last 30 trades
    );
    
    const snapshot = await getDocs(q);
    let streak = 0;
    const trades = snapshot.docs.map(doc => doc.data());
    
    // Check for consecutive winning trades
    for (const trade of trades) {
      if (trade.result === 'WIN') {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  } catch (error) {
    console.error('Error getting user streak:', error);
    return 0;
  }
}

/**
 * Get user's social activity
 */
async function getUserSocialActivity(userId: string): Promise<number> {
  try {
    // This would count comments, likes, etc.
    // For now, we'll use a simplified approach
    const commentsQuery = query(
      collection(db, 'trade_discussions'),
      where('userId', '==', userId)
    );
    
    const commentsSnapshot = await getDocs(commentsQuery);
    return commentsSnapshot.size;
  } catch (error) {
    console.error('Error getting user social activity:', error);
    return 0;
  }
}

// ============================================================================
// EXPERIENCE SYSTEM
// ============================================================================

/**
 * Award experience to user
 */
async function awardExperience(
  userId: string, 
  amount: number, 
  source: string, 
  sourceId?: string
): Promise<void> {
  try {
    // Record experience transaction
    await addDoc(collection(db, EXPERIENCE_TRANSACTIONS_COLLECTION), {
      userId,
      amount,
      source,
      sourceId,
      description: `Earned ${amount} XP from ${source}`,
      createdAt: Timestamp.now()
    });
    
    // Update user's total experience (you might want to do this in a cloud function)
    // For now, we'll just record the transaction
    console.log(`Awarded ${amount} XP to user ${userId} from ${source}`);
  } catch (error) {
    console.error('Error awarding experience:', error);
    throw new Error('Failed to award experience');
  }
}

/**
 * Get user's total experience
 */
export async function getUserTotalExperience(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, EXPERIENCE_TRANSACTIONS_COLLECTION),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    let totalExperience = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      totalExperience += data.amount || 0;
    });
    
    return totalExperience;
  } catch (error) {
    console.error('Error getting user total experience:', error);
    return 0;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get difficulty level from rarity
 */
function getDifficultyFromRarity(rarity: AchievementRarity): number {
  switch (rarity) {
    case 'common':
      return 1;
    case 'rare':
      return 3;
    case 'epic':
      return 6;
    case 'legendary':
      return 10;
    default:
      return 1;
  }
}

/**
 * Get achievement by ID
 */
export async function getAchievement(achievementId: string): Promise<Achievement | null> {
  try {
    // Fix: Use different variable names to avoid shadowing the imported 'doc' function
    const achievementDocRef = doc(db, ACHIEVEMENTS_COLLECTION, achievementId);
    const achievementDocSnapshot = await getDoc(achievementDocRef);
    
    if (!achievementDocSnapshot.exists()) {
      return null;
    }
    
    return {
      id: achievementDocSnapshot.id,
      ...achievementDocSnapshot.data()
    } as Achievement;
  } catch (error) {
    console.error('Error getting achievement:', error);
    throw new Error('Failed to get achievement');
  }
}

/**
 * Get achievement statistics
 */
export async function getAchievementStats(): Promise<{
  totalAchievements: number;
  totalEarned: number;
  mostPopular: string;
  rarestAchievement: string;
}> {
  try {
    const achievements = await getAllAchievements();
    
    let totalAchievements = achievements.length;
    let totalEarned = 0;
    let mostPopular = '';
    let rarestAchievement = '';
    let maxEarned = 0;
    let minEarned = Infinity;
    
    achievements.forEach(achievement => {
      totalEarned += achievement.totalEarned;
      
      if (achievement.totalEarned > maxEarned) {
        maxEarned = achievement.totalEarned;
        mostPopular = achievement.name;
      }
      
      if (achievement.totalEarned < minEarned) {
        minEarned = achievement.totalEarned;
        rarestAchievement = achievement.name;
      }
    });
    
    return {
      totalAchievements,
      totalEarned,
      mostPopular,
      rarestAchievement
    };
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    throw new Error('Failed to get achievement statistics');
  }
}

/**
 * Check if user has specific achievement
 */
export async function userHasAchievement(userId: string, achievementId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, USER_ACHIEVEMENTS_COLLECTION),
      where('userId', '==', userId),
      where('achievementId', '==', achievementId),
      where('isCompleted', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking user achievement:', error);
    return false;
  }
}


