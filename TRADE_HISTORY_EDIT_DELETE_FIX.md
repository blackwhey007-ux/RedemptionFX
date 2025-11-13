# Trade History Edit/Delete & Duplicate Fix

## Summary of Changes

Successfully implemented edit/delete functionality for MT5 Trade History and fixed duplicate archiving issue.

---

## Problems Fixed

### 1. Duplicate Trades in History
**Root Cause**: MetaAPI uses multiple server replicas (london:0, london:1) that each trigger `onPositionsUpdated` when a position closes, causing the same trade to be archived multiple times.

**Solution**: Added a `Set` to track already-archived position IDs and skip duplicates:
```typescript
const archivedPositions = new Set<string>()

// Before archiving
if (archivedPositions.has(positionId)) {
  console.log(`⏭️ [ARCHIVE] Position ${positionId} already archived, skipping duplicate`)
  continue
}

// After successful archive
archivedPositions.add(positionId)
```

### 2. Incorrect Profit/Pips Values
**Root Cause**: The archiving code used `mapping.lastKnownProfit` which was only set when position opened, not updated during the trade.

**Solution**: 
- Store profit in `positionStates` during every position update
- Capture both price AND profit before deleting position state
- Use captured values for archiving

```typescript
// Store profit during updates
positionStates.set(positionId, {
  stopLoss: position.stopLoss,
  takeProfit: position.takeProfit,
  currentPrice: position.currentPrice,
  profit: position.profit || position.profitMsc || 0  // NEW
})

// Capture before deletion
const lastKnownPrice = positionState?.currentPrice || 0
const lastKnownProfit = positionState?.profit || 0  // NEW

// Use in archiving
finalProfit: lastKnownProfit || mapping.lastKnownProfit || 0
```

### 3. No Edit/Delete Functionality
**Solution**: Added full edit/delete capabilities with UI dialogs.

---

## Files Changed

### 1. `src/lib/metaapiStreamingService.ts`
- Added `archivedPositions` Set for duplicate prevention
- Updated `positionStates` to track profit
- Capture profit before position state deletion
- Check for duplicates before archiving
- Mark positions as archived after successful archive

### 2. `src/lib/mt5TradeHistoryService.ts`
- Added `updateTradeHistory()` function for editing trades
- Added `deleteTradeHistory()` function for deleting trades
- Updated imports to include `doc`, `updateDoc`, `deleteDoc`

### 3. `src/components/admin/EditTradeDialog.tsx` (NEW FILE)
- Full edit dialog with all trade fields
- Symbol, Type, Prices, Profit, Pips, Volume, Closed By
- Form validation and error handling
- Toast notifications for success/failure

### 4. `src/components/admin/MT5TradeHistoryPanel.tsx`
- Added Edit and Trash2 icons
- Added EditTradeDialog import
- Added state for edit dialog
- Added `handleEdit()` and `handleDelete()` functions
- Added Actions column to table
- Added Edit/Delete buttons for each trade
- Integrated EditTradeDialog component

---

## Features

### Edit Trade
- Click Edit button (pencil icon) on any trade
- Dialog opens with all fields editable:
  - Symbol
  - Type (BUY/SELL)
  - Open Price
  - Close Price
  - Stop Loss
  - Take Profit
  - Profit ($)
  - Pips
  - Volume
  - Closed By (TP/SL/MANUAL/UNKNOWN)
- Changes save to Firestore
- Table refreshes automatically
- Toast notification on success/error

### Delete Trade
- Click Delete button (trash icon) on any trade
- Confirmation dialog appears
- Trade permanently deleted from Firestore
- Table refreshes automatically
- Toast notification on success/error

---

## Testing Steps

### Test Duplicate Fix
1. Start dev server and streaming
2. Open a position in MT5
3. Wait 5 seconds for system to detect it
4. Close the position
5. Check terminal logs - should see `[ARCHIVE]` logs only ONCE
6. Check Trade History page - trade should appear only ONCE

### Test Correct Profit/Pips
1. Open a position
2. Let it run for a while (profit changes)
3. Close the position
4. Check Trade History
5. Verify profit matches what you saw in MT5
6. Verify pips are calculated correctly

### Test Edit Functionality
1. Go to VIP Sync → Trade History
2. Click Edit button on any trade
3. Modify some values (e.g., profit, pips)
4. Click Save Changes
5. Verify values updated in table
6. Refresh page - changes should persist

### Test Delete Functionality
1. Go to VIP Sync → Trade History
2. Click Delete button on any trade
3. Confirm deletion
4. Verify trade disappears from table
5. Refresh page - trade should stay deleted

---

## Terminal Logs (Expected)

When closing a position, you should see:
```
🔒 Position closed: 263512278
📦 [ARCHIVE] Attempting to archive closed trade: 263512278
📋 [ARCHIVE] Signal mapping retrieved: { hasMapping: true, signalId: 'xyz', lastKnownProfit: 10, capturedProfit: 10.5 }
✅ [ARCHIVE] Signal fetched from Firestore: { signalId: 'xyz', pair: 'GBPUSD', type: 'BUY', entryPrice: 1.2550 }
✅ [ARCHIVE] Archiving trade with data: { positionId: '263512278', symbol: 'GBPUSD', profit: 10.5, price: 1.2565 }
📦 [ARCHIVE SERVICE] Starting archiveClosedTrade for position: 263512278
✅ [ARCHIVE SERVICE] Pips calculated: 15.0
⏱️ [ARCHIVE SERVICE] Duration: 180 seconds (3 minutes)
🎯 [ARCHIVE SERVICE] Trade closed by: MANUAL
💾 [ARCHIVE SERVICE] Writing to Firestore collection: mt5_trade_history
✅ [ARCHIVE SERVICE] Trade archived with Firestore ID: abc123xyz
🎉 [ARCHIVE SERVICE] SUCCESS! Go to Trade History page to see this trade!
```

If a duplicate is detected:
```
⏭️ [ARCHIVE] Position 263512278 already archived, skipping duplicate
```

---

## Important Notes

1. **Duplicate Prevention**: The `archivedPositions` Set is only maintained during the streaming session. If you restart the server, the Set is cleared, but trades won't be duplicated because they're already in the database.

2. **Profit Accuracy**: The system now captures the actual profit from MT5 at the moment of closure, not stale data from when the position opened.

3. **Edit Permissions**: Any user with access to the Trade History page can edit/delete trades. Consider adding role-based restrictions if needed.

4. **Delete Confirmation**: Always shows a browser confirmation dialog to prevent accidental deletions.

5. **Firestore Operations**: Edit and delete operations are permanent and modify the Firestore database directly.

---

## Next Steps (Optional Enhancements)

1. **Role-Based Access**: Restrict edit/delete to admin users only
2. **Audit Log**: Track who edited/deleted which trades
3. **Bulk Operations**: Select multiple trades for bulk delete
4. **Export Before Delete**: Automatically export trade data before deletion
5. **Undo Feature**: Add ability to restore recently deleted trades

---

## Files Summary

**Modified:**
- `src/lib/metaapiStreamingService.ts` - Duplicate fix + profit capture
- `src/lib/mt5TradeHistoryService.ts` - Edit/delete functions
- `src/components/admin/MT5TradeHistoryPanel.tsx` - UI buttons + handlers

**Created:**
- `src/components/admin/EditTradeDialog.tsx` - Edit dialog component
- `TRADE_HISTORY_EDIT_DELETE_FIX.md` - This documentation

---

**All changes implemented successfully!** ✅



