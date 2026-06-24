# Cleanup: Remove Unused Database Tables, Columns & Sync Feature

## Background

After the multi-currency removal, an audit of the Prisma schema revealed several tables and columns that are no longer used (or were never used). Additionally, the entire Google Sheets sync feature is being removed as it is no longer needed. This plan removes all of them to reduce schema complexity and dead code.

---

## Phase 1 — Drop 4 Unused Tables

### 1.1 — Drop `RecurringTransaction` table

**Status:** 0 references in codebase (no API route, service, UI, or seed data)

**Schema change:**
- Remove `model RecurringTransaction` from `prisma/schema.prisma`

**Code cleanup:** None needed (no references)

**Migration:**
```sql
DROP TABLE IF EXISTS "RecurringTransaction";
```

### 1.2 — Drop `Goal` table

**Status:** 0 references in codebase (no API route, service, UI, or seed data)

**Schema change:**
- Remove `model Goal` from `prisma/schema.prisma`

**Code cleanup:** None needed (no references)

**Migration:**
```sql
DROP TABLE IF EXISTS "Goal";
```

### 1.3 — Drop `AuditLog` table

**Status:** 0 references in codebase (no API route, service, UI, or seed data)

**Schema change:**
- Remove `model AuditLog` from `prisma/schema.prisma`

**Code cleanup:** None needed (no references)

**Migration:**
```sql
DROP TABLE IF EXISTS "AuditLog";
```

### 1.4 — Drop `AccountGroup` table + `group_id` from Account

**Status:** No UI for managing groups. `group_id` is always set to `null` in sync. Account API route has `group_id` filter but it's never used from the frontend.

**Schema change:**
- Remove `model AccountGroup` from `prisma/schema.prisma`
- Remove `group_id String?` from `Account` model
- Remove `group AccountGroup? @relation(...)` from `Account` model
- Remove `groups AccountGroup[]` from `User` model
- Remove `@@index([group_id])` from `Account` model

**Code cleanup (5 files):**

| File | What to remove |
|------|---------------|
| `src/services/accountService.ts` | `group_id?` from Account, CreateAccountRequest, UpdateAccountRequest (lines 17, 33, 50) |
| `src/lib/openapi/schemas/accounts.ts` | `group_id` from account schema (line 36), `group_id` query param (line 51) |
| `app/api/v1/accounts/route.ts` | `group_id` filter (lines 21, 35-36), `group_id: data.group_id ?? null` (line 134) |
| `app/api/v1/accounts/[id]/route.ts` | `group_id` validation (line 29), `group_id` update (line 185) |

> **Note:** `src/lib/sync/syncPull.ts` also references `group_id` (lines 144, 471) but that file will be deleted entirely in Phase 3.

**Migration:**
```sql
-- Drop FK constraint first (if exists)
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_group_id_fkey";
-- Drop the column
ALTER TABLE "Account" DROP COLUMN IF EXISTS "group_id";
-- Drop the table
DROP TABLE IF EXISTS "AccountGroup";
```

### 1.5 — Regenerate Prisma Client

```bash
npx prisma generate
```

### 1.6 — Verify

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 warnings

---

## Phase 2 — Drop Unused Columns

### 2.1 — Drop `position` (Json?) from 5 models

**Status:** 0 DB references in codebase. All `position` references in code are CSS classes/properties, not the DB column.

**Schema change:**
- Remove `position Json?` from `Account`, `Category`, `Transaction`, `Transfer`, `Debt`

**Code cleanup:** None needed (no DB references)

**Migration:**
```sql
ALTER TABLE "Account"     DROP COLUMN IF EXISTS "position";
ALTER TABLE "Category"   DROP COLUMN IF EXISTS "position";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "position";
ALTER TABLE "Transfer"   DROP COLUMN IF EXISTS "position";
ALTER TABLE "Debt"       DROP COLUMN IF EXISTS "position";
```

### 2.2 — Drop `credit_limit` and `interest_rate` from Account

**Status:** Used in sync, OpenAPI, backup, and API routes, but no UI input field or display. Never populated with meaningful data.

**Schema change:**
- Remove `credit_limit Decimal?` from `Account`
- Remove `interest_rate Decimal?` from `Account`

**Code cleanup (9 files):**

> **Note:** Files in `src/lib/sync/` (sheetParse, sheetTransform, syncPull) also reference these columns but will be deleted entirely in Phase 3.

