# Backup Feature Remediation Plan

## Project Context

**Repository:** `etwicaksono/budgetmate` — personal finance management app
**Tech stack:** Next.js 16, React 19, TypeScript 5.9 (strict), Prisma 7, PostgreSQL, Zod, React Bootstrap, SweetAlert2
**Working directory:** `D:\Project\FinanceApp\finance-web`
**Current branch:** `main` (commit `5be9070`)
**Backup branch:** `backup/main-v1` (points to pre-refactor main, for safety)

### How to run

```bash
npm install
npm run db:migrate    # Apply migrations
npm run db:seed       # Seed default data
npm run dev           # Start dev server at http://localhost:3000
npm run validate      # Type-check + lint (run before committing)
```

### Conventions

- **Commit style:** `type: short description` (e.g. `fix: restore checksum verification on backup import`)
- **IDs:** CUID2 via `@paralleldrive/cuid2` — never use raw IDs from backup files
- **Auth:** `requireAuth(request)` returns `{ user: { user_id } }` or `{ error }`
- **API responses:** Success uses `{ success: true, data: {...} }`, errors use `commonErrors` helpers from `@/lib/api/response`
- **Validation:** Zod schemas in `src/lib/validation/`, types in `src/types/`
- **UI:** React Bootstrap + SweetAlert2 for dialogs, settings page at `app/(app)/settings/`

---

## How to Use This Task List

This document is a step-by-step remediation plan for the backup feature. Each actionable item is a checkbox that can be tracked through three states. Work through phases in order (Phase 1 → 6) — later phases may depend on earlier ones.

### Checkbox states

| Marker | Meaning | When to use |
|--------|---------|-------------|
| `- [ ]` | Not started | Default state — item has not been worked on yet |
| `- [~]` | In progress | Agent is actively working on this item (not standard Markdown, but used here for tracking) |
| `- [x]` | Completed | Item is done, verified, and committed |

### Workflow for AI agents

1. **Read this document fully** before starting any work. Understand the project context, backup feature architecture, and all phases.

2. **Work on the current branch** (`main`). Do not create a new branch.

3. **Work on one phase at a time.** Do not skip between phases — later phases may depend on earlier ones (e.g. Phase 5 tests depend on Phase 2 fixes being in place).

4. **Before starting an item**, mark it as in progress:
   ```markdown
   - [~] Update ExportResponse type in src/types/backup.types.ts
   ```

5. **After completing an item**, mark it as done:
   ```markdown
   - [x] Update ExportResponse type in src/types/backup.types.ts
   ```

6. **After completing all items in a phase**, run verification:
   ```bash
   npm run validate      # Type-check + lint
   npm run build         # Build (catches additional errors)
   ```
   If validation fails, fix the errors before moving to the next phase.

7. **Commit after each step** (not after each phase, not after each checkbox). A step is a sub-section like "1.1", "1.2", "2.1", etc. Complete all checkboxes within a step, then commit once:
   ```bash
   git add -A
   git commit -m "fix: [1.1] update ExportResponse type to match raw backup payload"
   ```

8. **If an item cannot be completed** (e.g. blocked by a dependency, requires a decision), leave it as `- [ ]` and add a note below it:
   ```markdown
   - [ ] Update ExportResponse type
     > **Blocked:** Need decision on whether to wrap export response or update type. See Phase 1.1 notes.
   ```

9. **If you discover a new issue** while working, add it to the appropriate phase or create a new phase at the end.

10. **When all phases are complete**, push to main:
    ```bash
    git push origin main
    ```

11. **Move this document to `docs/DONE/`** after all items are completed:
    ```bash
    git mv docs/TODO/backup-feature-remediation.md docs/DONE/backup-feature-remediation.md
    ```

### Handoff between agents

If you are handing off to another agent mid-work:

- Ensure all completed items are marked `- [x]`
- Ensure in-progress items are marked `- [~]` with a note explaining what's been done so far
- Commit the updated task list so the next agent can see the current state
- The next agent should read this document, check which items are still `- [ ]`, and continue from there

---

