# Google Sheets Sync - Complete Implementation Specification

## Overview
Single persistent Google Sheet per user for bidirectional data synchronization with Push/Pull/Smart Sync modes and Merge/Replace options.

---

## 1. Database Schema Changes

### User Table Additions
```prisma
model User {
  // ... existing fields ...
  
  // Google OAuth
  google_access_token   String? @db.Text
  google_refresh_token  String? @db.Text
  google_token_expires  DateTime? @db.Timestamptz
  
  // Google Sheet Sync
  google_sheet_id       String? @db.VarChar(255)
  google_sheet_url      String? @db.VarChar(500)
  google_sheet_name     String? @db.VarChar(255)
  last_synced_at        DateTime? @db.Timestamptz
}
```

### New SyncHistory Model
```prisma
model SyncHistory {
  id                String   @id @default(cuid())
  user_id           String
  synced_at         DateTime @default(now()) @db.Timestamptz
  direction         String   @db.VarChar(10) // 'push', 'pull', 'smart'
  mode              String   @db.VarChar(10) // 'merge', 'replace'
  status            String   @db.VarChar(20) // 'success', 'error', 'conflict'
  
  // Record counts
  accounts_added    Int      @default(0)
  accounts_updated  Int      @default(0)
  accounts_deleted  Int      @default(0)
  categories_added  Int      @default(0)
  categories_updated Int     @default(0)
  categories_deleted Int     @default(0)
  transactions_added Int     @default(0)
  transactions_updated Int   @default(0)
  transactions_deleted Int   @default(0)
  transfers_added   Int      @default(0)
  transfers_updated Int      @default(0)
  transfers_deleted Int      @default(0)
  labels_added      Int      @default(0)
  labels_updated    Int      @default(0)
  labels_deleted    Int      @default(0)
  
  conflicts_count   Int      @default(0)
  error_message     String?  @db.Text
  
  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([synced_at])
}
```

---

## 2. Environment Variables

