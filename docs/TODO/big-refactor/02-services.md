# Services Layer Refactor TODO

## Summary
The services layer is functional, but it is not yet consistent enough for a large refactor. The biggest themes are: mixed HTTP client usage (`api`, `apiClient`, and raw `axios`), repeated request/response boilerplate, weakly typed filters and response envelopes, and a few concrete correctness/performance bugs.

The highest-risk items are the global API client refresh flow, the duplicated/fragile analytics query serialization, the backup import double-read, the currency formatter bug, and the presence of deprecated or cross-layer code in the same services folder.

## Architecture Issues
- **Inconsistent client strategy**: some services use `api`, some use `apiClient`, and auth endpoints sometimes use raw `axios`. This fragments auth handling, deduplication, and return-shape conventions.
- **No shared service base pattern**: CRUD services repeat the same `get/post/put/delete -> return response.data` pattern, plus repeated query serialization and envelope unwrapping.
- **Mixed concerns in one folder**: `balanceService.ts` is a Prisma/database service, while `backupService.ts` and `currencyFormatService.ts` are client-side utility/IO services. The directory currently mixes server data access, browser IO, and pure formatting logic.
- **Global auth behavior is too implicit**: token decryption, refresh, redirect, and auth-state clearing are all embedded in `api.ts`, which makes the client harder to test and reason about.
- **Error handling is inconsistent**: most services rely on implicit propagation with no context; `authService.logout()` swallows errors; backup methods log and rethrow; balance methods bubble raw Prisma errors.
- **Query serialization is duplicated**: analytics, budget, debt, category, and transaction services all build query strings differently. This is fragile and easy to drift.
- **Types mirror backend DTOs but not consistently**: some methods return wrapped responses, some unwrap them, some return custom shapes, and some use broad `string` fields where unions should exist.

## Per-File Findings

### `src/services/api.ts`
- **Issues**:
  - Decrypts the auth token on every request and reads `localStorage` inside the request interceptor (`lines 16-29`). This adds overhead on every call and is not SSR/test friendly.
  - The refresh flow is global but not single-flight (`lines 37-111`): concurrent `401` responses can trigger multiple refresh requests and race on storage updates.
  - Uses untyped `originalRequest._retry` and mutates `originalRequest.headers.Authorization` directly (`lines 40, 54, 90`), which weakens type safety and can break with Axios header types.
  - Redirect logic is hard-coded into the HTTP layer (`lines 106-107, 123-125`), which couples networking to browser navigation.
  - GET deduplication only covers in-flight promises and keys on `JSON.stringify(params)` (`lines 133-160`), which is brittle and not a real cache.
  - Refresh handling assumes the refresh token does not rotate (`lines 81-88`). If the backend changes to rotate refresh tokens, this client will silently become incorrect.
- **Refactor TODO**:
  - Introduce a dedicated auth/session manager with a refresh lock or queue.
  - Cache decrypted access tokens in memory and invalidate on login/logout/refresh.
  - Add typed Axios request config augmentation for `_retry`.
  - Move redirects out of the interceptor and into app-level auth state handling.
  - Replace ad hoc GET dedupe key generation with a stable serializer.
- **Priority**: **high**

### `src/services/accountService.ts`
- **Issues**:
  - Repeats the same wrapper-unwrapping pattern used across many services (`lines 42-59`), so there is no shared request helper.
  - `CreateAccountRequest.account_type` is typed as `string` (`line 20`) while the domain model uses a strict union (`line 6`), which weakens type safety.
  - `getNetWorth()` fetches all active accounts and computes the sum client-side (`lines 75-80`), which can be redundant if this value is read frequently or if a server-side aggregate exists.
  - No contextual error handling in any method (`lines 38-80`).
- **Refactor TODO**:
  - Use a shared `unwrapData<T>()` helper or a base service class.
  - Narrow `account_type` to the same union as `Account.account_type`.
  - Consider a cached or server-side net-worth endpoint if this value is read repeatedly.