## Backup Feature Overview

The backup feature lets users export all their financial data as a JSON file and restore it later. It is accessible from **Settings > Backup & Restore**.

### Architecture

```
BackupSection.tsx (UI)
  ↓ calls
backupService.ts (client-side service)
  ↓ calls via apiClient / api
backup/export/route.ts  →  returns raw JSON download
backup/import/route.ts  →  restores data in Prisma transaction
```

### Key files

| File | Role |
|------|------|
| `app/api/v1/backup/export/route.ts` | Server: fetches user data, builds JSON, returns as file download |
| `app/api/v1/backup/import/route.ts` | Server: validates backup JSON, restores in transaction (replace or merge) |
| `src/services/backupService.ts` | Client: `exportData()`, `importData()`, `validateBackupFile()` |
| `src/types/backup.types.ts` | TypeScript interfaces for backup data and API responses |
| `src/lib/validation/backupSchemas.ts` | Zod schemas for backup validation (server-side) |
| `src/lib/openapi/schemas/backup.ts` | OpenAPI route registration for Scalar docs |
| `app/(app)/settings/sections/BackupSection.tsx` | UI: export button, file picker, import mode toggle, progress bar |
| `src/features/backup/index.ts` | Barrel re-export (not the real implementation location) |

### Export JSON structure

```json
{
  "exportVersion": "1.0.0",
  "exportDate": "2026-01-01T00:00:00.000Z",
  "appVersion": "1.0.0",
  "user": {
    "email": "user@example.com",
    "settings": { "timezone": "...", "locale": "...", "date_format": "...", "number_format": "..." }
  },
  "data": {
    "accounts": [],
    "categories": [],
    "transactions": [],
    "transfers": [],
    "labels": [],
    "transactionLabels": []
  },
  "metadata": {
    "totalRecords": 0,
    "checksum": "abc123",          // SHA-256, first 16 chars, of JSON.stringify(data)
    "recordCounts": { "accounts": 0, "categories": 0, "transactions": 0, "transfers": 0, "labels": 0 }
  }
}
```

### Import behavior

- **Replace mode:** Deletes all existing user data (in order: transactionLabels → transactions → transfers → labels → categories → accounts), then creates all new records with new CUID2 IDs. ID mapping tables maintain relationships.
- **Merge mode:** For each entity, checks if an entity with the same backup ID exists under `where: { user_id: userId, id: entity.id }`. If found, updates it. If not, creates with a new CUID2 ID.

### Known issues found during audit

1. Export route returns raw JSON but `ExportResponse` type expects `{ success, data }` wrapper
2. `transactionLabels` exported and imported but missing from `recordCounts` and `ImportResponse` type
3. `currency: "IDR"` hardcoded in export but multi-currency was removed from the project
4. Category `type: 'both'` is silently mapped to `expense` on import
5. Checksum is computed on export but never verified on import
6. No ownership validation — User B can import User A's backup; merge mode creates duplicates because CUID2 IDs never match
7. `backupService.validateBackupFile()` duplicates Zod validation logic manually
8. File is read twice: once in `validateBackupFile()`, once in `importData()`
9. Progress interval in `BackupSection.tsx` may leak on error path
10. No tests for backup export/import
11. `src/features/backup/` is a barrel-only re-export, not the real implementation location

---

## Phase 1 — Type & Schema Contract Alignment (High)

### 1.1 — Fix ExportResponse type mismatch

**Problem:** Export route (`app/api/v1/backup/export/route.ts` line 224) returns the raw backup JSON object directly as the response body. But `ExportResponse` in `src/types/backup.types.ts` (line 122-126) defines `{ success: boolean, data?: BackupData, error?: string }`. The OpenAPI schema in `src/lib/openapi/schemas/backup.ts` (line 17) also says `{ success, data }`. These don't match the actual runtime behavior.

**Decision needed:** The export route returns a file download (with `Content-Disposition: attachment`), not a JSON API response. Wrapping it in `{ success, data }` doesn't make sense for a file download. The correct fix is to update the types and OpenAPI schema to reflect the raw payload.

