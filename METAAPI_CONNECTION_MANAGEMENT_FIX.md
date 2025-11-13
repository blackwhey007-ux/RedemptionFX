# MetaAPI Connection Management Fix

## Problem Solved

**Error**: `TooManyRequestsError: You have used all your account subscriptions quota (26/25)`

**Root Cause**: The streaming service was creating new MetaAPI connections without properly closing old ones, causing subscription leaks.

---

## Solution Implemented

### 1. Proper Connection Cleanup Function

**New Function**: `cleanupConnection()`

Properly closes MetaAPI connections and frees subscriptions:
- Removes all event listeners
- Closes streaming connection
- Unsubscribes from terminal
- Clears all state (positions, processing, archived)
- Resets reconnect attempts

```typescript
async function cleanupConnection(): Promise<void> {
  // Close streaming connection
  // Unsubscribe from terminal
  // Clear all state
  // Free subscription
}
```

### 2. Connection Health Check

**New Function**: `isConnectionHealthy()`

Checks if existing connection is actually working before reusing it:
- Verifies connection exists
- Checks synchronization status
- Returns true only if connection is healthy

### 3. Smart Connection Reuse

**Updated**: `initializeStreaming()`

Before creating new connection:
1. Check if existing connection is healthy → reuse it
2. If unhealthy → clean up first
3. If stale connections exist → clean up before creating new
4. Wait 2 seconds after cleanup for MetaAPI to register

```typescript
// Check existing connection
if (healthy) {
  return { success: true } // Reuse
} else {
  await cleanupConnection() // Clean up first
}

// Clean stale connections
if (streamingConnection || metaApiConnection) {
  await cleanupConnection()
  await sleep(2000) // Let MetaAPI register cleanup
}
```

### 4. Proper Cleanup on Stop

**Updated**: `stopStreaming()`

Now actually closes connections and frees subscriptions:
- Calls `cleanupConnection()`
- Logs to streaming logs
- Deletes Firestore status document
- Returns success/error status

### 5. Synchronization Timeout

**Added**: 30-second timeout to prevent hanging

If synchronization takes >30 seconds:
- Logs error
- Cleans up connection
- Prevents zombie connections

### 6. Process Exit Handlers

**Added**: Automatic cleanup on server shutdown

Handles:
- `SIGTERM` - Graceful shutdown
- `SIGINT` - Ctrl+C interrupt
- `beforeExit` - Node.js process exit

```typescript
process.on('SIGTERM', () => cleanupConnection())
process.on('SIGINT', () => cleanupConnection())
process.on('beforeExit', () => cleanupConnection())
```

### 7. Better Error Handling

**Updated**: Error responses

- Detects subscription limit errors
- Returns 429 status code
- Provides helpful hints
- Suggests manual cleanup or wait time

### 8. Manual Cleanup API

**New File**: `src/app/api/mt5-streaming/cleanup/route.ts`

Emergency cleanup endpoint:
- `POST /api/mt5-streaming/cleanup`
- Forces connection cleanup
- Frees all subscriptions
- Useful before server restart

---

## Files Modified

1. **src/lib/metaapiStreamingService.ts**
   - Added `cleanupConnection()` function
   - Added `isConnectionHealthy()` function
   - Updated `initializeStreaming()` to check/cleanup before creating
   - Updated `stopStreaming()` to actually close connections
   - Added synchronization timeout
   - Added process exit handlers
   - Better error messages for subscription limits

2. **src/app/api/mt5-streaming/start/route.ts**
   - Fixed import (was using V2, now uses correct service)
   - Added 429 status code for subscription limits
   - Added helpful hints in error responses

3. **src/app/api/mt5-streaming/stop/route.ts**
   - Fixed import (was using V2, now uses correct service)
   - Updated to handle new return type from `stopStreaming()`
   - Better error handling

4. **src/app/api/mt5-streaming/cleanup/route.ts** (NEW)
   - Manual cleanup endpoint
   - Emergency subscription freeing
   - Call before server restart

---

## How It Works Now

### Starting Streaming

```
User clicks "Start Streaming"
  ↓
Check existing connection health
  ↓ (if healthy)
Reuse connection ✅
  ↓ (if unhealthy/stale)
Clean up old connection
  ↓
Wait 2 seconds
  ↓
Create NEW connection
  ↓
Set 30s timeout
  ↓
Wait for sync
  ↓
Clear timeout
  ↓
✅ Streaming active
```

### Stopping Streaming

```
User clicks "Stop Streaming"
  ↓
Remove all listeners
  ↓
Close streaming connection
  ↓
Unsubscribe from terminal
  ↓
Clear all state
  ↓
Log to Firestore
  ↓
✅ Subscription freed
```

### Server Restart

```
Server receives shutdown signal
  ↓
Process exit handler triggered
  ↓
Clean up all connections
  ↓
Free subscriptions
  ↓
✅ Next restart won't leak subscriptions
```

