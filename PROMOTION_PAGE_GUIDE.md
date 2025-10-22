# Promotion Page Management Guide

## Overview

The promotion system now has two separate fields:
1. **Display Page** - Which page the promotion will appear on
2. **Redirect Path** - Where users go when they click the promotion

## How It Works

### 1. Page Discovery System
- All available pages are defined in `src/lib/pageDiscovery.ts`
- The system automatically updates promotion dropdowns when you add new pages
- Pages are categorized as: `dashboard`, `admin`, `public`, or `test`

### 2. Promotion Creation Flow
1. **Choose Display Page**: Select which page the promotion will show on
2. **Set Redirect Type**: Choose internal (within app) or external (outside app)
3. **Set Redirect Path**: 
   - For internal: Choose from dropdown of valid pages
   - For external: Enter full URL (e.g., https://example.com)

### 3. Notification System
- When a promotion is created, notifications are sent to users
- The notification redirect uses the "Redirect Path" setting
- Internal redirects are validated against available pages

## Adding New Pages

### Step 1: Add Page to Discovery System
Edit `src/lib/pageDiscovery.ts` and add your page to the `KNOWN_PAGES` array:

```typescript
const KNOWN_PAGES: PageInfo[] = [
  // ... existing pages ...
  { 
    path: '/dashboard/new-page', 
    name: 'New Page', 
    description: 'Description of your new page', 
    category: 'dashboard' 
  },
]
```

### Step 2: Choose Category
- `dashboard` - Regular dashboard pages (included in promotion options)
- `admin` - Admin-only pages (included in promotion options)
- `public` - Public pages like pricing, sign-in (included in promotion options)
- `test` - Test pages (excluded from production promotion options)

### Step 3: Test the Integration
1. Visit `/test-promotion-pages` to see all available pages
2. Go to `/dashboard/admin/promotions` to create a new promotion
3. Check that your new page appears in both dropdowns

## Current Available Pages

### Dashboard Pages
- `/dashboard` - Main dashboard
- `/dashboard/trading-journal` - Trading journal
- `/dashboard/profiles` - Member profiles
- `/dashboard/profile` - Profile settings
- `/dashboard/currency-database` - Currency database
- `/dashboard/members` - Members list

### Admin Pages
- `/dashboard/admin/promotions` - Admin promotions
- `/dashboard/admin/members` - Admin members

### Public Pages
- `/pricing` - Pricing page
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page

### Test Pages (Excluded from Production)
- `/test-notifications` - Test notifications
- `/test-promotion-links` - Test promotion links
- `/test-internal-links` - Test internal links
- `/test-promotion-pages` - This page

## Benefits

1. **Automatic Updates**: No need to manually update promotion forms when adding pages
2. **Validation**: System validates internal redirects against available pages
3. **Flexibility**: Separate display and redirect settings for maximum control
4. **Maintainability**: Centralized page management in one file
5. **Type Safety**: TypeScript ensures all page references are valid

## Example Usage

### Creating a Promotion for Trading Journal
1. **Display Page**: `/dashboard/trading-journal` (promotion shows on trading journal page)
2. **Redirect Type**: Internal
3. **Redirect Path**: `/pricing` (users go to pricing when they click)

### Creating a Promotion for Dashboard
1. **Display Page**: `/dashboard` (promotion shows on main dashboard)
2. **Redirect Type**: External
3. **Redirect Path**: `https://t.me/redemptionforex` (users go to Telegram)

This system gives you complete control over where promotions appear and where they redirect users!
