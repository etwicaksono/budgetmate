# API Routes Review — Findings

Scope: `app/api/v1/*` and `app/api/ai/*` route handlers reviewed for correctness, consistency, and refactorability.

## Executive summary

The API layer is functional, but it is doing too much work inline:

- route handlers combine auth, validation, query construction, business rules, serialization, and error translation
- several multi-step mutations are not atomic and can leave partial state behind
- some endpoints leak debug information or bypass the standard response helpers
- auth/rate-limiting is process-local and will not scale cleanly across instances
- a few routes contain high-risk data integrity bugs, especially around bulk mutation and backup import

The main refactor goal should be to move domain logic into services and make routes thin adapters.

---

## High-priority correctness issues

### 1) Transaction label updates are not atomic
**File:** `app/api/v1/transactions/[id]/route.ts`  
**Lines:** `266-299`

- The route updates the transaction first, then performs label mutation separately.
- Existing labels are deleted before new label IDs are validated.
- If validation fails, the route returns an error after the delete has already happened.
- The label update error is swallowed at `295-298`, so the API can report success while silently losing label changes.

**Refactor direction:** wrap the whole update in a Prisma transaction and fail the request if label persistence fails.

### 2) Bulk transaction delete hard-deletes records
**File:** `app/api/v1/transactions/bulk/route.ts`  
**Lines:** `141-158`

- Bulk delete uses `deleteMany`, which bypasses the soft-delete pattern used elsewhere in the transaction domain.
- This creates inconsistent retention behavior versus single-transaction delete handlers.
- The route also reimplements a large portion of the transaction filter logic inline.

**Refactor direction:** move deletion into a service that applies the same soft-delete semantics everywhere, and share the filter builder with the list route.

### 3) Backup import reconstructs transaction-label links incorrectly
**File:** `app/api/v1/backup/import/route.ts`  
**Lines:** `502-541`

- Transaction-label restoration tries to find the target transaction by matching the original transaction’s account ID against the newly created transactions.
- This is not a stable mapping and can attach labels to the wrong transaction when multiple imported transactions share the same account.
- The code needs a direct `oldTransactionId -> newTransactionId` map, just like the other ID maps in the import flow.

**Refactor direction:** build a transaction ID map during import and use it for all relation restoration.

### 4) Budgets route leaks debug data and bypasses standard responses
**File:** `app/api/v1/budgets/route.ts`  
**Lines:** `32`, `122-140`

- The route logs request parameters to stdout.
- It returns `NextResponse.json(...)` directly instead of using the shared response helpers.
- The response includes a `debug` payload with raw aggregation data and date boundaries.
- Dummy budgets are synthesized with `id: ''`, which is fragile and can confuse consumers.

**Refactor direction:** remove debug output from the production response, normalize synthetic rows, and use a shared serializer for budget summaries.

### 5) Auth refresh/logout do not revoke tokens
**Files:**
- `app/api/v1/auth/refresh/route.ts`  
  **Lines:** `24-67`
- `app/api/v1/auth/logout/route.ts`  
  **Lines:** `13-19`

- Refresh returns the same refresh token and never rotates or invalidates it.
- Logout is explicitly client-side only, so stolen tokens remain usable until expiry.

**Refactor direction:** add refresh-token rotation and a revocation table/blacklist strategy, or switch to a server-managed session model.

### 6) Rate limiting is process-local
**Files:**
- `src/lib/auth/middleware.ts`  
  **Lines:** `173-198`
- `app/api/v1/auth/login/route.ts`  
  **Lines:** `26-34`

- The login route uses an in-memory rate limiter keyed by identifier.
- This resets on process restart and is bypassed in multi-instance deployments.
- It also does not account for IP-based abuse patterns.

**Refactor direction:** move rate limiting to Redis or a database-backed limiter and key it by both user identifier and source IP.

---

## Cross-cutting architecture issues

### 1) Routes are too fat
Many route files contain the same sequence:

1. auth
2. parse query params or JSON body
3. build Prisma filters
4. execute business rules
5. shape the response
6. translate Prisma errors

This pattern appears across:
- analytics routes (`cashflow`, `balance-trend`, `trends`, `advanced-charts`, `income-expense-report`, `expenses-by-category`, `income-vs-expenses`)
- transactions / transfers / debts
- categories / accounts / labels
- backup import/export
- AI session message handling

**Refactor direction:** introduce service-layer functions and shared request helpers so routes only orchestrate input/output.

