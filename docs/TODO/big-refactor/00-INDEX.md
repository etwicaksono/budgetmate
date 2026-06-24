# Big Refactor — Index & Roadmap

> **Goal:** Scalable, high performance, readable, maintainable, best practice code.

## Overview

Full codebase review of 275 TypeScript/TSX files across 7 packages. Each package has a detailed TODO document with line-specific findings, refactor actions, and priorities.

| # | Document | Scope | Files Reviewed |
|---|----------|-------|----------------|
| 01 | [API Routes](./01-api-routes.md) | `app/api/` | 41 route files |
| 02 | [Services](./02-services.md) | `src/services/` | 13 service files |
| 03 | [Hooks](./03-hooks.md) | `src/hooks/` | 13 hook files |
| 04 | [Components](./04-components.md) | `src/components/` | ~100 component files |
| 05 | [Pages](./05-pages.md) | `app/(app)/`, `app/(auth)/` | ~35 page files |
| 06 | [Lib/Utils/Types/Contexts](./06-lib-utils-types-contexts.md) | `src/lib/`, `src/utils/`, `src/config/`, `src/types/`, `src/context/` | ~60 files |
| 07 | [Schema & Config](./07-schema-config.md) | `prisma/`, `scripts/`, config files | ~10 files |

---

## Top Cross-Cutting Issues

These issues span multiple packages and should be addressed first:

### 1. No Single Source of Truth for Domain Types & Enums
Transaction types, debt statuses, account types, and API response shapes are defined independently in:
- `src/utils/constants.ts` (string constants)
- `src/lib/validation/*` (Zod schemas)
- `src/lib/openapi/schemas/*` (OpenAPI schemas)
- `src/types/*` (TypeScript types)
- `prisma/schema.prisma` (String fields, not enums)

**Fix:** Define enums in Prisma schema, generate TypeScript types from Prisma, derive validation schemas and OpenAPI schemas from the same source.

### 2. Duplicated Utility Files
Five pairs of duplicate files exist as re-export wrappers:
- `src/utils/transferUtils.ts` ↔ `src/utils/transactions/transferUtils.ts`
- `src/utils/formatters.ts` ↔ `src/utils/formatting/formatters.ts`
- `src/utils/timezone.ts` ↔ `src/utils/formatting/timezone.ts`
- `src/utils/iconResolver.tsx` ↔ `src/utils/icons/iconResolver.tsx`
- `src/utils/iconUtils.ts` ↔ `src/utils/icons/iconUtils.ts`
- `src/utils/crypto.ts` ↔ `src/utils/auth/crypto.ts`

**Fix:** Consolidate to one location, update all imports, delete the duplicates.

### 3. Duplicated Transaction Grouping Logic
`transactions/page.tsx` and `accounts/[id]/page.tsx` have ~80 lines of identical transaction-to-record mapping and date grouping logic.

**Fix:** Extract to a shared `useTransactionRecords` hook or `normalizeTransactions` utility.

### 4. Window Event Bus is Untyped and Inconsistent
Multiple components communicate via `window.dispatchEvent(new CustomEvent(...))` with different event names and payload shapes:
- `account-created`, `account-updated`
- `transaction-created`, `transaction-updated`, `transaction-deleted`
- `debt-created`, `debt-updated`, `debt-deleted`, `debt-mutated`

**Fix:** Replace with a typed event emitter or a state management solution (Zustand, Jotai, or React context with reducer).

### 5. API Routes Have Too Much Inline Logic
Route handlers combine auth, validation, query construction, business rules, serialization, and error translation. Multi-step mutations (transaction+labels, backup import) are not atomic.

**Fix:** Extract domain logic into service layer. Routes should be thin adapters: parse request → call service → format response.

### 6. Context Providers Are Too Broad
`AuthContext`, `TransactionContext`, `TransactionModalContext`, `DebtContext` mix state, I/O, and UI concerns. This causes unnecessary re-renders and makes testing hard.

**Fix:** Split contexts by responsibility (state vs actions vs modal state). Consider splitting AuthContext into AuthStateContext (reads) and AuthActionsContext (writes).

### 7. Pervasive Inline Styling
Many components use inline `style={{}}` objects instead of CSS classes. This hurts performance (new object on every render), readability, and theming.

**Fix:** Extract repeated inline styles to CSS modules or a design token system.

### 8. Repeated Modal/Dropdown/Select Patterns
5+ modals share the same shell pattern (init state, validate, submit, spinner, footer). 4+ dropdowns share the same option/menu pattern.

**Fix:** Extract a `ModalShell` component and a `DropdownField` primitive.

---

## Recommended Refactor Phases

### Phase 1: Foundation (High Priority)
**Target:** Schema, types, and shared infrastructure

