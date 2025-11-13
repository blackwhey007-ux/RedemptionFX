# RedemptionFX Database Schema Documentation

## Overview

This document describes the complete database schema for the RedemptionFX trading platform. The platform uses **Firebase Firestore** as its primary database, providing real-time capabilities and scalable NoSQL storage.

## Database Architecture

- **Primary Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage (for images/files)
- **Real-time**: Firestore real-time listeners
- **Security**: Firestore Security Rules

## Collections Overview

### Core Collections

| Collection | Purpose | Key Features |
|------------|---------|--------------|
| `users` | User accounts and profiles | Role-based access, payment info |
| `signals` | Trading signals | Real-time updates, category filtering |
| `trades` | Individual trades | MT5 integration, ICT analysis |
| `memberTrades` | User trade tracking | Signal following, performance |
| `profiles` | Trading profiles | Public/private, showcase accounts |

### Communication Collections

| Collection | Purpose | Key Features |
|------------|---------|--------------|
| `notifications` | User notifications | Real-time delivery, read tracking |
| `signalNotifications` | Signal alerts | Role-based distribution |
| `adminNotifications` | Admin alerts | System monitoring |
| `announcements` | Platform announcements | Role-based visibility |

### Event Management

| Collection | Purpose | Key Features |
|------------|---------|--------------|
| `events` | Trading events | Registration, approval workflow |
| `event_applications` | Event applications | Status tracking, approval system |

### Business Collections

| Collection | Purpose | Key Features |
|------------|---------|--------------|
| `paymentSubmissions` | Payment processing | Manual verification, status tracking |
| `promotions` | Marketing campaigns | Usage tracking, expiration |
| `analytics` | Platform metrics | Time-based aggregation |
| `performance` | Trading performance | Calculated metrics, period tracking |

## Detailed Schema

### Users Collection

```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  displayName: string;            // Display name
  photoURL?: string;              // Profile photo
  role: 'admin' | 'vip' | 'guest'; // User role
  status: 'active' | 'inactive' | 'pending'; // Account status
  
  profileSettings: {
    displayName: string;
    photoURL?: string;
    discordUsername?: string;
    telegramUsername?: string;
  };
  
  paymentInfo?: {
    plan?: string;                // Payment plan
    amount: number;               // Amount paid
    currency: string;             // Currency
    cryptoWallet?: string;        // Crypto wallet
    txHash?: string;              // Transaction hash
    paidAt: Timestamp;            // Payment date
    expiresAt: Timestamp;         // Expiration date
  };
  
  createdAt: Timestamp;
  lastLogin: Timestamp;
  updatedAt: Timestamp;
}
```

### Signals Collection

```typescript
interface Signal {
  id?: string;                    // Document ID
  pair: string;                   // Trading pair (e.g., "EURUSD")
  type: 'BUY' | 'SELL';          // Signal type
  entryPrice: number;             // Entry price
  stopLoss: number;               // Stop loss price
  takeProfit1: number;            // Primary take profit
  takeProfit2?: number;           // Secondary take profit
  takeProfit3?: number;           // Tertiary take profit
  category: 'free' | 'vip';      // Signal category
  notes?: string;                 // Additional notes
  chartImageUrl?: string;         // Chart image URL
  
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED'; // Signal status
  result?: 'WIN' | 'LOSS' | 'BREAKEVEN';     // Signal result
  pipsGained?: number;            // Pips gained/lost
  
  telegramMessageId?: string;     // Telegram message ID
  discordMessageId?: string;      // Discord message ID
  
  postedAt: Timestamp;            // Signal posting time
  closedAt?: Timestamp;           // Signal close time
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Trades Collection

```typescript
interface Trade {
  id?: string;                    // Document ID
  userId: string;                 // User who made the trade
  profileId: string;              // Associated profile
  
  pair: string;                   // Trading pair
  type: 'BUY' | 'SELL';          // Trade type
  entryPrice: number;             // Entry price
  exitPrice?: number;             // Exit price
  stopLoss: number;               // Stop loss
  takeProfit: number;             // Take profit
  lotSize: number;                // Lot size
  
  mt5TicketId?: string;           // MT5 ticket ID
  
  profit?: number;                // Profit/loss
  pips?: number;                  // Pips gained/lost
  result?: 'WIN' | 'LOSS' | 'BREAKEVEN'; // Trade result
  
  ictAnalysis?: {                 // ICT Analysis
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
    // ... additional ICT fields
  };
  
  entryTime: Timestamp;           // Entry time
  exitTime?: Timestamp;           // Exit time
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Notifications Collection

```typescript
interface Notification {
  id?: string;                    // Document ID
  userId: string;                 // Target user
  type: 'signal' | 'announcement' | 'new_member' | 'event' | 'system';
  title: string;                  // Notification title
  message: string;                // Notification message
  data?: any;                     // Additional data
  
  status: 'unread' | 'read';     // Read status
  readAt?: Timestamp;             // Read timestamp
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Events Collection

```typescript
interface Event {
  id?: string;                    // Document ID
  title: string;                  // Event title
  description: string;            // Event description
  eventDate: Timestamp;           // Event date
  location?: string;              // Event location
  maxParticipants?: number;       // Max participants
  currentParticipants: number;    // Current participants
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isActive: boolean;              // Active status
  