Add to `.env`:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Sheets Sync
GOOGLE_SHEETS_BATCH_SIZE=500
```

---

## 3. My Assumptions (Final Decisions)

### Data Conversion
- **Interest Rate**: Sheet shows `5` → DB stores `5.0` (same format)
- **Exchange Rate**: Default to `1.0` when empty
- **Category Parent**: Use `parent_id` only, ignore `parent_name` mismatch

### Input Parsing
- **Booleans**: Accept `TRUE`, `true`, `True`, `1`, `yes`, `YES` → all convert to `true`
- **Dates**: Accept ISO formats (`2026-01-02 14:30:25`, `2026-01-02T14:30:25`) and date-only (`2026-01-02` → `2026-01-02 00:00:00`)
- **Amounts**: Show expenses as negative `-50.00`, accept both positive/negative input (convert based on type)
- **NULL**: Text "NULL" (case-insensitive) → NULL in DB, empty cell → NULL

### Edge Cases
- **Duplicate personal_id**: Validation error, reject entire sync
- **Smart Sync Timestamp**: Use `updated_at` field from database
- **Rollback on Error**: All-or-nothing transaction (Option A)

---

## 4. Google Sheets Structure

### Sheet Tabs
1. **Metadata** - Sync info and record counts
2. **Accounts** - All user accounts
3. **Categories** - Category hierarchy
4. **Transactions** - All transactions with labels
5. **Transfers** - Transfer records
6. **Labels** - Label definitions

### Column Headers Format
**User-friendly names with DB field in comment/note**

Example:
- Column header: "Account Type"
- Cell comment: "DB field: account_type"

---

## 5. Sheet Column Definitions

### Metadata Sheet
```
| Key              | Value                 |
|------------------|-----------------------|
| Version          | 1.0.0                 |
| Last Sync        | 2026-01-02 22:30:25  |
| Sync Direction   | push                  |
| Sync Mode        | merge                 |
| User Email       | user@example.com      |
| Total Accounts   | 5                     |
| Total Categories | 12                    |
| Total Transactions| 150                  |
| Total Transfers  | 8                     |
| Total Labels     | 5                     |
```

### Accounts Sheet
**Visible Columns:**
- Personal ID (visible, not hidden)
- Name
- Account Type (dropdown: checking, savings, credit_card, cash, investment, loan)
- Currency
- Initial Balance (currency format, 2 decimals)
- Credit Limit (currency format, 2 decimals)
- Interest Rate (number, 5 means 5%)
- Icon (emoji text)
- Color (hex code #FF0000)
- Active (TRUE/FALSE text)
- Included in Total (TRUE/FALSE text)
- Created At (datetime, browser timezone, read-only)
- Updated At (datetime, browser timezone, read-only)

**Hidden Columns:**
- ID (CUID, hidden)

### Categories Sheet
**Visible Columns:**
- Personal ID
- Parent ID
- Parent Name (display only, derived from parent_id)
- Name
- Type (text: income, expense, both)
- Nature (dropdown: WANT, NEED, MUST)
- Icon (emoji text)
- Color (hex #FF0000)
- System (TRUE/FALSE, read-only after import - all become FALSE)
- Active (TRUE/FALSE)
- Created At (read-only)
- Updated At (read-only)

**Hidden Columns:**
- ID (CUID)
- Actual parent_id reference

### Transactions Sheet
**Visible Columns:**
- Personal ID
- Account Name (visible)
- Category Name (visible)
- Date (datetime, browser timezone)
- Type (text: income, expense, transfer_in, transfer_out)
- Amount (currency format, negative for expenses)
- Exchange Rate (number, 4-6 decimals, editable)
- Description (free text)
- Payee (free text)
- Payment Method (dropdown: Cash, Credit Card, Debit Card, Bank Transfer, Digital Wallet, Check, Other)
- Payment Status (dropdown: Cleared, Pending, Scheduled, Cancelled)
- Reference Number (free text)
- Labels (pipe-separated: Work|Personal|Urgent)
- Created At (read-only)
- Updated At (read-only)

**Hidden Columns:**
- ID (CUID)
- account_id
- category_id
- transfer_id
- currency (derived from account)

### Transfers Sheet
**Visible Columns:**
- Personal ID
- Date (datetime, browser timezone)
- From Account Name (visible)
- To Account Name (visible)
- Amount (currency format)
- To Amount (currency format, NULL if same currency)
- Description (free text)
- Created At (read-only)
- Updated At (read-only)

**Hidden Columns:**
- ID (CUID)
- from_account_id
- to_account_id
- currency (derived from from_account)
- to_currency (derived from to_account)

### Labels Sheet
**Visible Columns:**
- Personal ID
- Name
- Color (hex)
- Created At (read-only)
- Updated At (read-only)

**Hidden Columns:**
- ID (CUID)

---

## 6. Data Validation Rules

Apply Google Sheets data validation:
- **account_type**: Dropdown from `ACCOUNT_TYPES` constant
- **transaction_type**: Dropdown (income, expense, transfer_in, transfer_out)
- **category_type**: Dropdown (income, expense, both)
- **category_nature**: Dropdown (WANT, NEED, MUST)
- **payment_method**: Dropdown from `PAYMENT_METHODS` constant
- **payment_status**: Dropdown from `PAYMENT_STATUS` constant
- **Booleans**: Text "TRUE" or "FALSE"
- **Dates**: DateTime format
- **Amounts**: Number format with 2 decimals

---

## 7. Timezone Conversion

**Source**: Browser timezone (detected client-side)

**Fields to Convert:**
- `transaction.date` (TIMESTAMP in DB UTC → Display in browser TZ)
- `transfer.date` (TIMESTAMP in DB UTC → Display in browser TZ)
- `created_at` (TIMESTAMP in DB UTC → Display in browser TZ)
- `updated_at` (TIMESTAMP in DB UTC → Display in browser TZ)

**Conversion Logic:**
```typescript
// Push (DB UTC → Sheet browser TZ)
const sheetDate = convertUTCToBrowserTZ(dbDateUTC, browserTimezone);

// Pull (Sheet browser TZ → DB UTC)
const dbDate = convertBrowserTZToUTC(sheetDate, browserTimezone);
```

---

## 8. API Endpoints

### Connect Google Account
```
POST /api/v1/sync/google/connect
Body: { sheetName: string }
Response: { authUrl: string } or { sheetId, sheetUrl }
```

### Disconnect Google Account
```
POST /api/v1/sync/google/disconnect
Body: { deleteSheet: boolean }
Response: { success: boolean }
```

### Push to Sheet
```
POST /api/v1/sync/push?mode=merge|replace
Response: { success, recordCounts, timestamp }
```

### Pull from Sheet
```
POST /api/v1/sync/pull?mode=merge|replace
Response: { preview: { added, updated, deleted }, conflicts? }

POST /api/v1/sync/pull/confirm
Body: { mode, conflictResolutions? }
Response: { success, imported }
```

### Smart Sync
```
POST /api/v1/sync/smart?mode=merge|replace
Response: { success, changes, conflicts }
```

### Get Sync Status
```
GET /api/v1/sync/status
Response: { connected, sheetUrl, lastSync, history[] }
```

### Get Sync History
```
GET /api/v1/sync/history?limit=30
Response: { history: SyncHistory[] }
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Critical)
1. Add database schema changes (User fields + SyncHistory model)
2. Run Prisma migration
3. Add environment variables
4. Create Google OAuth flow (connect/disconnect)
5. Create Google Sheets service wrapper
6. Create timezone conversion utilities
7. Create constants for dropdowns