| File | What to remove |
|------|---------------|
| `src/services/accountService.ts` | `credit_limit?`, `interest_rate?` from Account interface (lines 12-13) |
| `src/lib/openapi/schemas/accounts.ts` | `credit_limit`, `interest_rate` from account schemas (lines 16-17, 34-35) |
| `src/lib/validation/backupSchemas.ts` | `credit_limit`, `interest_rate` from backup account schema (lines 19-20) |
| `src/types/backup.types.ts` | `credit_limit?`, `interest_rate?` from BackupAccount (lines 55-56) |
| `app/api/v1/accounts/route.ts` | `credit_limit`, `interest_rate` in select (lines 68-69), create (lines 132-133), response (lines 149-150) |
| `app/api/v1/accounts/[id]/route.ts` | validation (lines 27-28), select (lines 103-104), update (lines 183-184), response (lines 206-207) |
| `app/api/v1/backup/export/route.ts` | `credit_limit`, `interest_rate` in export (lines 121-122) |
| `app/api/v1/backup/import/route.ts` | `credit_limit`, `interest_rate` in import (lines 100-101, 121-122, 143-144) |

**Migration:**
```sql
ALTER TABLE "Account" DROP COLUMN IF EXISTS "credit_limit";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "interest_rate";
```

### 2.3 — Drop `reference_number` from Transaction

**Status:** Used in sync, OpenAPI, backup, API routes, and validation, but no UI input field. Never populated with meaningful data.

**Schema change:**
- Remove `reference_number String? @db.VarChar(100)` from `Transaction`

**Code cleanup (8 files):**

> **Note:** Files in `src/lib/sync/` (sheetParse, sheetTransform, syncPull) also reference this column but will be deleted entirely in Phase 3.

| File | What to remove |
|------|---------------|
| `src/lib/openapi/schemas/transactions.ts` | `reference_number` from schema (line 18) |
| `src/lib/validation/backupSchemas.ts` | `reference_number` from backup transaction schema (line 54) |
| `src/lib/validation/transaction.ts` | `reference_number` from create/update validation (lines 17, 35) |
| `src/types/backup.types.ts` | `reference_number?` from BackupTransaction (line 90) |
| `app/api/v1/transactions/route.ts` | `reference_number` in select (line 264), create (line 380), response (line 438) |
| `app/api/v1/transactions/[id]/route.ts` | `reference_number` in select (line 98), update (line 230), response (line 317) |
| `app/api/v1/backup/export/route.ts` | `reference_number` in export (line 154) |
| `app/api/v1/backup/import/route.ts` | `reference_number` in import (lines 458, 479, 501) |

**Migration:**
```sql
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "reference_number";
```

### 2.4 — Drop `is_recurring` from Transaction

**Status:** Used in sync and API GET response, but no UI toggle. The `RecurringTransaction` table itself is also being dropped in Phase 1.

**Schema change:**
- Remove `is_recurring Boolean @default(false)` from `Transaction`

**Code cleanup (2 files):**

> **Note:** Files in `src/lib/sync/` (sheetParse, sheetTransform, syncPull) also reference this column but will be deleted entirely in Phase 3.

| File | What to remove |
|------|---------------|
| `app/api/v1/transactions/[id]/route.ts` | `is_recurring` in response (line 99) |

**Migration:**
```sql
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "is_recurring";
```

### 2.5 — Regenerate Prisma Client

```bash
npx prisma generate
```

### 2.6 — Verify

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 warnings

---

## Phase 3 — Remove Entire Google Sheets Sync Feature

**Rationale:** The Google Sheets sync feature is no longer needed. Google OAuth is only used for Sheets sync (not for login). Removing it eliminates a significant amount of code (sync logic, API routes, UI, OpenAPI schemas, OAuth library) and allows dropping the `SyncHistory` table and 7 sync/OAuth-related columns from the `User` table.

### 3.1 — Delete files (17 files)

**Sync library (5 files):**
| File | Description |
|------|-------------|
| `src/lib/sync/syncPull.ts` | Pull-from-sheets logic |
| `src/lib/sync/syncPush.ts` | Push-to-sheets logic |
| `src/lib/sync/sheetParse.ts` | Parse Google Sheet rows into DB objects |
| `src/lib/sync/sheetTransform.ts` | Transform DB objects into sheet rows |
| `src/lib/sync/googleSheets.ts` | Google Sheets API wrapper class |

