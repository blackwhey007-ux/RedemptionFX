# Testing Guide for Telegram VIP Subscription Expiration

## Overview

This guide explains how to test the automated subscription expiry management feature that:

- Detects expired VIP members
- Removes them from Telegram VIP groups
- Downgrades their role from 'vip' to 'guest'
- Logs all actions for auditing

## Prerequisites

1. **Environment Setup**
   - Ensure `CRON_SECRET` is set in `.env.local` or environment variables
   - Telegram bot token configured in Telegram settings
   - Bot added as administrator to VIP Telegram group/channel with "Ban Users" permission

2. **Firebase Console Access**
   - Access to Firestore database
   - Ability to create/modify user documents

## Quick Start: Testing with Existing Expired Users

### Step-by-Step Testing (You Already Have Expired Users!)

#### Step 1: Open the Test Page

1. Log in as admin
2. In the sidebar, click **Admin** → **Test Subscription Expiry**
3. Or go directly to: `/dashboard/admin/test-subscription-expiry`

#### Step 2: Get Your CRON_SECRET

1. Open your `.env.local` file in the project root
2. Find the line: `CRON_SECRET=your-secret-here`
3. Copy the secret value (the part after `=`)

**Or in PowerShell (if you have it set as environment variable):**
```powershell
$env:CRON_SECRET
```

#### Step 3: Run the Test

1. On the test page, paste your CRON_SECRET into the input field
2. Click **"Run Test"** button
3. Wait a few seconds - it will process all expired users automatically

#### Step 4: Check the Results

The page will show you:
- **Expired Members**: How many expired VIP users were found
- **Processed**: How many were successfully processed
- **Errors**: Any errors that occurred
- **Role Downgrades**: How many users had their role changed from VIP to Guest
- **Telegram Removals**: How many users were removed from Telegram (if configured)

