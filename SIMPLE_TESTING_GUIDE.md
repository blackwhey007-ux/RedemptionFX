# Simple Testing Guide - Test Subscription Expiry with Your Existing Expired Users

## 🎯 What This Does

When you run the test, it will:
1. ✅ Find all VIP users with expired subscriptions
2. ✅ Remove them from Telegram VIP group (if configured)
3. ✅ Change their role from "vip" to "guest"
4. ✅ Create a log of everything that happened

## 📋 Step-by-Step Instructions

### Step 1: Go to Test Page

**Option A: From Sidebar**
1. Log in as admin
2. Click **Admin** in sidebar (left side)
3. Click **Test Subscription Expiry**

**Option B: Direct URL**
- Go to: `/dashboard/admin/test-subscription-expiry`

### Step 2: Find Your CRON_SECRET

1. Open `.env.local` file in your project folder
2. Look for this line:
   ```
   CRON_SECRET=your-actual-secret-here
   ```
3. Copy everything after the `=` sign

**Example:**
- If you see: `CRON_SECRET=abc123xyz`
- Copy: `abc123xyz`

### Step 3: Paste and Test

1. On the test page, paste your CRON_SECRET in the input field
2. Click **"Run Test"** button
3. Wait 5-10 seconds

### Step 4: See the Results

You'll see a results card showing:
- ✅ **Expired Members Found**: How many expired users were detected
- ✅ **Successfully Processed**: How many were handled
- ✅ **Role Changed**: VIP → Guest count
- ✅ **Removed from Telegram**: Count (if Telegram is set up)
- ⚠️ **Warnings**: If any users don't have telegramUserId
- ❌ **Errors**: Any problems that occurred

## 🔍 What Happens to Your Users?

### For Each Expired VIP User:

1. **Role Change**: `role: "vip"` → `role: "guest"`
2. **Telegram Removal**: If they have `telegramUserId` in their profile, they'll be removed from your VIP Telegram group
3. **Log Created**: Everything is logged in Firebase for you to review

### Example Result:
```
✅ Success! Processed 3 expired VIP members
   - 3 roles downgraded (VIP → Guest)
   - 2 removed from Telegram
   - 1 warning: Missing telegramUserId (couldn't remove from Telegram)
```

## 🛠️ Troubleshooting

### Error: "Unauthorized"
**Fix:** Make sure your CRON_SECRET matches exactly what's in `.env.local`

### Error: "No expired VIP members found"
**What it means:** The system checked, but didn't find any VIP users with expired subscriptions.

**How to check if you have expired users:**
1. Go to Firebase Console
2. Open `users` collection
3. Look for users with:
   - `role: "vip"`
   - `paymentInfo.expiresAt` with a date in the past

### Warning: "Telegram user ID not available"
**What it means:** User will be downgraded to guest, but won't be removed from Telegram because we don't have their Telegram user ID.

**To fix this later:** You need to store `telegramUserId` (numeric ID) when users join the Telegram group.

## ✅ Verify It Worked

### In Firebase Console:

1. **Check Users:**
   - Go to Firestore → `users` collection
   - Find your expired VIP users
   - They should now show `role: "guest"`

2. **Check Logs:**
   - Go to Firestore → `subscriptionExpiryLogs` collection
   - You'll see a new document with:
     - When it ran
     - How many users were processed
     - Details for each user

3. **Check Telegram (if configured):**
   - Open your VIP Telegram group
   - Expired users should no longer be members

## 🎉 That's It!

The test processes all your expired users automatically. You don't need to do anything else - just check the results and verify in Firebase if needed.

---

**Need Help?** Check the full guide: `SUBSCRIPTION_EXPIRY_TESTING_GUIDE.md`