### 2) Response formatting is inconsistent
Some endpoints use `successResponse` / `errorResponse`, while others return `NextResponse.json(...)` directly or attach debug fields.

Examples:
- `app/api/v1/budgets/route.ts:140`
- `app/api/v1/backup/export/route.ts:224-227` is okay as a file download, but still bypasses the shared response conventions intentionally
- `app/api/ai/config/route.ts:32-37` returns raw JSON

**Refactor direction:** define a small set of response patterns (JSON success, file download, stream) and use them consistently.

### 3) Validation is inconsistent
Some endpoints have schemas, others hand-roll checks, and a few accept free-form strings for business-sensitive fields.

Examples:
- `app/api/v1/user/settings/route.ts:79-100` accepts timezone/date_format/number_format without schema validation
- `app/api/v1/accounts/swap-order/route.ts` validates the array shape, but not that the set of IDs is complete or unique
- `app/api/v1/saved-filters/reorder/route.ts:23-37` validates array shape, but not completeness or duplicate IDs

**Refactor direction:** centralize route-body schemas and normalize query-param parsing.

### 4) Query-builder logic is duplicated
The analytics and transaction routes all hand-build Prisma `where` clauses with the same filters: date, account, category, search, amount, draft, transfer/debt options.

**Refactor direction:** create reusable filter-builder utilities for transactions, analytics, and budget aggregation.

---

## File-by-file notes

### Auth
- `app/api/v1/auth/login/route.ts:26-34` — in-memory limiter is not horizontally scalable.
- `app/api/v1/auth/refresh/route.ts:24-67` — refresh token is reused instead of rotated.
- `app/api/v1/auth/logout/route.ts:13-19` — logout does not revoke anything server-side.
- `src/lib/auth/middleware.ts:21-55` — every authenticated request performs a DB lookup; acceptable for small traffic, but expensive at scale.
- `src/lib/auth/middleware.ts:173-198` — rate limiting is process-local state.

### User settings
- `app/api/v1/user/settings/route.ts:79-100` — timezone/date-format/number-format are stored without validation or normalization.
- `app/api/v1/user/settings/route.ts:102-114` — update path is thin but could use a schema to prevent invalid values from being persisted.

### Accounts
- `app/api/v1/accounts/route.ts:11-147` — route mixes fetch + balance calculation + transformation; a good candidate for `accountsService.listAccounts`.
- `app/api/v1/accounts/[id]/route.ts:59-78` — balance/statistics computation is embedded directly in the handler.
- `app/api/v1/accounts/[id]/route.ts:155-172` and `174-190` — update path uses free-form `Record<string, unknown>` assembly; hard to reason about and test.
- `app/api/v1/accounts/swap-order/route.ts:42-55` — uses `updateMany` inside a transaction, but does not validate that all requested IDs belong to the user or that the list is complete and unique.

### Categories
- `app/api/v1/categories/route.ts:33-110` — list route builds a large ad hoc filter object and includes counts; should be moved to a query helper.
- `app/api/v1/categories/route.ts:140-210` — create handler contains parent validation, type compatibility checks, and inheritance logic inline.
- `app/api/v1/categories/[id]/route.ts:137-241` — parent/child propagation only updates direct children; deeper descendants can drift if a root category changes.
- `app/api/v1/categories/[id]/route.ts:342-401` — deletion checks are recursive for descendants but still live in the route; this should be a reusable category-graph helper.
- `app/api/v1/categories/tree/route.ts:50-131` — tree building is correct but entirely route-local; this should be a shared tree serializer.

### Labels
- `app/api/v1/labels/route.ts:34-68` — okay functionally, but consistent schema naming and trimming should be extracted.
- `app/api/v1/labels/[id]/route.ts:136-153` — delete checks usage counts, but the relationship handling is entirely manual and should live in a label service.

### Transactions
- `app/api/v1/transactions/route.ts` — large filter builder and label dedup logic make this route hard to maintain.
- `app/api/v1/transactions/[id]/route.ts:266-299` — label update flow is non-atomic and can partially apply.
- `app/api/v1/transactions/bulk/route.ts:25-158` — bulk filter mapping duplicates the list route and hard-deletes records instead of soft-deleting.

### Transfers
- `app/api/v1/transfers/route.ts` — create path builds the transfer plus two linked transactions inline; this is business logic that should be a domain service.
- `app/api/v1/transfers/[id]/route.ts` — update/delete paths duplicate account validation and cascading cleanup logic.

