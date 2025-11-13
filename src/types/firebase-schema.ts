/**
 * Firebase Firestore Schema Types
 * 
 * Complete TypeScript interfaces for all RedemptionFX collections.
 * This serves as the single source of truth for database structure.
 * 
 * Generated: ${new Date().toISOString()}
 * Version: 1.0.0
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'admin' | 'vip' | 'guest';
export type UserStatus = 'active' | 'inactive' | 'pending';
export type SignalType = 'BUY' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type SignalResult = 'WIN' | 'LOSS' | 'BREAKEVEN';
export type SignalCategory = 'free' | 'vip';
export type Timeframe = 'SCALP' | 'DAY_TRADE' | 'SWING';
export type NotificationType = 'signal' | 'announcement' | 'new_member' | 'event' | 'system';
export type NotificationStatus = 'unread' | 'read';
export type ProfileAccountType = 'VIP_SHOWCASE' | 'USER_PROFILE';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type PaymentMethod = 'crypto' | 'bank_transfer' | 'paypal' | 'stripe';

// ============================================================================
// CORE USER INTERFACES
// ============================================================================

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  
  // Profile settings
  profileSettings: {
    displayName: string;
    photoURL?: string;
    discordUsername?: string;
    telegramUsername?: string;
  };
  
  // Payment information
  paymentInfo?: {
    plan?: string; // Payment plan name
    amount: number;
    currency: string;
    cryptoWallet?: string;
    txHash?: string;
    paidAt: Timestamp;
    expiresAt: Timestamp;
  };
  
  // Timestamps
  createdAt: Timestamp;
  lastLogin: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// SIGNAL INTERFACES
// ============================================================================

export interface Signal {
  id?: string;
  pair: string;
  type: SignalType;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  takeProfit3?: number;
  category: SignalCategory;
  notes?: string;
  chartImageUrl?: string;
  
  // Status tracking
  status: SignalStatus;
  result?: SignalResult;
  pipsGained?: number;
  
  // Timestamps
  postedAt: Timestamp;
  closedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // External message IDs
  telegramMessageId?: string;
  discordMessageId?: string;
}

export interface SignalNotification {
  id?: string;
  signalId: string;
  signalTitle: string;
  signalCategory: SignalCategory;
  message: string;
  sentTo: 'all' | 'vip';
  signalData: Signal;
  
  // Delivery tracking
  sentAt: Timestamp;
  readBy: string[]; // User IDs who have read
  
  createdAt: Timestamp;
}

// ============================================================================
// TRADE INTERFACES
// ============================================================================

export interface Trade {
  id?: string;
  userId: string;
  profileId: string;
  
  // Trade details
  pair: string;
  type: SignalType;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  
  // MT5 integration
  mt5TicketId?: string;
  
  // Results
  profit?: number;
  pips?: number;
  result?: SignalResult;
  
  // ICT Analysis (if available)
  ictAnalysis?: ICTAnalysis;
  
  // Timestamps
  entryTime: Timestamp;
  exitTime?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ICTAnalysis {
  session: string;
  liquidity: string[];
  orderBlock: {
    type: string;
    price: number;
    time: Timestamp;
  };
  fairValueGap?: {
    high: number;
    low: number;
    time: Timestamp;
  };
  breakerBlock?: {
    type: string;
    price: number;
    time: Timestamp;
  };
  nos?: {
    price: number;
    time: Timestamp;
  };
  bos?: {
    price: number;
    time: Timestamp;
  };
  choch?: {
    price: number;
    time: Timestamp;
  };
}

export interface MemberTrade {
  id?: string;
  userId: string;
  signalId: string;
  entryPrice?: number;
  exitPrice?: number;
  result?: SignalResult;
  pipsGained?: number;
  notes?: string;
  
  // Timestamps
  followedAt: Timestamp;
  closedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// PROFILE INTERFACES
// ============================================================================

export interface Profile {
  id?: string;
  name: string;
  accountType: ProfileAccountType;
  userId: string;
  isPublic: boolean;
  description?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any; // Additional data
  
  // Status
  status: NotificationStatus;
  readAt?: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdminNotification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EventNotification {
  id?: string;
  eventId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface Event {
  id?: string;
  title: string;
  description: string;
  eventDate: Timestamp;
  location?: string;
  maxParticipants?: number;
  currentParticipants: number;
  status: EventStatus;
  isActive: boolean;
  
  // Application requirements
  applicationDeadline?: Timestamp;
  requiresApproval: boolean;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface EventApplication {
  id?: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  
  // Timestamps
  appliedAt: Timestamp;
  processedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// PAYMENT INTERFACES
// ============================================================================

export interface PaymentSubmission {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  
  // Payment details
  paymentDetails: {
    walletAddress?: string;
    txHash?: string;
    bankDetails?: string;
    paypalEmail?: string;
  };
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  processedAt?: Timestamp;
  notes?: string;
  
  // Timestamps
  submittedAt: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// PROMOTION INTERFACES
// ============================================================================

export interface Promotion {
  id?: string;
  title: string;
  description: string;
  discountPercentage: number;
  validFrom: Timestamp;
  validUntil: Timestamp;
  isActive: boolean;
  
  // Usage tracking
  usedBy: string[]; // User IDs who used this promotion
  usageCount: number;
  maxUsage?: number; // Optional limit
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

export interface Analytics {
  id?: string;
  metric: string;
  value: number;
  metadata?: any;
  
  // Period
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: Timestamp;
  
  createdAt: Timestamp;
}

export interface Performance {
  id?: string;
  userId?: string; // null for admin performance
  totalSignals: number;
  winningSignals: number;
  losingSignals: number;
  breakevenSignals: number;
  totalPips: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  currentStreak: number;
  bestTrade: number;
  worstTrade: number;
  
  // Timestamps
  calculatedAt: Timestamp;
  periodStart: Timestamp;
  periodEnd: Timestamp;
}

// ============================================================================
// SETTINGS INTERFACES
// ============================================================================

export interface Settings {
  id?: string;
  key: string;
  value: string;
  description?: string;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// COLLECTION REFERENCES
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  SIGNALS: 'signals',
  MEMBER_TRADES: 'memberTrades',
  SUBSCRIPTIONS: 'subscriptions',
  ANALYTICS: 'analytics',
  PERFORMANCE: 'performance',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  PROFILES: 'profiles',
  TRADES: 'trades',
  USER_TRADES: 'userTrades',
  PAYMENT_SUBMISSIONS: 'paymentSubmissions',
  ANNOUNCEMENTS: 'announcements',
  PROMOTIONS: 'promotions',
  EVENTS: 'events',
  EVENT_APPLICATIONS: 'event_applications',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  EVENT_NOTIFICATIONS: 'eventNotifications',
  USER_NOTIFICATIONS: 'user_notifications',
  ADMIN_NOTIFICATIONS_V2: 'adminNotifications',
  SIGNAL_NOTIFICATIONS: 'signalNotifications'
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

export interface FirestoreDocument {
  id: string;
  data: any;
}

export interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: any;
  }>;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  Timestamp
};


