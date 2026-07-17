# Remove `is_system` from Category Table

## Background

The `is_system` boolean field on the `Category` model was originally used to mark seeded/default categories as protected — they display a "System" badge in the UI and cannot be deleted. However, the field is no longer needed because:

1. The import route already forces `is_system: false` on all imported categories, breaking the original intent
2. The field adds complexity to backup export/import, API schemas, and validation
3. All categories should be user-managed — users should be able to delete any category they don't need

## Decision: No Replacement Marker

Default categories created during registration/seed will no longer be distinguishable from user-created categories. This is acceptable because:
- Users can delete any category they don't want
- Users can recreate categories if needed
- The `created_by` field still tracks who created the category (null for system-seeded)

## Files Affected (16 files)

| # | File | Usage |
|---|------|-------|
| 1 | `prisma/schema.prisma` | Column definition |
| 2 | `prisma/seed.ts` | Seeds with `is_system: true` |
| 3 | `app/api/v1/auth/register/route.ts` | Default categories with `is_system: true` |
| 4 | `app/api/v1/categories/route.ts` | Filter, response, create |
| 5 | `app/api/v1/categories/[id]/route.ts` | Response, delete protection |
| 6 | `app/api/v1/categories/tree/route.ts` | Tree node interface & response |
| 7 | `app/api/v1/backup/export/route.ts` | Export field |
| 8 | `app/api/v1/backup/import/route.ts` | Import validation & create |
| 9 | `src/lib/validation/backupSchemas.ts` | Zod backup schema |
| 10 | `src/lib/validation/category.ts` | Zod filter schema |
| 11 | `src/lib/openapi/schemas/categories.ts` | OpenAPI schema |
| 12 | `src/services/categoryService.ts` | Type & filter |
| 13 | `src/types/backup.types.ts` | BackupCategory type |
| 14 | `src/components/category/CategoryTreeView.tsx` | Badge & delete guard |
| 15 | `src/hooks/useFilterData.ts` | Mock category object |
| 16 | `app/(app)/budgets/_components/budget-table/hooks/useBudgetGridData.ts` | Mock category object |

---

## Phase 1 — Schema & Migration

### 1.1 — Remove `is_system` from Prisma schema

- [x] Remove `is_system Boolean @default(false)` from `Category` model in `prisma/schema.prisma`
- [x] Create migration: `npx prisma migrate dev --name remove_category_is_system`
- [x] Verify migration drops the column

### 1.2 — Remove `is_system` from seed data

- [x] Remove `is_system: true` from all category create calls in `prisma/seed.ts` (3 occurrences)

---

## Phase 2 — API Routes

### 2.1 — Categories list route (`app/api/v1/categories/route.ts`)

- [x] Remove `is_system` filter from GET handler (`where['is_system'] = filters.is_system`)
- [x] Remove `is_system` from response objects in GET and POST
- [x] Remove `is_system: false` from POST create handler

### 2.2 — Category by ID route (`app/api/v1/categories/[id]/route.ts`)

- [x] Remove `is_system` from `Category` interface
- [x] Remove `is_system` from GET response
- [x] Remove `is_system` from PUT response
- [x] Remove delete protection logic: `if (existingCategory.is_system && !existingCategory.created_by)` — all categories are now deletable
- [x] Remove the comment about `is_system` flag

### 2.3 — Category tree route (`app/api/v1/categories/tree/route.ts`)

- [x] Remove `is_system` from `CategoryNode` interface
- [x] Remove `is_system` from all tree node objects (root and child categories)
- [x] Remove `is_system: false` from all new category creation in tree route

### 2.4 — Auth register route (`app/api/v1/auth/register/route.ts`)

- [x] Remove `is_system: true` from all default category create calls

---

## Phase 3 — Validation & Schemas

### 3.1 — Zod backup schema (`src/lib/validation/backupSchemas.ts`)

- [x] Remove `is_system: z.boolean()` from `BackupCategorySchema`
- [x] Consider backward compatibility: old backups with `is_system` should still import (use `.passthrough()` or strip unknown keys)

### 3.2 — Zod category filter schema (`src/lib/validation/category.ts`)

- [x] Remove `is_system: z.coerce.boolean().optional()` from `CategoryFilterSchema`

### 3.3 — OpenAPI schema (`src/lib/openapi/schemas/categories.ts`)

- [x] Remove `is_system: z.boolean().openapi({ example: false })` from `CategorySchema`
- [x] Remove `is_system` query parameter from OpenAPI registration

---

## Phase 4 — Service & Types

### 4.1 — Category service (`src/services/categoryService.ts`)

- [x] Remove `is_system: boolean` from `Category` interface
- [x] Remove `is_system?: boolean` from `CategoryFilters` interface
- [x] Remove `is_system` filter serialization in `fetchCategories()`

### 4.2 — Backup types (`src/types/backup.types.ts`)

- [x] Remove `is_system: boolean` from `BackupCategory` interface

---

## Phase 5 — Backup Export/Import

### 5.1 — Export route (`app/api/v1/backup/export/route.ts`)

- [x] Remove `is_system` from the sanitized category mapping in export

### 5.2 — Import route (`app/api/v1/backup/import/route.ts`)

- [x] Remove `is_system: false` from all category create/update calls
- [x] Remove `is_system` from the `force is_system: false` comments
- [x] Old backups with `is_system` in the data should still import successfully (Zod schema should strip unknown keys or use `.passthrough()`)

---

## Phase 6 — UI & Hooks

### 6.1 — CategoryTreeView (`src/components/category/CategoryTreeView.tsx`)

- [x] Remove the "System" badge rendering: `{node.is_system && (...)}`
- [x] Remove `disabled={node.is_system}` from the delete button

### 6.2 — useFilterData hook (`src/hooks/useFilterData.ts`)

- [x] Remove `is_system: false` from the fabricated category object

### 6.3 — useBudgetGridData hook (`app/(app)/budgets/_components/budget-table/hooks/useBudgetGridData.ts`)

- [x] Remove `is_system: false` from the mock summary row category object

---

## Phase 7 — Verification

- [x] Run `npm run validate` (type-check + lint)
- [x] Run `npx prisma migrate dev` to verify migration
- [ ] Run `npx prisma db seed` to verify seed works (pre-existing issue with PrismaClient initialization)
- [ ] Test: register a new user → default categories created without `is_system`
- [ ] Test: list categories → no `is_system` in response
- [ ] Test: delete a default category → should succeed (no protection)
- [ ] Test: export backup → no `is_system` in output
- [ ] Test: import old backup (with `is_system`) → should succeed (field stripped/ignored)
- [ ] Test: category tree → no "System" badge, delete enabled for all

---

## Summary

| Phase | Description | Files | Effort |
|-------|-------------|-------|--------|
| 1 | Schema & Migration | 2 | Small |
| 2 | API Routes | 4 | Medium |
| 3 | Validation & Schemas | 3 | Small |
| 4 | Service & Types | 2 | Small |
| 5 | Backup Export/Import | 2 | Small |
| 6 | UI & Hooks | 3 | Small |
| 7 | Verification | — | Small |