---

## Expected Terminal Logs

### Good Startup (No Cleanup Needed)
```
⚠️ Streaming already active with healthy connection
```

### Startup with Stale Connection
```
🧹 Cleaning up stale connection before starting new one...
🧹 Cleaning up MetaAPI streaming connection...
✅ Streaming connection closed
🧹 Closing MetaAPI account connection...
✅ Unsubscribed from terminal
✅ MetaAPI cleanup complete - subscription freed
🚀 Initializing MetaAPI real-time streaming...
✅ Real-time streaming active
```

### Stopping
```
🛑 Stopping MetaAPI real-time streaming...
🧹 Cleaning up MetaAPI streaming connection...
✅ Streaming connection closed
🧹 Closing MetaAPI account connection...
✅ Unsubscribed from terminal
✅ MetaAPI cleanup complete - subscription freed
✅ Streaming stopped and cleaned up
```

### Server Restart
```
🔄 Process exiting - cleaning up MetaAPI connections...
🧹 Cleaning up MetaAPI streaming connection...
✅ Unsubscribed from terminal
✅ MetaAPI cleanup complete
```

### Subscription Limit Hit
```
❌ Error initializing streaming: TooManyRequestsError...
🚫 MetaAPI subscription limit reached!
💡 Solution: Stop streaming and wait 2 minutes, or close old connections at https://app.metaapi.cloud/
```

---

## Immediate Actions Needed

### Step 1: Stop Current Streaming
Click "Stop Streaming" button in your UI or call:
```bash
curl -X POST http://localhost:3000/api/mt5-streaming/stop
```

### Step 2: Wait 2 Minutes
Let MetaAPI register the cleanup

### Step 3: Restart Streaming
Click "Start Streaming" button

Should now work without subscription quota error!

---

## Alternative: Manual Cleanup via MetaAPI Dashboard

If still hitting limits:

1. Go to https://app.metaapi.cloud/
2. Login to your account
3. Navigate to: **Accounts** → **Your MT5 Account**
4. Look for **"Subscriptions"** or **"Connections"** tab
5. Close any **inactive** or **old** connections
6. Keep only **1 active** connection
7. Wait 2 minutes
8. Try starting streaming again

---

## Emergency Cleanup Endpoint

If you need to forcefully clean up all connections:

```bash
curl -X POST http://localhost:3000/api/mt5-streaming/cleanup
```

Response:
```json
{
  "success": true,
  "message": "All MetaAPI connections cleaned up successfully. Subscriptions freed. Wait 2 minutes before restarting streaming."
}
```

---

## Prevention Features

### 1. No Duplicate Connections
- Health check before creating new connection
- Reuses existing healthy connections
- Cleans up stale connections first

### 2. Auto-Cleanup on Restart
- Process exit handlers
- Connections freed when server restarts
- No zombie subscriptions

### 3. Timeout Protection
- 30-second synchronization timeout
- Prevents hanging connections
- Auto-cleanup on timeout

### 4. Better Error Messages
- Detects subscription limits
- Provides solution hints
- Returns proper HTTP status codes

---

## Monitoring Subscription Usage

### Check Current Subscriptions

In your MetaAPI dashboard you should now see:
- **Active subscriptions**: 1-2 (not 26!)
- **Status**: Connected
- **Last activity**: Recent

### Expected Subscription Count

After these fixes:
- **During streaming**: 1 subscription
- **After stop**: 0 subscriptions (freed within 2 minutes)
- **After server restart**: 0 subscriptions (auto-cleanup)

---

## Files Changed

**Modified:**
- `src/lib/metaapiStreamingService.ts` - Complete lifecycle management
- `src/app/api/mt5-streaming/start/route.ts` - Better error handling
- `src/app/api/mt5-streaming/stop/route.ts` - Proper cleanup

**Created:**
- `src/app/api/mt5-streaming/cleanup/route.ts` - Emergency cleanup
- `METAAPI_CONNECTION_MANAGEMENT_FIX.md` - This documentation

---

## Testing

1. **Stop current streaming** (if running)
2. **Wait 2 minutes**
3. **Start streaming**
4. Check terminal - should see cleanup logs if needed
5. **Verify** - no subscription quota error
6. **Restart dev server** (Ctrl+C)
7. Check terminal - should see "Process exiting - cleanup..."
8. **Start server again**
9. **Start streaming**
10. Should work without creating duplicate subscriptions

---

## Success Criteria

✅ Starting streaming doesn't create duplicate connections
✅ Stopping streaming properly frees subscriptions
✅ Server restart cleans up connections
✅ Subscription count stays at 1-2 (not 26)
✅ No more "TooManyRequestsError"
✅ Streaming restarts reliably

---

**Your subscription quota will now be managed properly!** 🎯



