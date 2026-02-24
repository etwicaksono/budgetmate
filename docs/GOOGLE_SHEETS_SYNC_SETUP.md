# Google Sheets Sync - Setup Guide

## Overview

The Google Sheets Sync feature allows users to:
- Export their financial data to Google Sheets for backup
- Import data from Google Sheets back to the app
- Keep data in sync across platforms
- Use Google Sheets for custom analysis and reporting

## Setup Instructions

### 1. Google Cloud Console Configuration

#### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note the Project ID

#### Enable Google Sheets API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click "Enable"
4. Also enable "Google Drive API" (required for file creation)

#### Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Configure consent screen first if prompted:
   - User Type: External (or Internal for G Suite)
   - App name: "Finance App"
   - User support email: your email
   - Scopes: Add these scopes:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/drive.file`
   - Test users: Add your email for testing
4. Create OAuth Client ID:
   - Application type: Web application
   - Name: "Finance App - Sheets Sync"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (dev)
     - Your production domain (prod)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/v1/sync/callback` (dev)
     - `https://yourdomain.com/api/v1/sync/callback` (prod)
5. Copy the Client ID and Client Secret

### 2. Environment Configuration

Add to `.env.local`:

```bash
# Google OAuth for Sheets Sync
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/v1/sync/callback"
```

For production, update `GOOGLE_REDIRECT_URI` to your domain.

### 3. Database Migration

The schema changes are already applied if you followed the commit history. If not:

```bash
# Apply migration
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

### 4. Verify Installation

1. Start the app: `npm run dev`
2. Navigate to Settings → Google Sheets Sync
3. You should see the "Connect Google Account" button
4. Click it to test OAuth flow

## Architecture

### Database Schema

**User Model** (additions):
```prisma
model User {
  // OAuth tokens
  google_access_token   String?   @db.Text
  google_refresh_token  String?   @db.Text
  google_token_expires  DateTime? @db.Timestamptz
  
  // Sheet configuration
  google_sheet_id      String?   @db.VarChar(255)
  google_sheet_url     String?   @db.VarChar(500)
  google_sheet_name    String?   @db.VarChar(255)
  last_synced_at       DateTime? @db.Timestamptz
  
  // Relation
  sync_history  SyncHistory[]
}
```

**SyncHistory Model**:
```prisma
model SyncHistory {
  id                    String   @id @default(cuid())
  user_id               String
  synced_at             DateTime @default(now())
  direction             String   // 'push', 'pull', 'smart'
  mode                  String   // 'merge', 'replace'
  status                String   // 'success', 'error', 'conflict'
  
  // Record counts (15 fields)
  accounts_added        Int      @default(0)
  // ... etc
  
  conflicts_count       Int      @default(0)
  error_message         String?  @db.Text
  
  user User @relation(...)
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/sync/connect` | GET | Get OAuth authorization URL |
| `/api/v1/sync/callback` | GET | OAuth callback handler |
| `/api/v1/sync/status` | GET | Get connection status |
| `/api/v1/sync/push` | POST | Export data to Sheets |
| `/api/v1/sync/pull` | POST | Import data from Sheets |
| `/api/v1/sync/history` | GET | Get sync history |
| `/api/v1/sync/disconnect` | POST | Revoke Google access |

### Sheet Structure

The sync creates a spreadsheet with 6 tabs:

1. **Metadata**
   - Version, export date, user ID, currency

2. **Accounts**
   - ID, Personal ID, Name, Type, Currency, Balances, etc.

3. **Categories**
   - ID, Personal ID, Parent ID, Name, Type, Nature, etc.

4. **Transactions**
   - ID, Personal ID, Account, Category, Amount, Date, Labels, etc.

5. **Transfers**
   - ID, Personal ID, From/To Accounts, Amounts, Currency, etc.

6. **Labels**
   - ID, Personal ID, Name, Color

### Data Format

- **Dates**: `YYYY-MM-DD HH:MM:SS` (browser timezone)
- **Booleans**: `TRUE` / `FALSE`
- **Numbers**: Decimal strings (e.g., `"1234.56"`)
- **Labels**: Pipe-separated (e.g., `"Work|Important"`)
- **Empty values**: Empty strings

## File Structure

```
├── app/api/v1/sync/
│   ├── connect/route.ts       # OAuth initiation
│   ├── callback/route.ts      # OAuth callback
│   ├── push/route.ts          # Export endpoint
│   ├── pull/route.ts          # Import endpoint
│   ├── status/route.ts        # Status check
│   ├── history/route.ts       # Sync history
│   └── disconnect/route.ts    # Revoke access
├── src/lib/
│   ├── auth/google.ts         # OAuth utilities
│   ├── services/
│   │   ├── googleSheets.ts    # Sheets API wrapper
│   │   ├── sheetTransform.ts  # DB → Sheets
│   │   ├── sheetParse.ts      # Sheets → DB
│   │   ├── syncPush.ts        # Push logic
│   │   └── syncPull.ts        # Pull logic
│   └── utils/timezone.ts      # Date conversions
├── app/(app)/settings/
│   ├── sections/GoogleSheetsSection.tsx
│   └── sync/page.tsx
└── docs/
    ├── GOOGLE_SHEETS_SYNC_SPEC.md
    ├── GOOGLE_SHEETS_SYNC_SETUP.md
    └── GOOGLE_SHEETS_SYNC_TESTING.md
```

## Security Considerations

1. **OAuth Tokens**: Stored in database, not in localStorage
2. **Scopes**: Minimal scopes requested (spreadsheets + drive.file only)
3. **Token Refresh**: Automatic refresh before expiry
4. **Revocation**: Users can disconnect anytime
5. **HTTPS**: Required in production
6. **Data Access**: Only user's own spreadsheets

## Troubleshooting

### "OAuth error: redirect_uri_mismatch"
- Verify GOOGLE_REDIRECT_URI in .env matches Google Console exactly
- Include http/https protocol
- Include port number if not 80/443

### "API not enabled"
- Enable Google Sheets API in Cloud Console
- Enable Google Drive API as well

### "Token expired" errors
- Refresh tokens should auto-refresh
- Check google_refresh_token is saved in database
- Disconnect and reconnect to get new tokens

### "Permission denied" on sheet access
- User may have deleted the sheet
- Disconnect and reconnect to create new sheet

## Production Checklist

- [ ] Update GOOGLE_REDIRECT_URI to production domain
- [ ] Verify OAuth consent screen is published (if public)
- [ ] Test with multiple users
- [ ] Add rate limiting to sync endpoints
- [ ] Set up monitoring for sync failures
- [ ] Configure backup of sync history
- [ ] Add sync queue for concurrent requests
- [ ] Implement sync job timeout
- [ ] Add Sentry error tracking

## Support

For issues or questions:
1. Check testing guide for common problems
2. Review sync history in database
3. Check application logs for errors
4. Verify Google Cloud Console configuration