- [x] Update `ExportResponse` type in `src/types/backup.types.ts` (line 122) to match the raw backup payload shape (exportVersion, exportDate, appVersion, user, data, metadata) — or remove it entirely since the export is a file download, not a typed API response
- [x] Update OpenAPI schema in `src/lib/openapi/schemas/backup.ts` (line 17) to reflect the actual response shape (raw backup JSON, not `{ success, data }`)
- [x] Verify `backupService.exportData()` in `src/services/backupService.ts` (line 34) — it uses `responseType: 'blob'` and doesn't rely on `ExportResponse`, so it should be unaffected
- [x] Run `npm run validate` to confirm no type errors

### 1.2 — Add transactionLabels to recordCounts and ImportResponse

**Problem:** `transactionLabels` are included in the export `data` section and imported on restore, but:
- `metadata.recordCounts` in export route (line 204-210) omits `transactionLabels`
- `ImportResponse` type in `src/types/backup.types.ts` (line 128-141) omits `transactionLabels` from `imported` object
- The import route (line 554) already computes and returns `transactionLabels` count internally, but the type doesn't include it
- `BackupDataSchema` in `src/lib/validation/backupSchemas.ts` (line 111-117) omits `transactionLabels` from `recordCounts`

- [x] Add `transactionLabels: number` to `recordCounts` in `BackupData` type (`src/types/backup.types.ts` line 36-42)
- [x] Add `transactionLabels: number` to `imported` in `ImportResponse` type (`src/types/backup.types.ts` line 132-138)
- [x] Update export route to include `transactionLabels` count in `recordCounts` (`app/api/v1/backup/export/route.ts` line 204-210)
- [x] Update `BackupDataSchema` `recordCounts` to include `transactionLabels` (`src/lib/validation/backupSchemas.ts` line 111-117)
- [x] Update OpenAPI schema if it references recordCounts (`src/lib/openapi/schemas/backup.ts`)
- [x] Update `BackupSection.tsx` success message (line 127-132) to show `transactionLabels` count
- [x] Run `npm run validate` to confirm no type errors

### 1.3 — Remove `currency` from export payload

**Problem:** Export route (`app/api/v1/backup/export/route.ts` line 189) hardcodes `currency: 'IDR'` in `user.settings`, but multi-currency support has been removed from the project. The `BackupUserSettings` type in `src/types/backup.types.ts` (line 18-23) already does NOT include `currency` — it's a phantom field in the runtime that isn't typed. The Zod schema (`backupSchemas.ts` line 93-98) also does not include `currency`.

