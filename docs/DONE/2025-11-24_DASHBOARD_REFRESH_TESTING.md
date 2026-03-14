# Dashboard Auto-Refresh Testing Guide

## What Was Fixed

### 1. Transaction Event Dispatching
- **Issue**: Both CREATE and EDIT operations were dispatching `transaction-updated` event
- **Fix**: Now correctly dispatches:
  - `transaction-created` for new transactions
  - `transaction-updated` for edited transactions

### 2. Console Logging Added
Added debug logging to help track the refresh flow:
- Dashboard event listeners registration/removal
- Event detection in dashboard
- Event dispatching from modals
- Data fetching calls
- Balance trend data updates

## How to Test

### Open Browser Console
1. Open your Finance App in browser
2. Press F12 to open DevTools
3. Go to "Console" tab

### Test Transaction Creation
1. Click "Add Transaction" button
2. Fill in transaction details
3. Click "Save"
4. **Watch console** for these messages:
   ```
   [GlobalTransactionModal] Dispatching event: transaction-created
   [Dashboard] Data change event detected: transaction-created
   [Dashboard] fetchDashboardData called
   [Dashboard] Setting balance trend data: [...]
   ```

### Test Transaction Editing
1. Click on an existing transaction
2. Modify some fields
3. Click "Save"
4. **Watch console** for:
   ```
   [GlobalTransactionModal] Dispatching event: transaction-updated
   [Dashboard] Data change event detected: transaction-updated
   [Dashboard] fetchDashboardData called
   [Dashboard] Setting balance trend data: [...]
   ```

### Test Account Creation/Editing
1. Click "Add Account" or edit existing
2. Save changes
3. **Watch console** for:
   ```
   [useAccountModal] Dispatching event: account-created (or account-updated)
   [Dashboard] Data change event detected: account-created (or account-updated)
   [Dashboard] fetchDashboardData called
   [Dashboard] Setting balance trend data: [...]
   ```

## Expected Behavior

After any of these operations:
- ✅ Total balance header should update immediately
- ✅ Balance trend chart should show new data
- ✅ Account cards should reflect new balances
- ✅ Console should show the complete event flow

## If Chart Still Doesn't Update

Check the console for:

### 1. Events Not Firing
If you don't see dispatch messages:
- The modal might not be using the correct event system
- Check if modal is properly importing and using the hooks

### 2. Events Not Received
If dispatch happens but dashboard doesn't detect:
- Event listeners might not be registered
- Check if `useEffect` dependencies are correct

### 3. API Not Called
If event is detected but no `fetchDashboardData called`:
- Check if `fetchDashboardData` or `fetchAccounts` are properly memoized
- Look for errors in console

### 4. Data Not Updating UI
If API is called but chart doesn't change:
- Check the data structure in `Setting balance trend data`
- Verify the chart component is receiving the new data
- Look for React rendering issues

## Database Validation

Run these scripts to validate data:
```bash
# Check account balances
npx tsx scripts/check-balance-data.ts

# Check transaction amounts
npx tsx scripts/check-transaction-amounts.ts

# Test balance calculation
npx tsx scripts/test-balance-api.ts
```

## Known Working Flow

1. User creates/edits transaction
2. Modal dispatches custom event (`transaction-created` or `transaction-updated`)
3. Dashboard receives event via `window.addEventListener`
4. Dashboard calls `fetchAccounts()` and `fetchDashboardData()`
5. API returns fresh data with recalculated balances
6. React state updates (`setBalanceTrend`, `setAccounts`)
7. Components re-render with new data
8. Chart displays updated balances

## Troubleshooting Commands

```bash
# Type check
npx tsc --noEmit

# Start dev server
npm run dev

# Check if events are working (browser console)
window.dispatchEvent(new CustomEvent('transaction-created', { detail: { test: true } }))
```

## Next Steps if Still Not Working

If the console shows everything working but chart still doesn't update, the issue might be:
1. React state not triggering re-render
2. Chart component not responding to prop changes
3. Data format mismatch
4. Browser caching

Share the console output for further diagnosis.
