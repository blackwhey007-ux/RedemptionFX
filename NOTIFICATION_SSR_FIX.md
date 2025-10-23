# Notification System SSR Fix

## Issue
```
TypeError: Cannot read properties of undefined (reading 'permission')
```

The error occurred because the `UnifiedNotificationContext` was trying to access browser-specific APIs (`Notification`, `window`) during server-side rendering (SSR) in Next.js.

## Root Cause
Next.js performs server-side rendering where the `window` object and browser APIs like `Notification` don't exist. The code was attempting to access `Notification.permission` without first checking if:
1. We're in a browser environment (`typeof window !== 'undefined'`)
2. The Notification API exists (`'Notification' in window`)

## Files Fixed

### `src/contexts/UnifiedNotificationContext.tsx`

Added proper SSR safety checks in three locations:

#### 1. **Online/Offline Detection** (Line 79)
**Before:**
```typescript
useEffect(() => {
  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // ...
}, [])
```

**After:**
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return  // ✅ SSR check added

  const handleOnline = () => setIsOnline(true)
  const handleOffline = () => setIsOnline(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  // ...
}, [])
```

#### 2. **Request Notification Permission** (Line 343)
**Before:**
```typescript
const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
  if (!('Notification' in window)) return false

  if (Notification.permission === 'granted') return true
  // ...
}, [])
```

**After:**
```typescript
const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
  // ✅ Check if we're in a browser environment
  if (typeof window === 'undefined') return false
  
  // ✅ Check if Notification API is available
  if (!('Notification' in window)) return false

  if (Notification.permission === 'granted') return true
  // ...
  
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch (err) {
    console.warn('Failed to request notification permission:', err)
    return false
  }
}, [])
```

#### 3. **Show Browser Notification** (Line 354)
**Before:**
```typescript
const showBrowserNotification = useCallback((options: BrowserNotificationOptions) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  try {
    new Notification(options.title, { /* ... */ })
  } catch (err) {
    console.warn('Failed to show browser notification:', err)
  }
}, [])
```

**After:**
```typescript
const showBrowserNotification = useCallback((options: BrowserNotificationOptions) => {
  // ✅ Check if we're in a browser environment
  if (typeof window === 'undefined') return
  
  // ✅ Check if Notification API is available
  if (!('Notification' in window)) return
  
  // ✅ Check if permission is granted
  if (Notification.permission !== 'granted') return

  try {
    new Notification(options.title, { /* ... */ })
  } catch (err) {
    console.warn('Failed to show browser notification:', err)
  }
}, [])
```

## Why This Fix Works

### SSR Safety Pattern
The fix follows the standard Next.js SSR safety pattern:

1. **Check for browser environment first:**
   ```typescript
   if (typeof window === 'undefined') return
   ```
   This prevents any code from running during server-side rendering.

2. **Check for API availability:**
   ```typescript
   if (!('Notification' in window)) return
   ```
   This ensures the browser supports the Notification API.

3. **Check for permission:**
   ```typescript
   if (Notification.permission !== 'granted') return
   ```
   This verifies the user has granted notification permissions.

### Error Handling
Added try-catch blocks to gracefully handle any unexpected errors when requesting permissions or showing notifications.

## Testing Checklist

- ✅ No SSR errors in console
- ✅ No linting errors
- ✅ Notifications work in browser
- ✅ No errors during page refresh
- ✅ No errors during initial page load
- ✅ Graceful degradation when Notification API unavailable

## Related Issues Fixed

This fix also prevents potential errors with:
- Browser notification permission requests
- Online/offline event listeners
- Any other browser-specific APIs accessed during SSR

## Best Practices Applied

1. **Always check for `typeof window === 'undefined'`** before accessing browser APIs in Next.js
2. **Check for API availability** before using browser-specific features
3. **Add try-catch blocks** for async operations that might fail
4. **Graceful degradation** - return early instead of throwing errors
5. **Console warnings** instead of errors for non-critical failures

## Performance Impact

✅ **No negative performance impact**
- Early returns are extremely fast
- Prevents unnecessary code execution during SSR
- Reduces error logging overhead

## Browser Compatibility

The fix maintains compatibility with:
- ✅ All modern browsers with Notification API
- ✅ Browsers without Notification API (graceful degradation)
- ✅ Server-side rendering (Next.js)
- ✅ Static site generation (Next.js)

---

**Status:** ✅ Fixed and verified
**No linting errors:** ✅ Confirmed
**Ready for production:** ✅ Yes


