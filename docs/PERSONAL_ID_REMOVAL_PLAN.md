# Personal ID Removal Plan

## 1. Objective
Remove the `personal_id` field from all entities (`Account`, `Category`, `Transaction`, `Transfer`, `Label`) across the full application stack (Database, Backend APIs, Frontend, and Sync Services) to simplify data architecture and eliminate race conditions/locking requirements when generating new records. 

Below is the comprehensive strategy covering all 43 files identified in the codebase.

## 2. Database Schema & Migrations
Files affected:
1. `prisma/schema.prisma`
2. `prisma/migrations/20251121201137_init_with_cuid/migration.sql` (Reference only - do not modify historical migrations)
3. `prisma/migrations/20260103205658_add_code_field_for_simplified_sync/migration.sql` (Reference only)

**Strategy:**
- **Fields to Remove:** Delete the `personal_id BigInt` field from `Account`, `Category`, `Transaction`, `Transfer`, and `Label` models.
- **Constraints to Remove:** Delete the compound unique constraints: `@@unique([user_id, personal_id])` in all aforementioned models.
- **Documentation Comments:** Update `Account` and `Category` models: Change `code String? // Format: "Name::PersonalID"` to `code String? // Format: "Name::ID"`.
- **Migration Generation:** Run `npx prisma migrate dev --name remove_personal_id` after making schema changes.

## 3. Core Logic & Utilities to Delete
Files affected:
4. `src/lib/db/sequence.ts`
5. `app/api/v1/personal-ids/max/route.ts`

**Strategy:**
- **Sequence Service:** Delete `src/lib/db/sequence.ts` entirely. This service is no longer needed since we won't generate sequential personal IDs.
- **Max ID Route:** Delete the `app/api/v1/personal-ids/max/route.ts` file as it's no longer necessary.

## 4. Backend API Route Updates (`app/api/v1/*`)
Files affected:
6. `app/api/v1/accounts/route.ts`
7. `app/api/v1/accounts/[id]/route.ts`
8. `app/api/v1/analytics/balance-trend/route.ts`
9. `app/api/v1/auth/register/route.ts`
10. `app/api/v1/categories/route.ts`
11. `app/api/v1/categories/[id]/route.ts`
12. `app/api/v1/categories/tree/route.ts`
13. `app/api/v1/labels/route.ts`
14. `app/api/v1/labels/[id]/route.ts`
15. `app/api/v1/transactions/route.ts`
16. `app/api/v1/transactions/[id]/route.ts`
17. `app/api/v1/transfers/route.ts`
18. `app/api/v1/transfers/[id]/route.ts`

**Strategy:**
- **Removal from Queries:** Remove all references to `personal_id` in `select`, `where`, and `data` (insert/update) payloads across all CRUD routes.
- **Ordering Adjustments:** Change any `orderBy: { personal_id: 'asc' }` or `'desc'` to use `created_at` or another relevant field (like `name` for accounts/categories, and `date` for transactions/transfers).
- **Tree Structures:** In `categories/tree/route.ts`, remove `personal_id` sorting logic (`nodes.sort((a, b) => a.personal_id - b.personal_id)`) and sort by `name` or `created_at` instead.
- **Payload Mapping:** Remove `personal_id` from the mapped JSON responses in all route handlers (e.g., `personal_id: Number(account.personal_id)`).
- **Registration Seed:** In `auth/register/route.ts`, remove all `personal_id` assignments when seeding the default categories and accounts for a new user.

## 5. Google Sheets Sync & Backup Adjustments
Files affected:
19. `app/api/v1/backup/export/route.ts`
20. `app/api/v1/backup/import/route.ts`
21. `src/lib/services/sheetParse.ts`
22. `src/lib/services/sheetTransform.ts`
23. `src/lib/services/syncPull.ts`
24. `src/lib/services/syncPush.ts`
25. `src/lib/validation/backupSchemas.ts`