1. **Prisma schema**: Add enums for all closed-set fields (transaction type, account type, debt status, etc.). Fix missing relations. Remove redundant indexes.
2. **Consolidate duplicate files**: Delete re-export wrappers, keep one canonical copy.
3. **Single source of truth for types**: Generate from Prisma, derive validation + OpenAPI.
4. **Fix config issues**: Move TypeScript types to devDependencies, separate build from migrations, fix CORS, enable reactStrictMode.

### Phase 2: API Layer (High Priority)
**Target:** `app/api/` routes

1. **Extract shared helpers**: Prisma error mapper, auth+validation wrapper, date bucketing utility.
2. **Move business logic to services**: Routes should only parse request → call service → format response.
3. **Fix atomicity bugs**: Wrap multi-step mutations in Prisma transactions (transaction+labels, backup import).
4. **Remove debug logging**: Strip `console.log` debug statements from production code.
5. **Standardize error responses**: Use `errorResponse()` everywhere, including `user/settings`.

### Phase 3: Service Layer (High Priority)
**Target:** `src/services/`

1. **Unify API client**: Use one client (`api.ts`) everywhere. Remove raw `axios` calls.
2. **Fix refresh token race**: Implement single-flight refresh in the API client.
3. **Add typed service base**: Generic CRUD service pattern to reduce boilerplate.
4. **Fix currency formatter bugs**: Correct sign handling and formatting logic.
5. **Standardize query serialization**: One helper for building query strings.

### Phase 4: State Management (Medium Priority)
**Target:** `src/hooks/`, `src/context/`

1. **Replace window event bus**: Typed event emitter or state management library.
2. **Split oversized hooks**: `useFilterData` (filter state + fetch + pagination), `useTransactionActions` (edit + delete + clone), `useTransactionForm` (validation + state + submit).
3. **Deduplicate auth hooks**: Merge `useLogin` + `useRegister` patterns.
4. **Split broad contexts**: Separate state from actions. Narrow provider scope.
5. **Add error states**: All async hooks should expose `error` state.

### Phase 5: Components (Medium Priority)
**Target:** `src/components/`

1. **Extract shared primitives**: `ModalShell`, `DropdownField`, `SelectField`, `LoadingSkeleton`.
2. **Split large components**: `TransactionModal`, `BudgetConfigModal`, `AIChatPanel`, `IncomesExpensesReport`, `RecordsList`.
3. **Move inline styles to CSS**: Extract repeated inline styles to CSS modules.
4. **Accessibility pass**: Semantic HTML, ARIA attributes, keyboard navigation for custom dropdowns.
5. **Add React.memo**: For expensive list items and chart components.

### Phase 6: Pages (Medium Priority)
**Target:** `app/(app)/`, `app/(auth)/`

1. **Extract shared transaction logic**: `normalizeTransactions` utility used by both `transactions/page.tsx` and `accounts/[id]/page.tsx`.
2. **Split dashboard orchestration**: Move data fetching to `useDashboardData` hook.
3. **Move budget calculations**: Pure helpers for roll-up, sort, search.
4. **Narrow analytics filter state**: Only pass what the sidebar uses.
5. **Clean up placeholder UI**: Remove dead/commented code in auth pages and settings.

### Phase 7: Cleanup (Low Priority)
**Target:** Scripts, dead code, documentation

1. **Remove stale scripts**: `check-balance-data.ts`, `test-balance-api.ts` (one-off utilities).
2. **Squash migrations**: After schema stabilizes, create a fresh baseline migration.
3. **Remove dead code**: Unused exports, commented-out code, placeholder sections.
4. **Add JSDoc**: Document public APIs, service methods, and complex utilities.
5. **Add tests**: Unit tests for extracted utilities, integration tests for API routes.

---

## Priority Matrix

| Priority | Issue | Package(s) | Effort |
|----------|-------|-------------|--------|
| **P0** | Transaction label update not atomic | API Routes | Small |
| **P0** | Backup import can lose labels | API Routes, Services | Medium |
| **P0** | CORS config is invalid/unsafe | Config | Small |
| **P0** | JWT secret has hardcoded fallback | Lib/Auth | Small |
| **P1** | No Prisma enums (string fields) | Schema | Medium |
| **P1** | Duplicated utility files | Utils | Small |
| **P1** | API routes too fat | API Routes | Large |
| **P1** | Refresh token race condition | Services | Medium |
| **P1** | Window event bus untyped | Hooks, Components | Medium |
| **P2** | Duplicated transaction grouping | Pages | Small |
| **P2** | Context providers too broad | Contexts | Medium |
| **P2** | Inline styling everywhere | Components | Large |
| **P2** | Modal/dropdown duplication | Components | Medium |
| **P2** | Oversized hooks | Hooks | Medium |
| **P3** | Stale scripts | Scripts | Small |
| **P3** | Squash migrations | Schema | Small |
| **P3** | Accessibility gaps | Components | Medium |
| **P3** | Dead code / placeholder UI | Pages | Small |
