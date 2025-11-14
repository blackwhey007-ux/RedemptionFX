/**
 * Community Features Types
 * 
 * TypeScript interfaces for community features including discussions,
 * leaderboards, achievements, and social interactions.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime';
export type RelationshipType = 'follow' | 'block' | 'mute';
export type ActivityType = 'trade' | 'achievement' | 'signal' | 'comment' | 'follow' | 'like';
export type VisibilityLevel = 'public' | 'followers' | 'private';
export type CommentStatus = 'active' | 'deleted' | 'flagged';

// ============================================================================
// TRADE DISCUSSIONS
// ============================================================================

export interface TradeDiscussion {
  id?: string;
  signalId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Content
  message: string;
  attachments: string[]; // Image URLs
  
  // Threading
  parentCommentId?: string; // For replies
  replyCount: number;
  
  // Engagement
  likes: string[]; // User IDs who liked
  likeCount: number;
  
  // Moderation
  status: CommentStatus;
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
  reportCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DiscussionFormData {
  message: string;
  attachments: File[];
  parentCommentId?: string;
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export interface LeaderboardEntry {
  id?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Period
  period: LeaderboardPeriod;
  
  // Ranking
  rank: number;
  previousRank: number;
  rankChange: number; // +1, -2, etc.
  
  // Performance Metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalPips: number;
  totalProfit: number;
  averageRR: number;
  maxDrawdown: number;
  
  // Composite Score
  score: number;
  
  // Achievements
  badges: string[];
  
  // Timestamps
  calculatedAt: Timestamp;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

export interface LeaderboardFilters {
  period: LeaderboardPeriod;
  limit?: number;
  offset?: number;
  search?: string;
}

// ============================================================================
// USER RELATIONSHIPS
// ============================================================================

export interface UserRelationship {
  id?: string;
  followerId: string;
  followingId: string;
  type: RelationshipType;
  
  // Notification Preferences
  notifyOnSignals: boolean;
  notifyOnTrades: boolean;
  notifyOnAchievements: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  mutualFollows: number;
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export interface ActivityFeedItem {
  id?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  
  // Activity Details
  type: ActivityType;
  action: string;
  description: string;
  
  // Data
  data: {
    tradeId?: string;
    signalId?: string;
    achievementId?: string;
    commentId?: string;
    targetUserId?: string;
    [key: string]: any;
  };
  
  // Visibility
  visibility: VisibilityLevel;
  
  // Engagement
  likes: string[];
  likeCount: number;
  comments: string[]; // Comment IDs
  commentCount: number;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ActivityFilters {
  type?: ActivityType[];
  userId?: string;
  visibility?: VisibilityLevel;
  limit?: number;
  offset?: number;
}

// ============================================================================
// ENHANCED USER PROFILE
// ============================================================================

export interface SocialProfile {
  // Basic Info
  bio?: string;
  website?: string;
  location?: string;
  
  // Social Links
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    discord?: string;
    telegram?: string;
  };
  
  // Stats
  followersCount: number;
  followingCount: number;
  totalLikes: number;
  totalComments: number;
  
  // Gamification
  level: number;
  experience: number;
  badges: string[];
  achievements: string[];
  
  // Privacy Settings
  profileVisibility: VisibilityLevel;
  showTrades: boolean;
  showStats: boolean;
  showAchievements: boolean;
  
  // Trading Preferences
  tradingStyle?: 'scalper' | 'day_trader' | 'swing_trader';
  favoritePairs?: string[];
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  
  // Verification
  isVerified: boolean;
  verifiedAt?: Timestamp;
}

// ============================================================================
// COMMUNITY STATISTICS
// ============================================================================

export interface CommunityStats {
  totalUsers: number;
  activeUsers: number;
  totalDiscussions: number;
  totalComments: number;
  totalAchievements: number;
  totalFollows: number;
  
  // Growth Metrics
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  
  // Engagement Metrics
  commentsPerDay: number;
  likesPerDay: number;
  followsPerDay: number;
  
  // Top Performers
  topTraders: LeaderboardEntry[];
  mostActiveUsers: {
    userId: string;
    userName: string;
    commentCount: number;
    likeCount: number;
  }[];
  
  calculatedAt: Timestamp;
}

// ============================================================================
// MODERATION
// ============================================================================

export interface ContentReport {
  id?: string;
  reporterId: string;
  targetId: string; // Comment, user, etc.
  targetType: 'comment' | 'user' | 'signal';
  
  // Report Details
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description: string;
  
  // Status
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Timestamp;
  resolution?: string;
  
  createdAt: Timestamp;
}

export interface ModerationAction {
  id?: string;
  moderatorId: string;
  targetId: string;
  targetType: 'comment' | 'user' | 'signal';
  
  // Action Details
  action: 'delete' | 'hide' | 'warn' | 'ban' | 'shadow_ban';
  reason: string;
  
  // Duration (for temporary actions)
  duration?: number; // Days
  expiresAt?: Timestamp;
  
  createdAt: Timestamp;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export interface CommunityNotification {
  id?: string;
  userId: string;
  type: 'comment' | 'like' | 'follow' | 'achievement' | 'mention';
  
  // Content
  title: string;
  message: string;
  data?: any;
  
  // Source
  fromUserId?: string;
  fromUserName?: string;
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;
  
  createdAt: Timestamp;
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

export const COMMUNITY_COLLECTIONS = {
  TRADE_DISCUSSIONS: 'trade_discussions',
  LEADERBOARD: 'leaderboard',
  USER_RELATIONSHIPS: 'user_relationships',
  ACTIVITY_FEED: 'activity_feed',
  COMMUNITY_STATS: 'community_stats',
  CONTENT_REPORTS: 'content_reports',
  MODERATION_ACTIONS: 'moderation_actions',
  COMMUNITY_NOTIFICATIONS: 'community_notifications'
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CommunityCollectionName = typeof COMMUNITY_COLLECTIONS[keyof typeof COMMUNITY_COLLECTIONS];

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CommunityQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: any;
  }>;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Timestamp
};


