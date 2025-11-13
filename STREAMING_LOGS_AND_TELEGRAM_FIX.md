# Streaming Logs & Telegram TP/SL Update Fix

## Issues Found

### Issue 1: No Streaming Logs Page ❌
**Problem:** There's no page to view streaming logs  
**Impact:** Can't see what's happening with position detection, TP/SL changes, etc.

**Solution:** Create `/dashboard/admin/streaming-logs` page

### Issue 2: Telegram Edit Endpoint Mismatch ❌
**Problem:** 
- Service calls: `/api/telegram/edit-message`
- Actual endpoint: `/api/telegram/update-message`
- Result: TP/SL changes fail to update Telegram messages

**Solution:** Create the missing `/api/telegram/edit-message` endpoint

---

## Files to Create

### 1. Streaming Logs Viewer Page
**File:** `src/app/dashboard/admin/streaming-logs/page.tsx`

**Features:**
- Display all streaming logs with filtering
- Filter by type (position_detected, position_tp_sl_changed, etc.)
- Show old→new values for TP/SL changes
- Real-time updates
- Export capability
- Color-coded by log type

### 2. Edit Message API Endpoint
**File:** `src/app/api/telegram/edit-message/route.ts`

**Purpose:**
- Match the URL that `editTelegramMessage()` function calls
- Edit Telegram messages for TP/SL changes
- Proper error handling

---

## Files to Modify

### 1. Sidebar Navigation
**File:** `src/components/dashboard/sidebar.tsx`

**Add:** Link to Streaming Logs under Admin section

---

## Testing Plan

### Test TP/SL Updates
1. Start streaming
2. Open a position in MT5
3. Modify TP/SL in MT5
4. Check console for logs
5. Check Telegram message was edited
6. Check streaming logs page shows the change

### Expected Console Output
```
🔄 SL/TP CHANGE DETECTED for position 12345
   Old SL: 1.08500 → New SL: 1.08550
   Old TP: 1.09000 → New TP: 1.09100
✅ TP/SL change logged for position 12345
✅ Found Telegram mapping for position 12345: messageId=123
📝 Editing Telegram message 123 in chat @yourchannel
📱 Telegram message updated for position 12345
```

---

## Implementation Steps

1. Create `/api/telegram/edit-message` endpoint
2. Create streaming logs viewer page
3. Add navigation link to logs page
4. Test TP/SL update functionality
5. Verify logs show up correctly

---

Would you like me to implement these fixes?