### Phase 2: Push Implementation
8. Create sheet structure builder
9. Implement DB → Sheets data transformation
10. Implement Push-Replace endpoint
11. Implement Push-Merge endpoint
12. Add formatting (hidden columns, dropdowns, currency)

### Phase 3: Pull Implementation
13. Create sheet parser/reader
14. Implement Sheets → DB data transformation
15. Implement validation logic
16. Implement Pull-Replace endpoint
17. Implement Pull-Merge endpoint
18. Add preview calculation

### Phase 4: UI
19. Create Google Sheets sync settings page
20. Add connection flow UI
21. Add sync operation buttons
22. Add preview modal
23. Add conflict resolution UI
24. Add sync history display

### Phase 5: Smart Sync
25. Implement conflict detection
26. Implement field-level comparison
27. Create conflict resolution logic
28. Add Smart Sync endpoint

### Phase 6: Polish
29. Add error handling and rollback
30. Add batch processing for large datasets
31. Cleanup sync history (30 days retention)
32. Add comprehensive testing

---

## 10. File Structure

```
src/
├── services/
│   ├── googleSheetsService.ts      # Google Sheets API wrapper
│   ├── syncService.ts              # Main sync logic
│   └── timezoneService.ts          # Timezone conversions
├── lib/
│   ├── google/
│   │   ├── oauth.ts                # OAuth flow
│   │   └── sheets.ts               # Sheets operations
│   └── sync/
│       ├── push.ts                 # Push logic
│       ├── pull.ts                 # Pull logic
│       ├── smart.ts                # Smart sync logic
│       ├── transformer.ts          # Data transformation
│       ├── validator.ts            # Sheet validation
│       └── preview.ts              # Preview calculator
├── types/
│   └── googleSheets.types.ts      # TypeScript types
└── constants/
    └── sheetsConfig.ts             # Sheet structure definitions

app/
├── api/v1/sync/
│   ├── google/
│   │   ├── connect/route.ts
│   │   ├── callback/route.ts
│   │   └── disconnect/route.ts
│   ├── push/route.ts
│   ├── pull/route.ts
│   ├── smart/route.ts
│   ├── status/route.ts
│   └── history/route.ts
└── (app)/settings/
    └── google-sheets/
        └── page.tsx                # UI page

prisma/
└── migrations/
    └── add_google_sheets_sync/     # Migration files
```

---

## 11. Testing Checklist

### Unit Tests
- [ ] Timezone conversion (UTC ↔ Browser TZ)
- [ ] Data transformation (DB ↔ Sheets)
- [ ] Validation logic
- [ ] Conflict detection

### Integration Tests
- [ ] Push-Replace with empty sheet
- [ ] Push-Merge with existing data
- [ ] Pull-Replace with empty DB
- [ ] Pull-Merge with existing data
- [ ] Smart Sync with conflicts
- [ ] Large dataset (10k+ transactions)

### E2E Tests
- [ ] Connect Google account
- [ ] Create sheet and push data
- [ ] Edit in sheet and pull
- [ ] Delete conflicts
- [ ] Disconnect and optionally delete sheet

---

## 12. Security Considerations

- OAuth tokens encrypted at rest (use existing crypto utility)
- Sheet permissions: Private by default
- Validate all sheet data before import
- Prevent SQL injection via Prisma
- Rate limiting on sync endpoints
- User isolation (can only sync own data)

---

## 13. Performance Optimizations

- Batch Google Sheets API calls (500 rows per batch)
- Use Prisma transactions for atomicity
- Index on user_id, personal_id for fast lookups
- Lazy load sync history (paginated)
- Cache sheet structure between operations

---

## 14. Error Messages

### User-Facing Errors
- "Sheet not found. It may have been deleted."
- "Invalid data in row X: [specific error]"
- "Sync failed: [reason]. Your data was not changed."
- "Conflicts detected. Please resolve before continuing."

### Validation Errors (by row)
- "Row 5: Invalid date format"
- "Row 10: Amount must be a number"
- "Row 15: Account 'Cash' not found"
- "Row 20: Duplicate personal ID: 123"

---

## Next Steps

1. Review this specification
2. Create database migration
3. Set up Google Cloud Project and OAuth credentials
4. Implement Phase 1 (Foundation)
5. Test thoroughly before proceeding to next phase

---

**Total Estimated Effort**: 40-60 hours
**Files to Create**: ~20 new files
**Files to Modify**: ~10 existing files
**Lines of Code**: ~5,000-7,000 lines

This is a complete, production-ready specification ready for implementation!