- **Priority**: **medium**

### `src/services/analyticsService.ts`
- **Issues**:
  - Repeats almost identical comma-join serialization logic for `category_ids`, `account_ids`, and `label_ids` across multiple methods (`lines 274-357`).
  - `queryParams` is repeatedly cast with `as Record<string, string | number | string[]>` (`lines 274, 299, 323, 350`), which hides type mismatches instead of fixing them.
  - Several request params are weakly typed as `string` when they should be unions or dedicated enums (`lines 179-185, 248-271, 286-349`).
  - Two methods hit `/analytics/cashflow` but expect different response shapes (`lines 193-203` vs `lines 311-333`), which makes the endpoint contract ambiguous.
  - No centralized error wrapping or response normalization (`lines 167-360`).
- **Refactor TODO**:
  - Extract a reusable analytics query serializer for multi-select filters.
  - Replace broad string params with explicit unions and shared DTOs.
  - Clarify and separate `cashflow` summary vs report responses, or use one canonical response contract.
  - Consider splitting analytics services by report family if the file keeps growing.
- **Priority**: **high**

### `src/services/authService.ts`
- **Issues**:
  - Mixes raw `axios` calls with the shared `api` client (`lines 42-98`), which splits auth handling across three transport paths.
  - `login`, `register`, `logout`, and `refreshToken` bypass the shared client (`lines 42-83`), while `forgotPassword`, `resetPassword`, and `changePassword` use `api` (`lines 85-98`); this is inconsistent and difficult to maintain.
  - `forgotPassword`, `resetPassword`, and `changePassword` return `Promise<unknown>` (`lines 85-98`), so callers do not get typed response contracts.
  - `logout()` swallows failures and only logs to console (`lines 60-74`), which loses context.
  - Using the authenticated client for public auth flows can attach stale tokens and trigger 401 redirect behavior unexpectedly (`lines 85-98`).
- **Refactor TODO**:
  - Create a dedicated no-auth API client for public auth endpoints and keep token-aware behavior separate.
  - Add typed request/response interfaces for password flows.
  - Centralize logout/session teardown so it is not split between the interceptor and this service.
- **Priority**: **high**

### `src/services/backupService.ts`
- **Issues**:
  - `importData()` reads and parses the file, then `validateBackupFile()` reads and parses the same file again (`lines 85-115` and `124-196`), which duplicates work and can diverge if parsing logic changes.
  - The service mixes file-system/browser IO, parsing, validation, and download-side effects in one class (`lines 34-77`, `85-196`), which hurts separation of concerns and testability.
  - `isVersionCompatible()` hard-codes `1.0.0` (`lines 205-212`) instead of reading from a single app version source.
  - Error handling logs and rethrows raw errors without adding much domain context (`lines 73-76`, `112-115`, `190-195`).
  - The download cleanup is not wrapped in a `finally` block (`lines 61-72`), so a partial failure could leave DOM/object-URL cleanup incomplete.
- **Refactor TODO**:
  - Extract pure backup parsing/validation helpers and pass parsed content between them.
  - Move DOM download behavior to a UI/helper layer or a dedicated browser adapter.
  - Replace the hard-coded version with a shared app version constant.
  - Add domain-specific error objects for export/import failures.
- **Priority**: **high**

### `src/services/balanceService.ts`
- **Issues**:
  - Similar SQL fragments and Decimal-to-number conversion logic are repeated across all balance methods (`lines 22-49`, `56-89`, `96-166`).
  - `verifyBalanceIntegrity()` is effectively dead code and always returns `[]` (`lines 168-183`), despite a non-trivial return type.
  - Raw queries bubble database errors directly with no contextual wrapping (`lines 22-166`).
  - The folder mixes server-side Prisma access with browser-facing services elsewhere, which is a layer boundary smell for the overall services directory.
  - `calculateUserTotalBalance()` and related methods may be expensive if called frequently; there is no caching or aggregate reuse (`lines 56-130`).
