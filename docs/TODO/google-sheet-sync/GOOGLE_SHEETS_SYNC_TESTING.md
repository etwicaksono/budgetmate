# Google Sheets Sync - Testing Guide

## Prerequisites

1. **Google Cloud Console Setup**
   - Create a project at https://console.cloud.google.com/
   - Enable Google Sheets API
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `http://localhost:3000/api/v1/sync/callback`
   - Copy Client ID and Client Secret

2. **Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_REDIRECT_URI="http://localhost:3000/api/v1/sync/callback"
   ```

3. **Database Migration**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

## Testing Flow

### 1. Connection Test

**Steps:**
1. Navigate to Settings → Google Sheets Sync
2. Click "Connect Google Account"
3. Authorize app in Google OAuth screen
4. Verify redirect back to settings with success message
5. Confirm "Connected" badge appears

**Expected:**
- OAuth flow completes without errors
- User tokens saved to database
- Status shows "Connected"

### 2. Push Test (Export)

**Steps:**
1. Create test data:
   - 2-3 accounts
   - 5-10 categories
   - 20-30 transactions
   - 2-3 transfers
   - 3-5 labels
2. Click "Push to Sheets"
3. Confirm action in modal
4. Wait for success notification
5. Click "Open in Google Sheets" link

**Expected:**
- New spreadsheet created with 6 tabs:
  - Metadata (version, export date, user info)
  - Accounts (all columns populated)
  - Categories (with parent relationships)
  - Transactions (with labels as pipe-separated)
  - Transfers (with currency conversions)
  - Labels (with colors)
- All personal_ids visible as numbers
- Dates in YYYY-MM-DD HH:MM:SS format
- Boolean values as TRUE/FALSE
- Sync history record created

### 3. Pull Test (Import)

**⚠️ WARNING: Pull in Replace mode deletes all local data!**

**Steps:**
1. Export current data as backup first
2. Make changes in Google Sheets:
   - Edit transaction description
   - Change account name
   - Add new row manually
3. Return to app
4. Click "Pull from Sheets"
5. Confirm replacement warning
6. Wait for success notification
7. Verify changes appear in app

**Expected:**
- Local data replaced with sheet data
- Changes from sheets reflected in app
- Sync history shows counts
- Page refreshes automatically

### 4. Disconnect Test

**Steps:**
1. Click "Disconnect"
2. Confirm in modal
3. Verify:
   - Status shows "Not Connected"
   - Sheet link removed
   - Connect button appears again

**Expected:**
- OAuth tokens revoked
- Database fields cleared (tokens, sheet_id, etc.)
- Can reconnect successfully

### 5. Error Handling Tests

**Test Invalid Tokens:**
1. Manually expire tokens in database
2. Try Push operation
3. Should auto-refresh tokens

**Test Network Errors:**
1. Disconnect internet
2. Try sync operation
3. Should show error message

**Test Invalid Sheet Format:**
1. Delete header row in Sheets
2. Try Pull operation
3. Should show validation error

## API Endpoint Testing

### Using cURL

```bash
# Get status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/sync/status

# Connect (get auth URL)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/sync/connect

# Push
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"replace"}' \
  http://localhost:3000/api/v1/sync/push

# Pull
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"replace"}' \
  http://localhost:3000/api/v1/sync/pull

# Get history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/sync/history?limit=10

# Disconnect
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/sync/disconnect
```

## Database Verification

```sql
-- Check OAuth tokens
SELECT id, email, google_access_token IS NOT NULL as has_token, 
       google_sheet_id, last_synced_at 
FROM "User";

-- Check sync history
SELECT direction, mode, status, synced_at,
       accounts_added, transactions_added
FROM "SyncHistory"
ORDER BY synced_at DESC
LIMIT 10;
```

## Common Issues

### Issue: OAuth redirect fails
- **Fix:** Check GOOGLE_REDIRECT_URI matches exactly in .env and Google Console

### Issue: Token expired error
- **Fix:** Token refresh should happen automatically. Check refresh_token is saved.

### Issue: Sheet not found
- **Fix:** User may have deleted sheet. Disconnect and reconnect to create new sheet.

### Issue: BigInt serialization error
- **Fix:** personal_id fields use BigInt. Ensure proper toString() conversion in transforms.

### Issue: Date parsing fails
- **Fix:** Dates must be in exact format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"

## Performance Benchmarks

Expected sync times (approximate):
- 100 transactions: ~2-3 seconds
- 500 transactions: ~5-7 seconds
- 1000 transactions: ~10-15 seconds

Batch size configurable (default: 500 rows per API call)

## Security Checklist

- ✅ OAuth tokens stored encrypted
- ✅ Refresh token rotation implemented
- ✅ Token expiry checking before API calls
- ✅ HTTPS required for production
- ✅ User can revoke access anytime
- ✅ No sensitive data in sheet (passwords excluded)

## Next Steps

1. Test all flows end-to-end
2. Verify data integrity after sync
3. Test with large datasets (1000+ records)
4. Test concurrent syncs (should be prevented)
5. Test token refresh edge cases
6. Add automated tests (Jest/Playwright)

## Future Enhancements (Not Implemented)

- Smart Sync mode with conflict resolution
- Selective sync (choose entities to sync)
- Scheduled automatic syncs
- Multi-sheet support per user
- Sync preview before apply
- Rollback functionality
- Export to CSV/Excel
- Import from other formats
