/**
 * Gamification Types
 * 
 * TypeScript interfaces for achievements, badges, levels, and gamification features.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementType = 'trade_count' | 'win_rate' | 'profit' | 'streak' | 'social' | 'custom';
export type BadgeType = 'achievement' | 'milestone' | 'special' | 'seasonal';
export type LevelType = 'trading' | 'social' | 'community';

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export interface Achievement {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  
  // Requirements
  requirements: {
    type: AchievementType;
    threshold: number;
    condition?: string;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'allTime';
    additionalCriteria?: {
      [key: string]: any;
    };
  };
  
  // Rewards
  rewards: {
    experience: number;
    badge?: string;
    title?: string;
    color?: string;
    discount?: number; // % off subscription
    features?: string[]; // Unlock features
  };
  
  // Metadata
  rarity: AchievementRarity;
  difficulty: number; // 1-10
  tags: string[];
  
  // Stats
  earnedByCount: number;
  totalEarned: number; // Total times earned across all users
  
  // Status
  isActive: boolean;
  isHidden: boolean; // Hidden until unlocked
  isRepeatable: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserAchievement {
  id?: string;
  userId: string;
  achievementId: string;
  
  // Progress
  progress: number; // Current progress towards threshold
  threshold: number;
  isCompleted: boolean;
  
  // Completion Details
  completedAt?: Timestamp;
  progressUpdatedAt: Timestamp;
  
  // Metadata
  earnedCount: number; // How many times user earned this (for repeatable)
  lastEarnedAt?: Timestamp;
  
  createdAt: Timestamp;
}

// ============================================================================
// BADGES
// ============================================================================

export interface Badge {
  id?: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  
  // Visual
  color: string;
  gradient?: string[];
  glowEffect?: boolean;
  animation?: string;
  
  // Metadata
  rarity: AchievementRarity;
  category: string;
  tags: string[];
  
  // Requirements
  requirements?: {
    achievementId?: string;
    level?: number;
    special?: boolean;
  };
  
  // Stats
  earnedByCount: number;
  
  // Status
  isActive: boolean;
  isLimited: boolean; // Limited time availability
  expiresAt?: Timestamp;
  
  createdAt: Timestamp;
}

export interface UserBadge {
  id?: string;
  userId: string;
  badgeId: string;
  
  // Display
  isDisplayed: boolean; // Show on profile
  position?: number; // Display order
  
  // Timestamps
  earnedAt: Timestamp;
  displayedAt?: Timestamp;
}

// ============================================================================
// LEVELS & EXPERIENCE
// ============================================================================

export interface Level {
  id?: string;
  type: LevelType;
  level: number;
  
  // Requirements
  experienceRequired: number;
  maxExperience: number; // For this level
  
  // Rewards
  rewards: {
    title?: string;
    color?: string;
    badge?: string;
    features?: string[];
    discounts?: {
      subscription?: number;
      [key: string]: number;
    };
  };
  
  // Metadata
  description: string;
  icon: string;
  
  createdAt: Timestamp;
}

export interface UserLevel {
  id?: string;
  userId: string;
  type: LevelType;
  
  // Current Level
  currentLevel: number;
  currentExperience: number;
  
  // Progress
  experienceToNextLevel: number;
  progressPercentage: number;
  
  // Stats
  totalExperienceEarned: number;
  
  // Timestamps
  lastLevelUpAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface ExperienceTransaction {
  id?: string;
  userId: string;
  
  // Transaction Details
  amount: number;
  source: 'trade' | 'achievement' | 'social' | 'bonus' | 'admin';
  sourceId?: string; // ID of trade, achievement, etc.
  description: string;
  
  // Metadata
  multiplier?: number; // Experience multiplier
  bonus?: number; // Additional bonus experience
  
  createdAt: Timestamp;
}

// ============================================================================
// RANKINGS & COMPETITIONS
// ============================================================================

export interface Competition {
  id?: string;
  name: string;
  description: string;
  type: 'trading' | 'social' | 'achievement' | 'custom';
  
  // Timing
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  
  // Leagues
  leagues: {
    name: string;
    requirements: {
      minLevel?: number;
      minExperience?: number;
      achievementRequired?: string;
    };
    maxParticipants?: number;
    currentParticipants: number;
  }[];
  
  // Rewards
  rewards: {
    position: number;
    rewards: {
      experience?: number;
      badge?: string;
      title?: string;
      discount?: number;
    };
  }[];
  
  // Metadata
  isPublic: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CompetitionEntry {
  id?: string;
  competitionId: string;
  userId: string;
  leagueName: string;
  
  // Performance
  score: number;
  rank: number;
  previousRank: number;
  
  // Stats
  stats: {
    [key: string]: number;
  };
  
  // Status
  isActive: boolean;
  joinedAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

// ============================================================================
// QUEST SYSTEM
// ============================================================================

export interface Quest {
  id?: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  
  // Objectives
  objectives: {
    id: string;
    description: string;
    type: string;
    target: number;
    current: number;
    isCompleted: boolean;
  }[];
  
  // Rewards
  rewards: {
    experience: number;
    badge?: string;
    bonus?: any;
  };
  
  // Timing
  startDate: Timestamp;
  endDate: Timestamp;
  duration?: number; // Hours
  
  // Status
  isActive: boolean;
  isRepeatable: boolean;
  maxCompletions?: number;
  
  createdAt: Timestamp;
}

export interface UserQuest {
  id?: string;
  userId: string;
  questId: string;
  
  // Progress
  objectivesProgress: {
    [objectiveId: string]: number;
  };
  isCompleted: boolean;
  
  // Completion
  completedAt?: Timestamp;
  completionCount: number;
  
  // Timestamps
  startedAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

// ============================================================================
// STREAKS
// ============================================================================

export interface Streak {
  id?: string;
  userId: string;
  type: 'daily_trades' | 'daily_login' | 'winning_trades' | 'social_activity';
  
  // Current Streak
  currentCount: number;
  longestCount: number;
  
  // Dates
  lastActivityAt: Timestamp;
  streakStartAt: Timestamp;
  
  // Status
  isActive: boolean;
  isBroken: boolean;
  brokenAt?: Timestamp;
  
  updatedAt: Timestamp;
}

// ============================================================================
// GAMIFICATION STATS
// ============================================================================

export interface GamificationStats {
  id?: string;
  userId: string;
  
  // Overall Stats
  totalExperience: number;
  currentLevel: number;
  achievementsEarned: number;
  badgesEarned: number;
  
  // Streaks
  longestStreak: number;
  currentStreak: number;
  streakType: string;
  
  // Competitions
  competitionsJoined: number;
  competitionsWon: number;
  bestRank: number;
  
  // Social
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  
  // Timestamps
  calculatedAt: Timestamp;
  lastActivityAt: Timestamp;
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

export const GAMIFICATION_COLLECTIONS = {
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
  BADGES: 'badges',
  USER_BADGES: 'user_badges',
  LEVELS: 'levels',
  USER_LEVELS: 'user_levels',
  EXPERIENCE_TRANSACTIONS: 'experience_transactions',
  COMPETITIONS: 'competitions',
  COMPETITION_ENTRIES: 'competition_entries',
  QUESTS: 'quests',
  USER_QUESTS: 'user_quests',
  STREAKS: 'streaks',
  GAMIFICATION_STATS: 'gamification_stats'
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type GamificationCollectionName = typeof GAMIFICATION_COLLECTIONS[keyof typeof GAMIFICATION_COLLECTIONS];

export interface ProgressUpdate {
  userId: string;
  achievementId?: string;
  questId?: string;
  type: AchievementType;
  amount: number;
  metadata?: any;
}

export interface RewardClaim {
  userId: string;
  rewardType: 'experience' | 'badge' | 'title' | 'discount' | 'feature';
  rewardId: string;
  amount?: number;
  claimedAt: Timestamp;
}

// ============================================================================
// ACHIEVEMENT TEMPLATES
// ============================================================================

export interface AchievementTemplate {
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: AchievementRarity;
  requirements: {
    type: AchievementType;
    threshold: number;
    timeframe?: string;
  };
  rewards: {
    experience: number;
    badge?: string;
  };
}

// Predefined achievement templates
export const ACHIEVEMENT_TEMPLATES: AchievementTemplate[] = [
  // Beginner Achievements
  {
    name: 'First Steps',
    description: 'Complete your first trade',
    icon: '🎯',
    category: 'Trading',
    rarity: 'common',
    requirements: { type: 'trade_count', threshold: 1 },
    rewards: { experience: 100, badge: 'first-trade' }
  },
  {
    name: 'Winner Takes All',
    description: 'Win your first trade',
    icon: '🏆',
    category: 'Trading',
    rarity: 'common',
    requirements: { type: 'win_rate', threshold: 1 },
    rewards: { experience: 150, badge: 'first-win' }
  },
  {
    name: 'Quick Learner',
    description: 'Complete 10 trades',
    icon: '📚',
    category: 'Trading',
    rarity: 'common',
    requirements: { type: 'trade_count', threshold: 10 },
    rewards: { experience: 300, badge: 'quick-learner' }
  },
  {
    name: 'Consistency is Key',
    description: 'Trade 5 days in a row',
    icon: '📅',
    category: 'Trading',
    rarity: 'rare',
    requirements: { type: 'streak', threshold: 5 },
    rewards: { experience: 500, badge: 'consistent' }
  },
  
  // Intermediate Achievements
  {
    name: 'Profitable Trader',
    description: 'Achieve 60%+ win rate with 20+ trades',
    icon: '💰',
    category: 'Trading',
    rarity: 'rare',
    requirements: { type: 'win_rate', threshold: 60 },
    rewards: { experience: 1000, badge: 'profitable-trader' }
  },
  {
    name: 'Century Club',
    description: 'Complete 100 trades',
    icon: '💯',
    category: 'Trading',
    rarity: 'rare',
    requirements: { type: 'trade_count', threshold: 100 },
    rewards: { experience: 2000, badge: 'century-club' }
  },
  {
    name: 'Community Helper',
    description: 'Make 50 helpful comments',
    icon: '🤝',
    category: 'Social',
    rarity: 'rare',
    requirements: { type: 'social', threshold: 50 },
    rewards: { experience: 800, badge: 'community-helper' }
  },
  
  // Advanced Achievements
  {
    name: 'Master Trader',
    description: 'Achieve 70%+ win rate with 100+ trades',
    icon: '👑',
    category: 'Trading',
    rarity: 'epic',
    requirements: { type: 'win_rate', threshold: 70 },
    rewards: { experience: 5000, badge: 'master-trader' }
  },
  {
    name: 'Profit King',
    description: 'Earn $10,000+ total profit',
    icon: '💎',
    category: 'Trading',
    rarity: 'epic',
    requirements: { type: 'profit', threshold: 10000 },
    rewards: { experience: 8000, badge: 'profit-king' }
  },
  {
    name: 'Elite Trader',
    description: 'Rank in top 10 on monthly leaderboard',
    icon: '🥇',
    category: 'Competition',
    rarity: 'epic',
    requirements: { type: 'custom', threshold: 10 },
    rewards: { experience: 6000, badge: 'elite-trader' }
  },
  
  // Legendary Achievements
  {
    name: 'Trading Legend',
    description: 'Achieve 80%+ win rate with 500+ trades',
    icon: '🌟',
    category: 'Trading',
    rarity: 'legendary',
    requirements: { type: 'win_rate', threshold: 80 },
    rewards: { experience: 15000, badge: 'trading-legend' }
  },
  {
    name: 'Millionaire',
    description: 'Earn $1,000,000+ total profit',
    icon: '💰💎',
    category: 'Trading',
    rarity: 'legendary',
    requirements: { type: 'profit', threshold: 1000000 },
    rewards: { experience: 25000, badge: 'millionaire' }
  },
  {
    name: 'Hall of Fame',
    description: 'Rank #1 on all-time leaderboard',
    icon: '🏛️',
    category: 'Competition',
    rarity: 'legendary',
    requirements: { type: 'custom', threshold: 1 },
    rewards: { experience: 20000, badge: 'hall-of-fame' }
  }
];

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Timestamp
};