**Strategy:**
- **Google Sheets Sync (`sheetParse.ts`, `sheetTransform.ts`, `syncPull.ts`, `syncPush.ts`):**
  - Remove `personal_id` references heavily used to correlate records.
  - Rely on the primary `id` (CUID) or `code` for deduplication and matching during `syncPull`.
  - Update `code` parsing: Instead of parsing `Name::PersonalID` and looking up by number, parse `Name::ID` and lookup by `id`. Update transforms to generate `code` as `${name}::${id}`.
- **Backup Export/Import (`export/route.ts` & `import/route.ts`):**
  - Remove `personal_id` from the exported JSON queries and structure.
  - In Import logic, completely remove the `getNextPersonalId` methods and the logic that checks for existing records by `personal_id`. Match incoming records by `id` (if replacing) or generate a new CUID via `createId()` for merged records.
- **Validation Schemas (`backupSchemas.ts`):** Remove `personal_id: z.number().int().positive()` from all Zod validation schemas.

## 6. Frontend Service & Type Definitions
Files affected:
26. `src/services/accountService.ts`
27. `src/services/budgetService.ts`
28. `src/services/categoryService.ts`
29. `src/services/labelService.ts`
30. `src/services/transactionService.ts`
31. `src/services/transferService.ts`
32. `src/types/backup.types.ts`

**Strategy:**
- **Type Definitions:** Remove `personal_id` from all frontend interfaces and DTOs (e.g., `CreateAccountRequest`, `CreateTransactionRequest`).
- **Endpoint Params:** Remove `personal_id` assignments being passed into service methods. Pay special attention to `swapAccountOrder` and `reorderCategories` functions which relied on passing `personal_id` to persist sorting.

## 7. Frontend State & UI Components
Files affected:
33. `app/(app)/accounts/page.tsx`
34. `src/components/transaction/TransactionModal.tsx`
35. `src/components/transactions/GlobalTransactionModal.tsx`
36. `src/context/TransactionModalContext.tsx`
37. `src/hooks/useAccountModal.ts`
38. `src/hooks/useFilterData.ts`

**Strategy:**
- **Data Hook Adjustments:** Update UI logic that relied on `personal_id` for sorting. For example, in `accounts/page.tsx` (`[...relevantAccounts].sort((a, b) => a.personal_id - b.personal_id)`), switch to sorting by `created_at`, `name`, or array index mapping (`position` field if it exists).
- **Remove Defaults:** Remove setting `personal_id: Date.now()` or `0` as dummy data in state initialization arrays, forms, and contexts (`GlobalTransactionModal.tsx`, `TransactionModal.tsx`, `useFilterData.ts`, `useAccountModal.ts`, `TransactionModalContext.tsx`).
- **Reordering UI:** Refactor UI drag-and-drop actions in `accounts/page.tsx` that iterated to update `personal_id` for siblings (`account.personal_id = index + 1`). This behavior may need to map to a new `position` integer field instead or be removed if manual sorting is deprecated.

## 8. Seed, Mock Data & Scripts
Files affected:
39. `prisma/fix-transaction-amounts.sql`
40. `prisma/seed.ts`
41. `scripts/fix-transaction-amounts.ts`
42. `src/data/default_accounts.json`
43. `src/services/mockData.ts`

**Strategy:**
- **Seeds (`prisma/seed.ts`):** Remove all logic tracking and sequentially assigning `personal_id`.
- **Mock Data (`mockData.ts` & `default_accounts.json`):** Delete all instances of `"personal_id": ...` in mock datasets.
- **Maintenance Scripts (`fix-transaction-amounts.*`):** Remove `personal_id` from the SQL projections and TypeScript mappings within these standalone maintenance scripts.

## Action Plan Phases
1. **Phase 1: Database & Seed Adjustments** (Schema update, generation, DB scripts, default data).
2. **Phase 2: Core API & Type Cleanup** (Core API route refactoring, redundant route deletion, type definition updates).
3. **Phase 3: UI & Context Cleanup** (Frontend modal logic, sorting views to rely on dates/names instead of personal_ids).
4. **Phase 4: Sync & Backup Refactoring** (Fix Google Sheet Sync and Backup mechanisms to rely purely on `id`/`code`).
5. **Phase 5: Testing & Verification** (Run application, verify forms, verify backups, verify sheet sync).
