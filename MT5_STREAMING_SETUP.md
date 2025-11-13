# MT5 Streaming Setup Guide

## Overview
Complete guide to get MT5 real-time position streaming working properly.

---

## What Was Fixed

### ✅ Created Missing API Endpoints
1. **`/api/mt5-streaming/start`** - Start/check streaming status
2. **`/api/mt5-streaming/stop`** - Stop streaming
3. **Updated `/api/mt5-open-positions`** - Fetch open positions

### ✅ Integrated with Existing Service
- Connected endpoints to `metaapiStreamingServiceV2`
- Uses your existing MetaAPI infrastructure
- No circular fetch calls or errors

### ✅ Fixed All Errors
- ✅ No more 503 Service Unavailable
- ✅ Proper streaming status checks
- ✅ Clear error messages for configuration issues

---

## Prerequisites

Before streaming will work, you MUST have:

### 1. MetaAPI Account Setup
- [ ] Sign up at https://metaapi.cloud
- [ ] Create an MT5 account connection
- [ ] Get your Account ID
- [ ] Get your API Token
- [ ] Ensure account is deployed and connected

### 2. Configure in Your App
Go to: **Dashboard → Admin → Telegram Settings**

You need to configure:
- ✅ **MetaAPI Account ID** (e.g., `abc123def456`)
- ✅ **MetaAPI Token** (from MetaAPI dashboard)
- ✅ **Region URL** (defaults to London)
- ✅ **Enable MT5 Integration** (checkbox)

### 3. Environment Variables (Optional)
Add to your `.env.local` file:
```env
METAAPI_TOKEN=your_metaapi_token_here
```

---

## How to Start Streaming

### Step 1: Configure MT5 Settings
1. Go to **Dashboard → Admin → Telegram Settings**
2. Scroll to **MT5 Integration Settings**
3. Fill in:
   - Account ID
   - Token (or use environment variable)
   - Save Settings

### Step 2: Start Streaming
1. Go to **Dashboard → Admin** (main admin page)
2. Find the **Open Trades Panel**
3. Click **"Start Streaming"** button
4. Wait 15-30 seconds for connection
5. Status should change to **"ACTIVE"**

### Step 3: Verify
- You should see open positions appear automatically
- Positions refresh every 10 seconds
- Telegram messages sent for new positions

### Step 4: Stop When Done
- Click **"Stop Streaming"** to disconnect
- This saves server resources

---

## Troubleshooting

### Issue: "MT5 settings not configured"
**Solution:**
1. Go to Admin → Telegram Settings
2. Configure Account ID and Token
3. Click Save
4. Try starting streaming again

### Issue: "METAAPI_TOKEN not configured"
**Solution:**
1. Check if token is in Telegram Settings
2. OR add to `.env.local`:
   ```env
   METAAPI_TOKEN=your_token_here
   ```
3. Restart your dev server

### Issue: "Account not deployed" or "Account not found"
**Solution:**
1. Log into MetaAPI dashboard
2. Verify account exists
3. Ensure account is deployed
4. Check Account ID matches exactly

### Issue: "Failed to connect to MetaAPI"
**Solution:**
1. Check internet connection
2. Verify MetaAPI service status
3. Check if account is in correct region
4. Try different region URL if needed

### Issue: Streaming status shows "INACTIVE"
**Solution:**
1. Check server console for errors
2. Verify MT5 settings are saved
3. Make sure MetaAPI account is deployed
4. Try stopping and restarting streaming

---

## Expected Behavior

### When Streaming is ACTIVE:
- ✅ Status shows "ACTIVE" with green badge
- ✅ Open positions load automatically
- ✅ Positions update every 10 seconds
- ✅ New positions trigger Telegram messages
- ✅ SL/TP changes update Telegram messages

### When Streaming is INACTIVE:
- ⚠️ Status shows "INACTIVE"
- ⚠️ Positions show "Streaming not active" message
- ⚠️ Start Streaming button is available
- ⚠️ No automatic position detection

---

## Architecture

```
Frontend (OpenTradesPanel)
    ↓
API Routes (/api/mt5-streaming/start)
    ↓
MetaAPI Streaming Service V2
    ↓
MetaAPI Cloud Service
    ↓
Your MT5 Account
```

### Flow:
1. User clicks "Start Streaming"
2. API calls `initializeStreaming()`
3. Service connects to MetaAPI
4. MetaAPI connects to MT5 account
5. Real-time position updates stream in
6. Positions detected → Signals created → Telegram sent

---

## Important Notes

### ⚠️ Server-Side Only
- Streaming runs on the server (Next.js API routes)
- If server restarts, streaming needs to be restarted
- Use deployment with persistent processes for production

### ⚠️ MetaAPI Limits
- Free tier: Limited streaming connections
- Paid tier: Unlimited streaming
- Check your MetaAPI plan limits

### ⚠️ Firestore Optimization Applied
- Position queries are now optimized
- Caching reduces Firestore reads
- Auto-refresh increased to 15 minutes
- Won't hit daily limits anymore

---

## Quick Checklist

Before starting streaming:
- [ ] MetaAPI account created
- [ ] MT5 account added to MetaAPI
- [ ] Account deployed and connected in MetaAPI
- [ ] Account ID and Token configured in app
- [ ] Telegram bot configured (for signal messages)
- [ ] Environment variables set (if using .env)

Then:
- [ ] Click "Start Streaming"
- [ ] Wait for "ACTIVE" status
- [ ] Verify positions appear
- [ ] Check Telegram for signal messages

---

## Support

If streaming still doesn't work after following this guide:

1. Check server console for detailed error messages
2. Verify MetaAPI account status in dashboard
3. Test connection using MetaAPI dashboard tools
4. Ensure MT5 account is actively trading
5. Check Firestore rules allow reading mt5Settings collection

---

## Success Indicators

You'll know everything is working when:
- ✅ Status shows "ACTIVE"
- ✅ Positions appear in the table
- ✅ Position count updates
- ✅ Telegram messages sent automatically
- ✅ No errors in console
- ✅ Positions update in real-time

---

**Last Updated:** November 3, 2025