- **Refactor TODO**:
  - Extract a shared internal balance-query helper to remove SQL duplication.
  - Remove `verifyBalanceIntegrity()` or move it to an admin/migration tool.
  - Decide whether balance aggregates should be cached or computed on demand, then make that choice explicit.
  - Separate server/data-access services from browser/service utilities if the codebase allows it.
- **Priority**: **medium/high**

### `src/services/budgetService.ts`
- **Issues**:
  - `fetchBudgets()` manually builds the query string with `URLSearchParams` and string concatenation (`lines 52-66`), unlike most other services that use `params`.
  - Filter types are underspecified: `account_ids` and `drafts` are plain strings (`lines 42-49`) instead of structured types, which pushes formatting responsibility onto callers.
  - Amount fields on `CategoryBudget` are `string | number` (`lines 3-19`), so consumers must normalize values themselves.
  - No contextual error handling in any method (`lines 52-93`).
- **Refactor TODO**:
  - Replace manual URL concatenation with a shared query-serialization helper.
  - Normalize budget amounts into numbers at the service boundary if possible.
  - Narrow filter DTOs to explicit types that match the API contract.
- **Priority**: **medium**

### `src/services/categoryService.ts`
- **Issues**:
  - `fetchCategories()` coerces `null` `parent_id` values into an empty string (`lines 65-74`), which can change the semantics of “root” filtering.
  - The file mixes snake_case and camelCase DTO conventions without a canonical domain mapping (`lines 3-20`, `22-59`).
  - Error handling is entirely implicit (`lines 65-120`).
  - The method style is inconsistent: `fetchCategories()` returns the promise directly (`line 74`) while other methods use `await` and then return a transformed value (`lines 80-120`).
- **Refactor TODO**:
  - Preserve `null` vs `undefined` semantics in filters.
  - Introduce shared request/response DTOs or mapping helpers.
  - Standardize method style and return shapes across the service.
- **Priority**: **medium**

### `src/services/currencyFormatService.ts`
- **Issues**:
  - `formatWithSymbol()` double-prefixes the currency symbol because it calls `formatCurrency(..., { showCode: false, showSymbol: true })` and then adds `Rp` again (`lines 117-125`). This is a correctness bug.
  - `parseAmount()` does not correctly handle the commented European example `1.234,56` (`lines 84-103`); the branching logic is mismatched and can parse that format incorrectly.
  - A new `Intl.NumberFormat` is created on every format call (`lines 45-52`), which is avoidable overhead in hot render paths.
  - This is a pure formatting utility, not really a domain service; it probably belongs in a `utils/formatters` layer instead of `src/services` (`lines 15-176`).
  - The singleton holds mutable global state (`defaultLocale`) (`lines 15-24`), which can surprise consumers if locale is changed at runtime.
  - The `showCode`/`showSymbol` API is ambiguous because `showCode` defaults to true and suppresses `showSymbol` in most cases (`lines 33-64`).
- **Refactor TODO**:
  - Fix `formatWithSymbol()` to compose the symbol once.
  - Rewrite `parseAmount()` to handle locale-specific separators deterministically.
  - Cache `Intl.NumberFormat` instances by locale/options.
  - Move this file out of the service layer if the app keeps a strict separation between data services and utilities.
- **Priority**: **high**

### `src/services/debtService.ts`
- **Issues**:
  - Imports concrete types from other services (`Account` and `Transaction`) (`lines 1-3`, `17-19`), which creates cross-service coupling and possible circular dependency risk.
  - Filter and update payloads are loosely typed with plain `string` fields (`lines 60-68`, `43-51`), and `UpdateDebtPayload.status` includes `cancelled` while `Debt.status` does not (`lines 5-22` vs `43-51`), which is a type-contract mismatch.
  - Query string construction is manual and duplicated in style with other services (`lines 71-85`).
  - The method names `increaseDebt()` and `updateIncrease()` are less explicit than the rest of the service API (`lines 109-126`).
  - No contextual error handling (`lines 71-127`).