  applicationDeadline?: Timestamp; // Application deadline
  requiresApproval: boolean;       // Requires approval
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Indexes

### Performance Indexes

The following composite indexes are configured for optimal query performance:

#### Signals Indexes
- `category + createdAt DESC` - Filter signals by category and date
- `category + isActive + createdAt DESC` - Active signals by category
- `isActive + createdAt DESC` - All active signals

#### User Notifications Indexes
- `userId + createdAt DESC` - User's notifications by date
- `userId + read + createdAt DESC` - Unread notifications
- `userId + type + createdAt DESC` - Notifications by type

#### Trades Indexes
- `userId + createdAt DESC` - User's trades by date
- `profileId + createdAt DESC` - Profile trades by date

#### Events Indexes
- `isActive + eventDate ASC` - Active events by date
- `eventId + status + appliedAt DESC` - Event applications

## Security Rules

### Access Control

The platform implements role-based access control:

- **Admin**: Full access to all collections
- **VIP**: Access to VIP signals, full features
- **Guest**: Access to free signals only

### Key Security Rules

1. **Users Collection**: Users can read/write their own data, admins can manage all
2. **Signals Collection**: Role-based access (guests see free only, VIPs see all)
3. **Trades Collection**: Users can manage their own trades, admins can see all
4. **Notifications Collection**: Users can only access their own notifications
5. **Admin Collections**: Admin-only access

## Data Flow

### Signal Creation Flow
1. Admin creates signal in `signals` collection
2. System creates notification in `signalNotifications`
3. Real-time listeners distribute to users based on role
4. Telegram/Discord integration sends external notifications

### Trade Tracking Flow
1. User follows signal → creates `memberTrade` record
2. User logs actual trade → creates `trade` record
3. System calculates performance metrics
4. Updates `performance` collection with aggregated stats

### Notification Flow
1. System event triggers notification creation
2. Notification stored in appropriate collection
3. Real-time listeners push to user interfaces
4. User interactions update read status

## Best Practices

### Data Consistency
- Use Firestore transactions for critical operations
- Implement optimistic updates for real-time features
- Validate data on both client and server side

### Performance Optimization
- Use composite indexes for complex queries
- Implement pagination for large datasets
- Cache frequently accessed data

### Security
- Always validate user permissions in security rules
- Sanitize user inputs before storing
- Use Firebase Auth for authentication
- Implement rate limiting for API endpoints

## Migration Strategy

### Backup Strategy
- Regular automated backups using Firebase Admin SDK
- Export collections to JSON format
- Store backups in secure cloud storage

### Schema Evolution
- Add new fields as optional to maintain backward compatibility
- Use migration scripts for data transformations
- Test changes in development environment first

## Monitoring and Analytics

### Key Metrics
- User engagement (login frequency, feature usage)
- Signal performance (win rate, profit factor)
- System performance (response times, error rates)
- Revenue metrics (subscriptions, payments)

### Error Tracking
- Firebase Crashlytics for client-side errors
- Cloud Functions logs for server-side errors
- Custom error logging for business logic errors

## API Integration

### External Services
- **Telegram Bot API**: Signal distribution
- **Discord Webhook**: Community notifications
- **MT5 API**: Trade data import
- **Stripe API**: Payment processing

### Webhook Handling
- Stripe webhooks for payment events
- Telegram webhooks for bot interactions
- Custom webhooks for third-party integrations

## Development Guidelines

### TypeScript Integration
- Use generated types from `src/types/firebase-schema.ts`
- Implement proper error handling
- Use async/await for all Firestore operations

### Testing Strategy
- Unit tests for business logic
- Integration tests for Firestore operations
- End-to-end tests for user workflows

### Code Organization
- Separate concerns (auth, data, business logic)
- Use service classes for complex operations
- Implement proper error boundaries

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check security rules and user authentication
2. **Slow Queries**: Verify composite indexes are properly configured
3. **Real-time Not Working**: Check listener setup and error handling
4. **Data Inconsistency**: Use transactions for multi-document operations

### Debug Tools
- Firebase Console for data inspection
- Firestore Emulator for local development
- Chrome DevTools for client-side debugging

## Future Enhancements

### Planned Features
- Advanced analytics and reporting
- Machine learning integration
- Enhanced notification system
- Mobile app synchronization

### Scalability Considerations
- Implement data archiving for old records
- Use Cloud Functions for heavy computations
- Consider data partitioning for large datasets
- Implement caching strategies for frequently accessed data

---

*Last Updated: ${new Date().toISOString()}*
*Version: 1.0.0*


