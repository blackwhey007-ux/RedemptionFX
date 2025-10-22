# Signals Feature Debug Guide

## Issue
VIP/Guest users are not seeing signals, but they are receiving notifications.

## Changes Made

### 1. Fixed Firebase updateDoc() undefined field error
- Modified `updateSignalStatus` in `src/lib/signalService.ts` to only include `result` field if it has a value
- This prevents Firestore from rejecting updates with undefined fields

### 2. Added Debug Logging
- Added console logs to `getSignalsByCategory` in `src/lib/signalService.ts`
- Added console logs to `createSignal` in `src/lib/signalService.ts`
- Added console logs to Free/VIP signals pages to track signal loading

### 3. Added Safety Checks
- Added filter to signal rendering in Free/VIP pages to prevent errors from malformed data
- Filters out any signals that are null or don't have an ID

## Debugging Steps

### Step 1: Check if signals are being created
1. Login as admin
2. Go to `/dashboard/admin/signals`
3. Create a test signal with:
   - Title: "Test Free Signal"
   - Category: "free"
   - Fill in all required fields
4. Check browser console for logs:
   - "Creating signal with data: ..."
   - "Signal created successfully: ..."
   - "Creating signal notification with data: ..."

### Step 2: Check if signals are in database
1. Open browser console
2. Look for logs when creating signal
3. Check Firebase Console > Firestore Database > signals collection
4. Verify signal document exists with correct fields

### Step 3: Check if VIP/Guest can read signals
1. Login as VIP or Guest user
2. Go to `/dashboard/signals/free` or `/dashboard/signals/vip`
3. Check browser console for logs:
   - "Loading free signals for user: ..."
   - "Fetching signals for category: free"
   - "Found X signals in database for category: free"
   - "After filtering isActive, X signals remain"
   - "Free signals loaded: [...]"

### Step 4: Check Firestore Security Rules
If signals are not loading for VIP/Guest users, check:

1. Open Firebase Console > Firestore Database > Rules
2. Verify rules match `firestore.rules.txt`
3. Check that user's role in Firestore is correct:
   - Go to Firestore > users collection
   - Find the VIP/Guest user document
   - Verify `role` field is set to 'vip' or 'guest'

### Step 5: Check for Firestore Index Errors
If you see an error like "The query requires an index", you need to:

1. Click the link in the error message to create the index
2. Or deploy indexes using: `firebase deploy --only firestore:indexes`
3. Wait for index to be created (can take a few minutes)

## Common Issues

### Issue 1: No signals showing for VIP/Guest
**Cause**: No signals have been created yet
**Solution**: Create a test signal as admin

### Issue 2: "Permission denied" error
**Cause**: User role not set correctly in Firestore
**Solution**: 
1. Check user document in Firestore
2. Verify `role` field is 'vip' or 'guest'
3. If missing, update it manually or re-login

### Issue 3: "The query requires an index"
**Cause**: Firestore composite index not created
**Solution**: 
1. Click the link in the error to create index
2. Or run: `firebase deploy --only firestore:indexes`

### Issue 4: Signals created but not showing
**Cause**: Firestore security rules blocking read access
**Solution**:
1. Check that rules are deployed: `firebase deploy --only firestore:rules`
2. Verify user role in Firestore matches expected role

## Testing Checklist

- [ ] Admin can create signals
- [ ] Admin can see all signals
- [ ] VIP user can see both free and VIP signals
- [ ] Guest user can see only free signals
- [ ] Guest user sees "protected page" message for VIP signals
- [ ] Notifications are sent when signals are created
- [ ] VIP/Guest users receive notifications
- [ ] Clicking notification navigates to correct signal page

## Next Steps

1. Create a test signal as admin
2. Check browser console for any errors
3. Login as VIP/Guest and check if signals appear
4. If signals don't appear, check Firestore rules and user roles
5. Report back with console logs and any error messages

