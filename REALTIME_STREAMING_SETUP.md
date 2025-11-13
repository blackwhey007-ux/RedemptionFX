# Real-Time MT5 Streaming Setup Guide

## 🎯 Overview

Your platform now supports **instant Telegram notifications** when trades open in MT5 using MetaAPI's real-time streaming API. No more manual sync button needed!

## ✅ What's Implemented

### New Features

1. **Real-Time Streaming Service** (`src/lib/metaapiStreamingService.ts`)
   - WebSocket connection to MetaAPI
   - Automatic new position detection every 2 seconds
   - Instant signal creation and Telegram notification
   - Auto-reconnection on connection loss
   - Connection status tracking

2. **Streaming API Endpoints**
   - `POST /api/mt5-streaming/start` - Start streaming
   - `POST /api/mt5-streaming/stop` - Stop streaming
   - `GET /api/mt5-streaming/start` - Get streaming status
   - `GET /api/cron/mt5-streaming-keeper` - Background keeper cron

3. **Admin Panel Controls**
   - "Real-Time Streaming" card in VIP Sync tab
   - Start/Stop streaming buttons
   - Live connection status display
   - Last event timestamp

4. **Automated Monitoring**
   - Background cron job checks connection every 5 minutes
   - Auto-restarts streaming if disconnected
   - Maintains persistent connection

## 🚀 How to Use

### 1. Configure MetaAPI (One Time Setup)

1. Go to `/dashboard/admin` → VIP Sync tab
2. Enable "API Sync" toggle
3. Enter your MetaAPI Account ID
4. Enter your MetaAPI Token
5. Click "Save Configuration"
6. Test connection

### 2. Start Real-Time Streaming

1. In the "Real-Time Streaming" card, click "Start Streaming"
2. Wait for connection confirmation
3. You'll see "Connected" status badge
4. That's it! Streaming is active

### 3. How It Works

**When a Trade Opens:**
1. Position opens in MT5
2. Streaming detects it within 2 seconds
3. Signal is automatically created
4. Message sent to Telegram instantly
5. No manual actions needed!

**Connection Management:**
- Streaming keeper cron runs every 5 minutes
- If connection drops, it auto-restarts
- Status is tracked in Firestore
- Admin panel shows live status

## 📊 Comparison: Polling vs Streaming

### Old Method (Polling)
- ❌ Check every minute via cron
- ❌ Up to 60 second delay
- ❌ Wastes API calls on empty checks
- ❌ Requires manual sync button for instant

### New Method (Streaming)
- ✅ Check every 2 seconds
- ✅ Max 2 second delay
- ✅ Only processes actual changes
- ✅ Fully automatic, no manual sync needed

## 🔄 Fallback System

The platform maintains a **hybrid approach**:

1. **Primary**: Real-time streaming for instant notifications
2. **Secondary**: Cron polling every 5 minutes as backup
3. **Manual**: "Sync Signals Now" button for troubleshooting

### When Streaming Is Active
- All new positions detected via streaming
- Cron jobs run as backup only
- Manual sync available if needed

### When Streaming Is Off
- Cron jobs handle all sync
- Manual sync works normally
- Can restart streaming anytime

## 🛠️ Troubleshooting

### Streaming Won't Start

**Check:**
1. MetaAPI credentials are saved and valid
2. "Enable API Sync" toggle is ON
3. Account is deployed in MetaAPI dashboard
4. Token has required permissions

**Solution:**
- Save configuration again
- Test connection button
- Check browser console for errors
- Verify MT5 account is connected in MetaAPI

### Streaming Keeps Stopping

**Check:**
1. Network stability
2. MetaAPI account status
3. Token expiration
4. Firestore connection

**Solution:**
- Streaming keeper will auto-restart
- Check cron logs
- Manually restart if needed
- Increase polling frequency as fallback

### No Telegram Messages

**Check:**
1. Streaming shows "Connected"
2. Positions exist in MT5
3. Telegram bot is configured
4. Channel permissions

**Solution:**
- Use manual sync as test
- Check Telegram logs
- Verify signal creation in admin
- Test Telegram connection separately

## 📁 Files Created

```
src/lib/metaapiStreamingService.ts         # Streaming service logic
app/api/mt5-streaming/start/route.ts       # Start/status endpoint
app/api/mt5-streaming/stop/route.ts        # Stop endpoint
app/api/cron/mt5-streaming-keeper/route.ts # Background keeper
REALTIME_STREAMING_SETUP.md                # This guide
```

## 📝 Files Modified

```
src/components/admin/ApiSetupPanel.tsx     # Added streaming controls
vercel.json                                 # Added streaming keeper cron
```

## 🔐 Environment Variables

No new environment variables needed! Uses existing:
- `METAAPI_TOKEN` - Your MetaAPI token
- `MT5_ACCOUNT_ID` - Your account ID
- `CRON_SECRET` - Cron authentication

## 🎉 Benefits

1. **Instant Notifications** - 2 second delay instead of 60 seconds
2. **No Manual Work** - Fully automatic
3. **Reliable** - Auto-reconnection if connection drops
4. **Cost Efficient** - Only processes actual changes
5. **Professional** - Real-time trading signals

## 📚 Next Steps

1. Configure MetaAPI credentials in admin panel
2. Start streaming
3. Test with a small position
4. Monitor Telegram for instant message
5. Enjoy automated trading signals!

## 🆘 Support

If you encounter issues:
1. Check streaming status in admin panel
2. Review browser console logs
3. Check server logs for cron jobs
4. Verify MetaAPI dashboard account status
5. Try manual sync to test connection

---

**Ready to go live!** Start streaming and get instant Telegram notifications for every new MT5 trade. 🚀