You'll also see:
- Warnings (if users don't have telegramUserId)
- Error details (if something went wrong)
- Success/error count breakdown

#### Step 5: Verify in Firebase (Optional but Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Open **Firestore Database**
3. Check the `users` collection:
   - Find your expired VIP users
   - They should now have `role: "guest"` instead of `"vip"`
4. Check the `subscriptionExpiryLogs` collection:
   - You'll see a new document with a complete log of what happened
   - Includes timestamps, counts, and details for each user processed

---

## Alternative: Manual API Testing

If you prefer to use API tools instead of the web page:

**Using cURL (PowerShell):**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_CRON_SECRET"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/cron/check-subscription-expiry" -Method POST -Headers $headers -Body "{}"
```

**Using cURL (Command Prompt/Bash):**
```bash
curl -X POST http://localhost:3000/api/cron/check-subscription-expiry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -d "{}"
```

**Using Postman or Browser DevTools Console:**
```javascript
fetch('http://localhost:3000/api/cron/check-subscription-expiry', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_CRON_SECRET'
  }
})
.then(r => r.json())
.then(console.log)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Processed 1 expired VIP members",
  "expiredCount": 1,
  "processedCount": 1,
  "successCount": 1,
  "errorCount": 0,
  "roleDowngradeCount": 1,
  "telegramRemovedCount": 1,
  "timestamp": "2024-01-20T10:00:00.000Z",
  "summary": {
    "telegramRemoved": 1,
    "roleDowngraded": 1,
    "errors": [],
    "warnings": []
  }
}
```

#### Step 3: Verify Results

1. **Check User Role Changed:**
   - Firebase Console → `users` collection → Find test user
   - Verify `role` changed from `"vip"` to `"guest"`

2. **Check Telegram Group:**
   - Manually verify user was removed from Telegram VIP group
   - Or check if they can still access the group

3. **Check Audit Logs:**
   - Firebase Console → `subscriptionExpiryLogs` collection
   - Verify new log entry was created with:
     - `timestamp`
     - `expiredCount`: 1
     - `successCount`: 1
     - `logs` array with detailed removal information

### Method 2: Test Telegram Removal Directly

Test the Telegram removal API endpoint independently:

```javascript
fetch('http://localhost:3000/api/telegram/remove-member', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    chatId: '-1001234567890',  // Your Telegram group ID
    userId: 123456789,  // Telegram numeric user ID
    botToken: 'YOUR_BOT_TOKEN'  // Optional: if not set in settings
  })
})
.then(r => r.json())
.then(console.log)
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "User 123456789 has been removed from -1001234567890"
}
```

**Expected Error Responses:**
- User not in group: `{"success": false, "error": "User not found in the group/channel"}`
- Missing permissions: `{"success": false, "error": "Insufficient permissions"}`
- Invalid chat ID: `{"success": false, "error": "Invalid Chat ID format"}`

### Method 3: Test Edge Cases

#### Case 1: User Without telegramUserId

Create a test user with expired subscription but no `telegramUserId`:

```json
{
  "role": "vip",
  "profileSettings": {
    "telegramUsername": "@testuser"
  },
  "paymentInfo": {
    "expiresAt": "2024-01-15T00:00:00Z"
  }
}
```

**Expected Behavior:**
- User role should still be downgraded to 'guest'
- Telegram removal should be skipped
- Log should contain warning: `"Telegram user ID not available. Store telegramUserId in profileSettings when users join the group."`

#### Case 2: No Telegram Configuration

Temporarily remove bot token from Telegram settings.

**Expected Behavior:**
- Cron job should still run
- Telegram removal should be skipped
- Role downgrade should proceed
- Log should indicate `telegramConfigured: false`

#### Case 3: Multiple Expired Users

Create 3-5 test users with expired subscriptions.

**Expected Behavior:**
- All expired users should be processed
- Each user should have individual log entry
- Summary should show total counts

### Method 4: Verify Function Logic

Test individual functions using browser console (when logged in as admin):

**1. Test `getExpiredVIPMembers()`:**
```javascript
// In browser console on admin page
const response = await fetch('/api/admin/test-expired-members')
const data = await response.json()
console.log('Expired members:', data)
```

Or create a test page that calls this function directly (see Method 5).

**2. Test `updateMemberRole()`:**
This is typically tested indirectly through the cron job, but you can verify in Firebase Console that roles change correctly.

## Method 5: Admin Test Page (Optional)

For easier testing, you can create an admin test page at `/dashboard/admin/test-subscription-expiry` that provides:

- Button to manually trigger the cron job
- Display of expired members
- Display of recent audit logs
- Test user creation helper

## Verification Checklist

After running tests, verify:

- [ ] Expired users are found by `getExpiredVIPMembers()`
- [ ] Users are removed from Telegram VIP group (if `telegramUserId` exists)
- [ ] User roles are downgraded from 'vip' to 'guest'
- [ ] Audit log entry is created in `subscriptionExpiryLogs` collection
- [ ] Log contains accurate counts and error messages
- [ ] Response includes summary with correct statistics
- [ ] Errors are handled gracefully (missing telegramUserId, Telegram API errors)
- [ ] Cron job works with both GET and POST methods
- [ ] Authorization check works (unauthorized requests return 401)

## Common Issues and Solutions

### Issue: "Unauthorized" Error

**Solution:** Ensure `CRON_SECRET` matches in environment variables and request header

**Check:**
```powershell
# In PowerShell
$env:CRON_SECRET
```

Or check `.env.local` file:
```
CRON_SECRET=your-secret-here
```

### Issue: "Bot token not configured"

**Solution:** Set bot token in Telegram settings via admin panel (`/dashboard/admin/telegram-settings`)

1. Go to `/dashboard/admin/telegram-settings`
2. Enter bot token
3. Save settings
4. Verify bot is admin in Telegram group with "Ban Users" permission

### Issue: "User not found in the group/channel"

**Solution:** Ensure:
- User is actually in the Telegram group
- Bot has "Ban Users" permission
- `telegramUserId` is correct (not username - must be numeric ID)

**How to get Telegram User ID:**
- Use a Telegram bot like `@userinfobot` or `@getidsbot`
- Or implement a bot webhook that captures user ID when they join

### Issue: "Invalid Chat ID format"

**Solution:** Use correct format:
- Public groups: `@username`
- Private groups: `-1234567890` or `-1001234567890`
- Channels: `-1001234567890`

**How to get Chat ID:**
1. Add your bot to the group/channel
2. Send a message in the group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Look for `"chat":{"id":-1001234567890}` in the response

### Issue: "No expired VIP members found" (but you know there are)

**Solution:** Check the `expiresAt` date format in Firestore:
- Must be a Firestore Timestamp, not a string
- In Firebase Console, use the timestamp picker
- Or ensure the date is actually in the past

## Production Testing

Before deploying to production:

1. **Test with Real Telegram Group:**
   - Create a test Telegram group
   - Add test bot as admin with "Ban Users" permission
   - Add real test user (get their `telegramUserId`)
   - Update user in Firestore with expired subscription and `telegramUserId`
   - Run cron job manually
   - Verify removal works
   - Unban user to restore access

2. **Monitor Logs:**
   - Check Vercel function logs after deployment
   - Verify cron job runs at scheduled time (midnight daily)
   - Check `subscriptionExpiryLogs` collection regularly

3. **Test Rollback:**
   - If needed, manually unban users from Telegram (use bot: `/unban @username`)
   - Restore VIP role in Firestore if needed
   - Document process for admins

## Quick Test Script

Create a PowerShell script for quick testing:

```powershell
# test-subscription-expiry.ps1
$CRON_SECRET = $env:CRON_SECRET
$URL = "http://localhost:3000/api/cron/check-subscription-expiry"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $CRON_SECRET"
}

Write-Host "Testing subscription expiry cron job..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri $URL -Method POST -Headers $headers -Body "{}"

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10
```

Usage:
```powershell
.\test-subscription-expiry.ps1
```

## Next Steps

After successful testing:

1. Monitor first automated run (next midnight)
2. Review audit logs for any issues
3. Consider implementing Telegram bot webhook to capture `telegramUserId` when users join
4. Set up alerts for cron job failures
5. Document process for restoring access if needed
6. Train admins on how to manually trigger the cron job if needed
7. Set up monitoring dashboard for subscription expiry metrics

## Related Files

- Cron job endpoint: `app/api/cron/check-subscription-expiry/route.ts`
- Telegram removal API: `app/api/telegram/remove-member/route.ts`
- Member service: `src/lib/memberService.ts` (contains `getExpiredVIPMembers` and `updateMemberRole`)
- Telegram service: `src/lib/telegramService.ts` (contains `removeMemberFromTelegramGroup`)
- Cron schedule: `vercel.json` (daily at midnight)