### Saved filters
- `app/api/v1/saved-filters/route.ts` — route is compact but duplicates schema and conflict handling patterns used elsewhere.
- `app/api/v1/saved-filters/[id]/route.ts` — ownership and update/delete logic should be extracted into a saved-filter service.
- `app/api/v1/saved-filters/reorder/route.ts:23-37` — transaction updates sort order, but does not validate ordering completeness or uniqueness.

### Budgets
- `app/api/v1/budgets/route.ts:32, 122-140` — debug logging and debug response fields should not ship in a production API.
- `app/api/v1/budgets/[category_id]/route.ts` — the monthly/annual upsert logic is coupled to route concerns and should be shared with the status endpoint.
- `app/api/v1/budgets/status/route.ts` — status calculations are correct in principle, but the period heuristics would be safer in a shared budget analytics service.

### Debts
- `app/api/v1/debts/route.ts` — debt list/create combines aggregation, derived amounts, and transaction linking in one handler.
- `app/api/v1/debts/[id]/route.ts` — update logic recalculates amounts from linked increases, which is business logic that should be centralized.
- `app/api/v1/debts/[id]/repayments/route.ts` — repayment settlement is part of the debt invariant and should share the same service as create/update/increase.
- `app/api/v1/debts/[id]/increase/route.ts` and `.../increase/[transactionId]/route.ts` — increase/reopen logic is fragmented across multiple handlers.

### Analytics
- `app/api/v1/analytics/cashflow/route.ts:65-305`
- `app/api/v1/analytics/balance-trend/route.ts:49-177`
- `app/api/v1/analytics/trends/route.ts:48-143`
- `app/api/v1/analytics/advanced-charts/route.ts:105-389`
- `app/api/v1/analytics/income-expense-report/route.ts:136-268`
- `app/api/v1/analytics/expenses-by-category/route.ts:29-99`
- `app/api/v1/analytics/income-vs-expenses/route.ts:20-80`

These routes are broadly correct, but they repeat the same timezone math, date bucketing, grouping, and response shaping. `advanced-charts` is the clearest example of a route that should be split into a dedicated analytics service with shared aggregation helpers.

### Backup
- `app/api/v1/backup/export/route.ts:43-227` — the export handler is doing full data hydration and JSON serialization inline; this is fine for now, but the serialization should be extracted if more entities are added.
- `app/api/v1/backup/import/route.ts:68-579` — this is the highest-risk route in the codebase because it performs destructive operations, ID remapping, and relationship restoration in one long transaction.
- `app/api/v1/backup/import/route.ts:502-541` — transaction-label reconstruction is wrong and needs a direct ID mapping.

### AI
- `app/api/ai/config/route.ts:13-37` — simple and fine, but it bypasses the shared response helpers.
- `app/api/ai/sessions/route.ts:15-103` — session listing/creation is acceptable, but the Prisma error mapping is verbose and repetitive.
- `app/api/ai/sessions/[id]/route.ts:18-205` — rename/delete path has a lot of repeated auth/Prisma handling.
- `app/api/ai/sessions/[id]/messages/route.ts:102-143` — this route does an internal HTTP fetch to the analytics endpoint instead of calling a shared service directly.
- `app/api/ai/sessions/[id]/messages/route.ts:224-256` — persistence and title generation are mixed into the streaming handler, which makes failure handling and testability harder.

---

## Recommended refactor plan

1. **Create route helper wrappers**
   - auth guard
   - schema validation
   - common Prisma error translation
   - standard JSON response formatting

2. **Extract domain services**
   - transactions service
   - transfers service
   - budgets service
   - debt service
   - saved-filters service
   - analytics service
   - backup import/export service
   - AI session orchestration service

3. **Fix high-risk mutation flows first**
   - transaction label update atomicity
   - bulk delete soft-delete semantics
   - backup import transaction-label mapping
   - refresh/logout token lifecycle

4. **Move shared analytics/date logic into utilities**
   - period generation
   - timezone conversion
   - bucketing/grouping helpers
   - chart-series shaping

5. **Remove production debug leakage**
   - console logging in route handlers
   - `debug` payloads in API responses
   - accidental internal data exposure

6. **Add tests around the failure paths**
   - partial transaction update rollback
   - bulk delete filter correctness
   - backup import ID remapping
   - refresh/logout token behavior
   - budgets response shape

---

## Assumptions

- This review focuses on API route maintainability and correctness, not on UI behavior.
- Line references are based on the current file versions reviewed in this session.
- A few routes may be intentionally designed for simplicity in a single-user or low-scale deployment; the review is framed for long-term maintainability and production scaling.