- **Refactor TODO**:
  - Move shared domain types into a dedicated types module.
  - Narrow filter/status unions to the real API contract.
  - Standardize naming for repayment/increase actions.
  - Centralize query string serialization for list endpoints.
- **Priority**: **medium/high**

### `src/services/labelService.ts`
- **Issues**:
  - Uses `apiClient` directly instead of the shared `api` wrapper (`lines 1, 35-55`), which bypasses GET deduplication and any future request helper behavior.
  - `getLabel()`, `createLabel()`, and `updateLabel()` return `{ data: Label }` instead of `Label` itself (`lines 39-52`), while `fetchLabels()` returns `LabelsResponse` (`lines 34-37`), so the service interface is inconsistent.
  - No error context is added anywhere (`lines 34-55`).
- **Refactor TODO**:
  - Use a single client path (`api`) for this service unless there is a specific reason not to.
  - Normalize return values so callers always receive the same shape.
  - Add typed response envelopes and shared CRUD helpers.
- **Priority**: **medium**

### `src/services/savedFilterService.ts`
- **Issues**:
  - Uses `apiClient` directly instead of `api` (`lines 1, 45-69`), so it bypasses the shared wrapper pattern.
  - `fetchSavedFilters()` concatenates the query string manually (`lines 47-50`) instead of using structured `params`.
  - `SavedFilter.context` is typed as `string` (`lines 14-22`), while the request DTOs use a narrower union (`lines 24-34`), reducing type safety.
  - No contextual error handling (`lines 47-69`).
- **Refactor TODO**:
  - Standardize on the shared HTTP wrapper.
  - Narrow the `context` model field to the same union used by the request types.
  - Replace manual query-string construction with a serializer helper.
- **Priority**: **medium**

### `src/services/transactionService.ts`
- **Issues**:
  - `TransactionFilters` contains overlapping concepts (`search` and `keyword`) plus mixed param shapes (`label_ids?: string[] | string`, `account_ids?: string`, `category_ids?: string`) (`lines 60-79`), which makes the contract hard to use correctly.
  - `fetchTransactions()` does not normalize filter arrays before sending them (`lines 116-130`), so callers must know backend-specific serialization rules.
  - `importTransactions()` manually sets `Content-Type: multipart/form-data` (`lines 198-203`); in browsers this is often better left to Axios so the boundary is set correctly.
  - Service return shapes are not fully consistent: some methods return entity arrays, others return wrapped summary objects, and `fetchTransactions()` returns a custom `{ transactions, meta }` shape (`lines 116-178`).
  - No contextual error handling (`lines 116-206`).
- **Refactor TODO**:
  - Normalize transaction filter DTOs and introduce one serializer for array filters.
  - Remove the manual multipart header and let the browser/Axios handle the boundary.
  - Standardize response contracts across list/detail/bulk methods.
  - Consider collapsing `search`/`keyword` into one canonical filter field.
- **Priority**: **high**

### `src/services/transferService.ts`
- **Issues**:
  - Naming is slightly inconsistent: the entity uses `from_account` / `to_account`, while create/update payloads use `from_account_id` / `to_account_id` (`lines 3-20`), which can be confusing for callers.
  - The service is otherwise thin, but it still has no error context or shared helper usage (`lines 22-54`).
- **Refactor TODO**:
  - Decide whether the public API should expose account IDs or display names and make the naming consistent.
  - Standardize the list/filter DTO shape with other services.
- **Priority**: **low/medium**

### `src/features/auth/services/authService.ts`
- **Issues**:
  - This file is only a re-export shim (`lines 1-3`), so there is no functional logic to review here.
  - The indirection is fine for back-compat, but it can become stale if both paths are used long-term.
- **Refactor TODO**:
  - Keep this as a temporary compatibility layer only, or remove it once all imports are migrated to the canonical service path.
- **Priority**: **low**