- [x] Remove `currency: 'IDR'` from export payload in `app/api/v1/backup/export/route.ts` (line 189)
- [x] Verify `BackupUserSettings` type in `src/types/backup.types.ts` does not include `currency` (it already doesn't)
- [x] Verify `BackupDataSchema` in `src/lib/validation/backupSchemas.ts` does not include `currency` (it already doesn't)
- [x] Run `npm run validate` to confirm no type errors

---

## Phase 2 — Import Fidelity & Security (Medium–High)

### 2.1 — Preserve category `type` faithfully

**Problem:** Import route maps `type` using `category.type === 'income' ? CategoryType.income : CategoryType.expense` (appears 4 times: lines 175, 194, 214, 249, 268, 288 in `app/api/v1/backup/import/route.ts`). This silently maps `'both'` to `expense`. The Zod schema (`backupSchemas.ts` line 32) allows `'both'` via `z.union([z.nativeEnum(CategoryType), z.literal('both')])`.

**Note:** Check if `CategoryType` Prisma enum actually has a `both` value. If it does not, the import should still preserve it in the backup data but may need to handle it differently at the DB level. Check `prisma/schema.prisma` for the `CategoryType` enum.

- [x] Check `prisma/schema.prisma` for `CategoryType` enum values — does it include `both`? → No, only `income` and `expense`
- [x] If `both` exists in Prisma enum: update import route to map faithfully (`'income'` → `income`, `'expense'` → `expense`, `'both'` → `both`) → N/A
- [x] If `both` does NOT exist in Prisma enum: update Zod schema to remove `z.literal('both')` from `BackupCategorySchema.type` and update `BackupCategory` type comment
- [x] Update all 6 occurrences of the ternary mapping in `app/api/v1/backup/import/route.ts` (search for `=== 'income' ? CategoryType.income : CategoryType.expense`) → No change needed, mapping is already correct since `both` is not a valid Prisma enum value
- [x] Run `npm run validate` to confirm no type errors

### 2.2 — Verify checksum on import

**Problem:** Export route computes `metadata.checksum` using `generateChecksum()` (line 203, 237-241) which does `SHA-256` of `JSON.stringify(data)` and takes the first 16 hex chars. Import route never verifies this checksum.

- [x] Import `crypto` in `app/api/v1/backup/import/route.ts` (already imported in export route, same Node.js built-in)
- [x] After `BackupDataSchema.safeParse()` succeeds (line 38-51), compute checksum of `backupData.data` using the same algorithm: `crypto.createHash('sha256').update(JSON.stringify(backupData.data)).digest('hex').substring(0, 16)`
- [x] Compare computed checksum against `backupData.metadata.checksum`
- [x] If mismatch, return `400` with error: "Backup file checksum mismatch — data may be corrupted"
- [x] If `checksum` field is missing or empty (e.g. older backup format), log `console.warn('Backup file has no checksum, skipping verification')` and proceed
- [ ] Test: manually corrupt a backup JSON file and verify import returns 400

### 2.3 — Validate backup ownership for merge mode

**Problem:** Merge mode checks for existing records by ID only (`where: { user_id: userId, id: entity.id }`). Since IDs are CUID2, User A's backup IDs will never match User B's existing records — every entity is created as a new record, resulting in duplicate accounts, categories, labels, and transactions. There is no validation that the backup belongs to the importing user.

**Implementation:**
- Server-side: fetch the authenticated user's email from the database, compare with `backupData.user.email`
- Client-side: show a warning dialog if emails don't match, before the user confirms import

- [x] In `app/api/v1/backup/import/route.ts`, after getting `userId` (line 27), fetch the user's email: `const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })`
- [x] After `BackupDataSchema.safeParse()` succeeds (line 51), compare `backupData.user.email` with `userRecord?.email`
- [x] If emails don't match AND mode is `merge`: return `403` with `{ success: false, error: "Merge mode can only be used with your own backup file" }`
- [x] If emails don't match AND mode is `replace`: allow the import but add a `warning` field to the success response: `{ success: true, data: { ..., warning: "Restored data from a different account" } }`
- [x] In `src/services/backupService.ts`, update `validateBackupFile()` (line 124-197) to include the backup's user email in the return (it already does this at line 183: `user: { email: data.user.email }`)
- [x] In `app/(app)/settings/sections/BackupSection.tsx`, in `handleImport()` (line 86), before the existing Swal confirmation (line 90-103), check if `fileValidation.details?.user.email` matches the logged-in user's email
- [x] To get the logged-in user's email in `BackupSection.tsx`: import `useAuth` from `@/context/AuthContext` (check the existing context API) and access `user.email`
- [x] If emails don't match, show an additional Swal warning dialog: "This backup file belongs to **{backupEmail}**. Your current account is **{currentUserEmail}**. Continue?" with cancel option
- [x] Run `npm run validate` to confirm no type errors

---

## Phase 3 — Client-Side Validation Hardening (Medium)

### 3.1 — Reuse Zod schema in backupService.validateBackupFile

**Problem:** `backupService.validateBackupFile()` in `src/services/backupService.ts` (lines 124-197) manually checks: file size, extension, JSON parse, required fields (`exportVersion`, `data`, `exportDate`), and version compatibility. The Zod schema `BackupDataSchema` in `src/lib/validation/backupSchemas.ts` already validates all of these (and more) via `safeParse()`. Two sources of truth.

- [x] In `src/services/backupService.ts`, import `BackupDataSchema` and `isVersionCompatible` from `src/lib/validation/backupSchemas.ts`
- [x] Keep the file-level checks (size, extension) as-is (lines 127-141)
- [x] Keep the JSON parse (lines 143-154)
- [x] Replace the manual required-fields check (lines 156-162) with `BackupDataSchema.safeParse(data)`
- [x] If `safeParse` fails, return `{ valid: false, error: 'Invalid backup file: ' + first Zod error message }`
- [x] If `safeParse` succeeds, use the parsed data (which is now fully typed) for the return `data` field
- [x] Replace the manual version compatibility check (lines 164-172) with the imported `isVersionCompatible()` function
- [x] Remove the `isVersionCompatible` method from the `BackupService` class (lines 205-213) — use the imported one instead
- [x] Verify `BackupSection.tsx` still receives the same `ValidateResponse` shape
- [x] Run `npm run validate` to confirm no type errors

### 3.2 — Avoid double-reading the backup file

**Problem:** `BackupSection.tsx` calls `validateBackupFile(file)` (line 58) which reads the file via `file.text()` (line 144). Then `importData(selectedFile, importMode)` (line 115) reads the file again via `file.text()` (line 88 in backupService.ts). For large backups this is wasteful.

- [x] Update `validateBackupFile()` return type to include the parsed data object (it already returns `data` in the `ValidateResponse` at line 176 — verify this is the parsed `BackupData`)
- [x] Update `importData()` method signature in `src/services/backupService.ts` (line 85) to accept either `File` or pre-parsed `BackupData`: `async importData(fileOrData: File | BackupData, mode: ImportMode = 'replace')`
- [x] If `fileOrData` is a `File`, read and parse it (existing behavior)
- [x] If `fileOrData` is already `BackupData`, skip reading and use it directly
- [x] In `BackupSection.tsx` `handleImport()` (line 115), pass `fileValidation.data` instead of `selectedFile`: `await backupService.importData(fileValidation.data!, importMode)`
- [x] Remove the redundant `validateBackupFile()` call inside `importData()` (lines 92-95) since validation is now done before calling `importData()`
- [x] Run `npm run validate` to confirm no type errors

---

## Phase 4 — UI Bug Fix (Low)

### 4.1 — Fix progress interval cleanup in BackupSection

**Problem:** In `BackupSection.tsx` `handleImport()` (lines 109-165), `setInterval` is created at line 111 and cleared at line 117 (after `importData` succeeds). But if `importData` throws (line 151 catch block), the interval is never cleared — it keeps running until the component unmounts or the page refreshes.

- [x] In `BackupSection.tsx` `handleImport()`, move the `setInterval` declaration above the `try` block (or use a `let` variable declared before `try`)
- [x] In the `catch` block (line 151), add `clearInterval(progressInterval)` before the error handling
- [x] Alternatively, move `clearInterval` to a `finally` block — but note the `finally` block (line 163) only sets `setIsImporting(false)`, so add `clearInterval` there
- [x] Best approach: declare `let progressInterval: ReturnType<typeof setInterval> | null = null` before `try`, set it inside `try`, and clear it in `finally`:
  ```ts
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  try {
    progressInterval = setInterval(...);
    const result = await backupService.importData(...);
    // ...
  } catch (error) {
    // ...
  } finally {
    if (progressInterval) clearInterval(progressInterval);
    setIsImporting(false);
  }
  ```
- [x] Test: trigger an import error (e.g. use an invalid backup file that passes client validation but fails server-side) and verify the progress bar stops animating — done as part of step 2.3 rewrite

---

## Phase 5 — Test Coverage (Low)

### 5.1 — Add backup API route tests

- [x] Create `app/api/v1/backup/export/route.test.ts`
- [x] Test: authenticated GET returns 200 with `Content-Type: application/json`
- [x] Test: response body has `exportVersion`, `data`, `metadata` fields
- [x] Test: `data` includes `accounts`, `categories`, `transactions`, `transfers`, `labels`, `transactionLabels` arrays
- [x] Test: unauthenticated GET returns 401
- [x] Create `app/api/v1/backup/import/route.test.ts`
- [x] Test: replace mode with valid backup — deletes existing data, creates new records, returns 200 with counts
- [x] Test: merge mode with valid backup — updates existing records by ID, creates new for unknown IDs
- [x] Test: invalid backup format (missing required fields) returns 400
- [x] Test: checksum mismatch returns 400 (requires Phase 2.2 to be complete)
- [x] Test: merge mode with mismatched email returns 403 (requires Phase 2.3 to be complete)

### 5.2 — Add backupService unit tests

- [x] Create `src/services/backupService.test.ts`
- [x] Test: `exportData()` calls `apiClient.get('/backup/export?timestamp=...')` with `responseType: 'blob'`
- [x] Test: `validateBackupFile()` accepts a valid backup file (correct extension, valid JSON, all required fields)
- [x] Test: `validateBackupFile()` rejects: wrong extension, file too large, malformed JSON, missing required fields
- [x] Test: `importData()` calls `api.post('/backup/import?mode=...')` with the parsed backup data as body

---

## Phase 6 — Feature Module Cleanup (Low)

### 6.1 — Consolidate backup feature module

**Problem:** `src/features/backup/index.ts` is a barrel re-export of `backupService` and backup types. The actual service lives in `src/services/backupService.ts`. No code imports from `@/features/backup` — the UI imports directly from `@/services/backupService`.

- [x] Search for any imports from `@/features/backup` across the codebase: `grep -r "features/backup" src/ app/` → No imports found
- [x] If no imports found: delete `src/features/backup/` directory entirely
- [x] If imports found: update them to `@/services/backupService` and `@/types/backup.types`, then delete the directory → N/A
- [x] Run `npm run validate` to confirm no type errors

---

## Summary

| Phase | Issue | Severity | Effort | Items |
|-------|-------|----------|--------|-------|
| 1.1 | ExportResponse type mismatch | High | Small | 4 |
| 1.2 | transactionLabels missing from counts/types | High | Small | 7 |
| 1.3 | Remove leftover currency from export | High | Small | 4 |
| 2.1 | Category type 'both' lost on import | Medium | Small | 5 |
| 2.2 | No checksum verification on import | Medium | Medium | 6 |
| 2.3 | No backup ownership validation for merge mode | High | Medium | 8 |
| 3.1 | Duplicate validation logic | Medium | Small | 8 |
| 3.2 | Double file read | Medium | Small | 6 |
| 4.1 | Progress interval cleanup bug | Low | Small | 5 |
| 5.1 | No API route tests | Low | Medium | 10 |
| 5.2 | No service unit tests | Low | Medium | 5 |
| 6.1 | Feature module ambiguity | Low | Small | 4 |

**Total: 72 actionable items across 12 issues.**

---

## Out of Scope — Separate TODO

### Remove `is_system` field from Category model

The `is_system` flag on categories is no longer needed. All categories are user-managed. This field should be removed from the schema, API, and types. This is a separate task from the backup remediation but will simplify the backup code once done.

- [ ] Remove `is_system` field from `Category` model in `prisma/schema.prisma`
- [ ] Remove `is_system` from create/update handlers in `app/api/v1/categories/` routes
- [ ] Remove `is_system` from `src/services/categoryService.ts`
- [ ] Remove `is_system` from category types in `src/types/`
- [ ] Remove `is_system` from seed data in `prisma/seed.ts`
- [ ] Remove `is_system` from export payload in `app/api/v1/backup/export/route.ts` (line 136)
- [ ] Remove `is_system` from import logic in `app/api/v1/backup/import/route.ts` (search for `is_system: false` — appears 6 times)
- [ ] Remove `is_system` from `BackupCategorySchema` in `src/lib/validation/backupSchemas.ts` (line 36)
- [ ] Remove `is_system` from `BackupCategory` type in `src/types/backup.types.ts` (line 71)
- [ ] Create Prisma migration: `npx prisma migrate dev --name remove_is_system_from_category`
- [ ] Run `npm run validate` to confirm no type errors
- [ ] Run `npm run db:seed` to verify seed works without `is_system`