**Sync API routes (7 files):**
| File | Description |
|------|-------------|
| `app/api/v1/sync/pull/route.ts` | POST — pull from sheets |
| `app/api/v1/sync/push/route.ts` | POST — push to sheets |
| `app/api/v1/sync/status/route.ts` | GET — sync connection status |
| `app/api/v1/sync/history/route.ts` | GET — sync history |
| `app/api/v1/sync/connect/route.ts` | GET — initiate OAuth flow |
| `app/api/v1/sync/disconnect/route.ts` | POST — revoke OAuth + clear sheet info |
| `app/api/v1/sync/callback/route.ts` | GET — OAuth callback handler |

**Sync UI & OpenAPI (2 files):**
| File | Description |
|------|-------------|
| `app/(app)/settings/sections/GoogleSheetsSection.tsx` | Settings page section for sync |
| `src/lib/openapi/schemas/sync.ts` | OpenAPI schema definitions for sync endpoints |

**Feature barrel (1 file):**
| File | Description |
|------|-------------|
| `src/features/sync/index.ts` | Barrel file that only re-exports `currencyFormatService` |

**Google OAuth library (1 file):**
| File | Description |
|------|-------------|
| `src/lib/auth/google.ts` | Google OAuth logic (authorization URL, token exchange, refresh, revoke). All consumers are sync files being deleted. |

**Sync docs (optional, 3 files):**
| File | Description |
|------|-------------|
| `docs/TODO/google-sheet-sync/GOOGLE_SHEETS_SYNC_SETUP.md` | Setup guide |
| `docs/TODO/google-sheet-sync/GOOGLE_SHEETS_SYNC_SPEC.md` | Spec doc |
| `docs/TODO/google-sheet-sync/GOOGLE_SHEETS_SYNC_TESTING.md` | Testing guide |

### 3.2 — Edit files (4 files)

| File | What to remove |
|------|---------------|
| `app/(app)/settings/sections/index.ts` | Remove `export { GoogleSheetsSection }` (line 9) |
| `app/(app)/settings/page.tsx` | Remove `GoogleSheetsSection` import (line 32), `'google-sheets'` from SectionKey type (line 48), nav item (line 71), section order array (line 98), and render block (line 171) |
| `src/lib/openapi/schemas/index.ts` | Remove `export * from './sync'` (line 13) |
| `.env` and `.env.example` | Remove `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (3 lines each) |

### 3.3 — Schema changes

**Remove from `prisma/schema.prisma`:**
- `model SyncHistory` (entire model)
- From `User` model — 7 columns:
  - `google_access_token String? @db.Text`
  - `google_refresh_token String? @db.Text`
  - `google_token_expires DateTime? @db.Timestamptz`
  - `google_sheet_id String? @db.VarChar(255)`
  - `google_sheet_url String? @db.VarChar(500)`
  - `google_sheet_name String? @db.VarChar(255)`
  - `last_synced_at DateTime? @db.Timestamptz`

### 3.4 — Migration

```sql
-- Drop SyncHistory table
DROP TABLE IF EXISTS "SyncHistory";

-- Remove all Google OAuth + sync columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_access_token";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_refresh_token";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_token_expires";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_id";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_url";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "last_synced_at";
```

### 3.5 — Regenerate Prisma Client

```bash
npx prisma generate
```

### 3.6 — Verify

- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npm run lint` — 0 warnings
- [ ] Settings page renders without Google Sheets section
- [ ] No broken links to `/api/v1/sync/*`

---

## Execution Strategy

- **Phase 1** and **Phase 2** can be done in parallel with subagents (different file groups)
- **Phase 3** (sync removal) can be done in parallel with Phase 1 & 2 since it deletes entire files
- Each phase gets its own migration SQL file
- Commit after each phase
- Run `tsc --noEmit` and `npm run lint` after each phase

### Migration files:
```
prisma/migrations/
  20260624080000_drop_unused_tables/migration.sql       (Phase 1)
  20260624090000_drop_unused_columns/migration.sql      (Phase 2)
  20260624100000_drop_sync_feature/migration.sql        (Phase 3)
```

### Commit plan:
1. `refactor(schema): drop 4 unused tables (RecurringTransaction, Goal, AuditLog, AccountGroup)`
2. `refactor(cleanup): remove group_id references from codebase`
3. `refactor(schema): drop unused columns (position, credit_limit, interest_rate, reference_number, is_recurring)`
4. `refactor(cleanup): remove dropped column references from codebase`
5. `refactor(sync): remove entire Google Sheets sync feature (17 files deleted)`
6. `refactor(schema): drop SyncHistory table and 7 User sync/OAuth columns`
