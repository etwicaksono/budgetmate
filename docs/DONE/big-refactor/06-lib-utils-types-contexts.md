# Lib, Utils, Types & Contexts Refactor TODO

## Summary
- The codebase has a lot of duplicated or overlapping modules: root `utils` files vs grouped wrappers, runtime validation vs OpenAPI schemas, and multiple context providers that model the same domain state.
- The biggest risks are auth/security and schema drift: tokens are stored in localStorage with reversible obfuscation, JWT secrets have hardcoded fallbacks, and OpenAPI/validation/type definitions disagree on response shapes and date serialization.
- The AI layer is directionally well-factored, but the tool definitions/executors need stronger typing and the Gemini adapter has a few correctness issues.
- Overall recommendation: pick single sources of truth for enums, schemas, and shared types; reduce context breadth; and keep compatibility barrels only as short-lived shims.

## Duplicate Files
- `src/utils/transferUtils.ts` ↔ `src/utils/transactions/transferUtils.ts` — same implementation, wrapper re-export in the grouped path.
- `src/utils/formatters.ts` ↔ `src/utils/formatting/formatters.ts` — same implementation, wrapper re-export in the grouped path.
- `src/utils/timezone.ts` ↔ `src/utils/formatting/timezone.ts` — same implementation, wrapper re-export in the grouped path.
- `src/utils/iconResolver.tsx` ↔ `src/utils/icons/iconResolver.tsx` — same implementation, wrapper re-export in the grouped path.
- `src/utils/iconUtils.ts` ↔ `src/utils/icons/iconUtils.ts` — same implementation, wrapper re-export in the grouped path.
- `src/utils/crypto.ts` ↔ `src/utils/auth/crypto.ts` — same implementation, wrapper re-export in the auth path.
- `src/lib/api/response.ts` ↔ `src/types/api.types.ts` — duplicate API response types that will drift unless one becomes the canonical source.
- `src/lib/validation/backupSchemas.ts` ↔ `src/types/backup.types.ts` — validation schemas and exported backup types are modeling the same payloads separately.
- `src/context/AuthContext.tsx` ↔ `src/context/AuthStateContext.tsx` ↔ `src/features/auth/types/auth.types.ts` — duplicate auth state/user/token shapes.
- `src/context/TransactionContext.tsx` ↔ `src/context/TransactionModalContext.tsx` — overlapping transaction modal state and form models.
- `src/lib/validation/*` ↔ `src/lib/openapi/schemas/*` — runtime schemas and docs are independently defined for the same resources.
- `src/utils/constants.ts` ↔ `src/lib/validation/*` ↔ `src/lib/openapi/schemas/*` — transaction types, debt statuses, account types, and locale/currency assumptions are repeated in multiple places.
- `src/mocks/localStorageService.ts` ↔ `src/utils/constants.ts` ↔ `src/context/AuthContext.tsx` — localStorage keys are inconsistent across modules.

## Architecture Issues
- **Single source of truth is missing for shared domain enums and payloads.** Transaction types, debt statuses, account types, locale codes, and API response shapes are defined in multiple places with slightly different variants.
- **Date/time handling is inconsistent.** `src/utils/timezone.ts` uses custom `YYYY-MM-DD HH:MM:SS` formatting, while validation schemas expect ISO `datetime()` strings. This creates subtle mismatches and timezone bugs.
- **Auth security needs a redesign.** Token obfuscation in localStorage is not security, hardcoded JWT fallback secrets are dangerous, and refresh/access token payloads contain more data than they need.
- **Contexts are too broad and too coupled.** Several providers own both state and side effects (network, storage, toast, or event bus). That hurts testability and causes rerenders across the app tree.
- **OpenAPI docs are drifting from reality.** Several schemas use `z.date()` for JSON APIs, pagination meta naming differs from the response helper, and some endpoints are documented with `z.unknown()` instead of concrete payloads.
- **The AI tool layer needs stricter contracts.** Tool args are currently unvalidated `Record<string, unknown>`, and the Gemini adapter loses type information for array params and tool-response names.
- **Compatibility barrels are fine short term, but the current structure obscures ownership.** Root `utils` exports and feature barrels should eventually resolve to one canonical implementation per concern.
- **Storage keys are fragmented.** `APP_CONFIG.storageKeys` and `localStorageService` use different names for the same kinds of data, which makes migration and debugging harder.

## Per-File Findings

### `src/config/currencies.ts`
- **Issues**: Lines 1-61 describe a multi-currency API, but the implementation is hardcoded to IDR only. `getCurrency()` returns `IDR_CONFIG` for unknown codes despite its `CurrencyConfig | undefined` return type (lines 39-41), and `getCurrencySymbol()`/`isValidCurrency()` ignore any code other than `IDR` (lines 51-61).
- **Refactor TODO**: Either remove the abstraction and make this an explicit IDR-only config, or restore real multi-currency data and align types/behavior.
- **Priority**: medium

### `src/config/locales.ts`
- **Issues**: The locale list is hardcoded and `getDefaultLocale()` relies on `AVAILABLE_LOCALES[0]!` (lines 13-95), which is brittle if the list changes. The `numberFormat` strings are examples, not machine-readable format definitions.
- **Refactor TODO**: Derive formatting examples from `Intl.NumberFormat` where possible and make the default locale explicit rather than positional.
- **Priority**: low

### `src/types/index.ts`
- **Issues**: Lines 8-10 re-export the same API/backup/filter types that are also defined in runtime modules, so the barrel itself is fine but the underlying duplication is not.
- **Refactor TODO**: Keep this barrel, but make the re-exported files derive from one canonical schema/type source.
- **Priority**: low

### `src/types/filter.types.ts`
- **Issues**: `FilterState` uses broad `string[]` and `string` fields for values that are clearly constrained in the app (lines 6-14). `FilterVisibility` is also very loose (`Record<string, boolean>`, line 16).
- **Refactor TODO**: Replace these with shared unions/enums for sort, transfer, and debt filter values, and tighten visibility keys to known widget/filter identifiers.
- **Priority**: medium

### `src/types/backup.types.ts`
- **Issues**: This file duplicates the backup JSON shape already modeled in `src/lib/validation/backupSchemas.ts` (lines 12-216 vs validation schema definitions). The API response types here can drift from both the schema and actual endpoints.
- **Refactor TODO**: Re-export zod-inferred types from the backup schema module instead of maintaining a second hand-written model.
- **Priority**: medium

### `src/types/api.types.ts`
- **Issues**: Lines 6-29 duplicate `src/lib/api/response.ts`. The generic `meta` shape is also slightly more permissive than the response helper, which makes drift more likely.
- **Refactor TODO**: Make this file a type-only re-export of the canonical response module or delete it in favor of the lib module.
- **Priority**: medium

### `src/utils/transferUtils.ts`
- **Issues**: This is the canonical transfer utility implementation (lines 10-87). The problem is not the file itself; it is that grouped wrapper files duplicate it.
- **Refactor TODO**: Keep this as the only implementation, and have grouped paths re-export it temporarily until consumers migrate.
- **Priority**: low

### `src/utils/transactions/transferUtils.ts`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../transferUtils` verbatim.
- **Refactor TODO**: Keep only as a short-lived compatibility shim, then delete once imports are migrated.
- **Priority**: medium

### `src/utils/formatters.ts`
- **Issues**: Multiple parameters are ignored (`_currencyCode` on lines 11, 39, 46, 70), `formatDate()` is hardcoded to `en-US` (lines 18-24), and `formatDateForInput()` uses `toISOString()` which can shift the displayed date by timezone (lines 30-32). The file also duplicates currency formatting responsibility already centralized in `currencyFormatService`.
- **Refactor TODO**: Make formatting locale-aware, remove dead currency parameters, and split date formatting into local-date and UTC-safe helpers.
- **Priority**: high

### `src/utils/formatting/formatters.ts`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../formatters`.
- **Refactor TODO**: Keep as a compatibility shim only while imports are migrated to a single canonical path.
- **Priority**: medium

### `src/utils/timezone.ts`
- **Issues**: The custom offset math (lines 1-89) is hard to reason about and likely brittle around DST and timezone edge cases. It also produces custom date strings that do not match the ISO `datetime()` format used by validators.
- **Refactor TODO**: Replace with a well-tested timezone library or a smaller adapter around `Intl`/`date-fns-tz`, and standardize the string format across the app.
- **Priority**: high

### `src/utils/formatting/timezone.ts`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../timezone`.
- **Refactor TODO**: Keep only as a migration shim.
- **Priority**: medium

### `src/utils/iconResolver.tsx`
- **Issues**: The namespace import of all Font Awesome icons (line 2) is likely to bloat the bundle, and the giant static `iconMap` (lines 7-104) is effectively a hand-maintained registry. This file duplicates `src/utils/icons/iconUtils.ts` and overlaps with `src/utils/icons/iconResolver.tsx`.
- **Refactor TODO**: Consolidate to one icon lookup API, preferably generated from a typed icon registry rather than manual namespace imports.
- **Priority**: medium

### `src/utils/icons/iconResolver.tsx`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../iconResolver`.
- **Refactor TODO**: Keep only as a compatibility shim while imports are migrated.
- **Priority**: medium

### `src/utils/iconUtils.ts`
- **Issues**: `getIconComponent()` returns a fallback icon while `resolveIcon()` returns `null`, so the API surface is inconsistent across icon utilities (lines 8-23 vs `iconResolver.tsx`). It also imports the entire `react-icons/fa` namespace (line 1), which is not ideal for bundle size.
- **Refactor TODO**: Merge icon resolution into one typed module and standardize the fallback behavior.
- **Priority**: medium

### `src/utils/icons/iconUtils.ts`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../iconUtils`.
- **Refactor TODO**: Keep only as a temporary migration shim.
- **Priority**: medium

### `src/utils/crypto.ts`
- **Issues**: This is not real encryption. Tokens are obfuscated with Base64 + reversal + a hardcoded fallback key (lines 4-20), `Math.random()` is used for “secure” data generation (lines 79-85, 113-115), and the hash fallback is not cryptographically strong (lines 88-109). This is a security problem if relied on for auth.
- **Refactor TODO**: Stop storing sensitive tokens in localStorage and replace this with HttpOnly cookie/session handling; if any client crypto remains, use the Web Crypto API only.
- **Priority**: high

### `src/utils/auth/crypto.ts`
- **Issues**: Pure duplicate wrapper; lines 1-3 re-export `../crypto`.
- **Refactor TODO**: Keep only as a compatibility shim while migrating callers.
- **Priority**: medium

### `src/utils/constants.ts`
- **Issues**: Several constants disagree with validation schemas and docs: `TRANSACTION_TYPES` includes transfer/debt variants (lines 47-53) while transaction validation only allows income/expense; `DEBT_STATUSES` omits `cancelled` (lines 64-73) while debt validation allows it. This file is also a second source of truth for app behavior that should be shared with schemas.
- **Refactor TODO**: Replace stringly typed constant objects with shared enums/unions imported by validation, OpenAPI, and UI code.
- **Priority**: medium

### `src/utils/index.ts`
- **Issues**: Lines 14-19 re-export the legacy root utility modules, which keeps the old structure alive even after grouped paths were introduced.
- **Refactor TODO**: Decide on one canonical import style and phase out the legacy root barrel exports once consumers are migrated.
- **Priority**: low

### `src/context/TransactionModalContext.tsx`
- **Issues**: This context is doing too much: modal state, fetching accounts/categories, maintaining lookup maps, and CRUD side effects (lines 66-289). It also defines its own `TransactionFormValues` type instead of importing a shared model (lines 10-21), uses `categoryTree: unknown` (line 56), and casts `data.type as 'income' | 'expense'` during save (lines 177-210), which drops transfer support even though the form type includes it.
- **Refactor TODO**: Split this into a small modal-state context plus dedicated data hooks/services, import a shared transaction form type, and handle transfer editing/saving explicitly.
- **Priority**: high

### `src/context/TransactionContext.tsx`
- **Issues**: This is a second transaction-modal context with overlapping responsibilities and a duplicate `TransactionFormData` shape (lines 5-29). `closeModal()` uses a raw timeout without cleanup (lines 54-60), which can leak state updates after unmount.
- **Refactor TODO**: Merge this with the modal/data layer or remove it after consolidating to a single transaction context.
- **Priority**: high

### `src/context/ToastContext.tsx`
- **Issues**: The provider owns both toast state and rendering (lines 20-49), which couples context consumers to the UI container. `showToast()` schedules timeouts without cleanup (lines 27-42), and ID generation uses `Date.now() + Math.random()` (line 32) instead of a collision-resistant approach.
- **Refactor TODO**: Separate toast state management from the presenter component and store timeout handles so they can be cleared on unmount.
- **Priority**: medium

### `src/context/LocaleContext.tsx`
- **Issues**: This context mixes localStorage, server synchronization, and toast notifications in one provider (lines 26-98). It also uses a loosely typed API response for `/user/settings` (lines 41-45, 77-90) and re-reads from localStorage before the async server fetch, which can create stale-overwrite races.
- **Refactor TODO**: Extract persistence into a settings service and keep the context focused on state + setter behavior.
- **Priority**: medium

### `src/context/DebtContext.tsx`
- **Issues**: The context is broad: modal type, edit state, active tab state, and edit transaction state all live together (lines 29-94). `closeModal()` also uses an unmanaged timeout (lines 71-78), and transaction types are imported inline via `import(...)` instead of a shared type import (lines 12, 18, 19, 34, 55, 63).
- **Refactor TODO**: Use shared type imports, split UI tab state from debt modal state, and remove the untracked timeout behavior.
- **Priority**: medium

### `src/context/AuthStateContext.tsx`
- **Issues**: This is a minimal state holder, but it duplicates the auth booleans already exposed by `AuthContext` (lines 5-29). That split adds indirection without clear benefit.
- **Refactor TODO**: Merge auth state and auth actions into one provider or justify the split with a reducer/state machine.
- **Priority**: medium

### `src/context/AuthContext.tsx`
- **Issues**: Auth token storage uses localStorage and reversible client-side obfuscation (lines 43-48, 84-123, 126-160), which is not secure for JWTs. The `User` and `LoginResponse` interfaces duplicate `src/features/auth/types/auth.types.ts` (lines 11-24), and the provider relies on `useAuthState` for state while also exposing the same booleans again (lines 37-42, 164-176).
- **Refactor TODO**: Move to a single auth model, use secure cookie/session storage, and import shared auth types from one domain source.
- **Priority**: high

### `src/context/index.ts`
- **Issues**: Lines 1-8 are a straightforward context barrel; no functional problem, but it means consumers can easily import broad state providers without noticing their coupling.
- **Refactor TODO**: Keep the barrel, but prefer named provider imports in app composition code so provider boundaries stay explicit.
- **Priority**: low

### `src/mocks/localStorageService.ts`
- **Issues**: This file is production logic living under a `mocks` folder, which is misleading. It also defines its own storage keys (lines 10-17) that do not match `APP_CONFIG.storageKeys`, uses shallow validation for widget state (lines 126-160), and exposes a `clear()` method that wipes the entire browser storage namespace (lines 105-117).
- **Refactor TODO**: Move this to a real storage service location, namespace keys consistently, add schema validation, and restrict clear operations to app-owned keys.
- **Priority**: high

### `src/lib/timezone.ts`
- **Issues**: The date math is custom and fairly opaque (lines 1-87), which is risky for timezone correctness and DST handling. It is also conceptually overlapping with `src/utils/timezone.ts` and the app’s validation schemas, which expect different date formats.
- **Refactor TODO**: Consolidate timezone/date handling into one tested utility layer and standardize on a single transport format.
- **Priority**: medium

### `src/lib/db/prisma.ts`
- **Issues**: `DATABASE_URL` is read without validation (lines 5-7), so failures happen at module initialization instead of with a clear config error. The pool/client lifetime is also implicit, which is acceptable in Next.js but should be documented for serverless deployments.
- **Refactor TODO**: Add explicit environment validation and document connection lifecycle expectations.
- **Priority**: medium

### `src/lib/auth/password.ts`
- **Issues**: Password strength rules duplicate `src/lib/validation/auth.ts` (lines 15-56 vs validation schema rules). `generateRandomPassword()` uses `Math.random()` and a sort-based shuffle (lines 58-80), which is not cryptographically secure.
- **Refactor TODO**: Extract a shared password policy definition and use crypto-safe randomness plus Fisher-Yates shuffling.
- **Priority**: high

### `src/lib/auth/middleware.ts`
- **Issues**: `findUnique()` is called with `deleted_at: null` in the `where` clause (lines 45-56, 147-157), which is likely invalid unless that field is part of a unique selector. The in-memory rate limit map (lines 173-198) will not scale across instances or serverless cold starts.
- **Refactor TODO**: Switch to `findFirst()` or a valid unique selector and move rate limiting to a shared store or edge-compatible limiter.
- **Priority**: high

### `src/lib/auth/jwt.ts`
- **Issues**: Hardcoded fallback secrets are shipped in code (lines 5-10), and the token payload carries `email` and `username` in addition to `user_id` (lines 16-21), which is more data than a refresh token should need. Verification also casts JWT payloads without runtime validation (lines 42-76).
- **Refactor TODO**: Require env secrets, minimize payload contents, and validate claims with a schema before returning them.
- **Priority**: high

### `src/lib/api/params.ts`
- **Issues**: The pathname fallback uses the last URL segment as an ID (lines 31-47), which can misread nested routes. `resolveTransactionId()` is already marked deprecated (lines 49-58) and should be removed when callers are migrated.
- **Refactor TODO**: Narrow the fallback logic to known route shapes and remove the deprecated helper once unused.
- **Priority**: low

### `src/lib/api/response.ts`
- **Issues**: The pagination helper returns camelCase keys (`totalPages`, `hasNext`, `hasPrev`, lines 89-103) while OpenAPI transaction docs expect snake_case (`total_pages`, `has_next`, `has_prev`). `secureResponse()` also adds the obsolete `X-XSS-Protection` header (lines 105-119).
- **Refactor TODO**: Standardize response metadata naming across helper, types, and docs; remove obsolete security headers.
- **Priority**: medium

### `src/lib/openapi/registry.ts`
- **Issues**: The API metadata still says `BudgetMate API v1` (lines 17-24), which is stale branding for FinanceApp.
- **Refactor TODO**: Update the title/description to the current product name and keep branding centralized.
- **Priority**: low

### `src/lib/openapi/schemas/index.ts`
- **Issues**: Lines 1-13 import every schema for side effects, which is fine for doc generation but not tree-shakeable if imported elsewhere.
- **Refactor TODO**: Keep this file as a docs-entrypoint only and avoid using it from runtime code paths.
- **Priority**: low

### `src/lib/openapi/schemas/auth.ts`
- **Issues**: Response shapes do not match the auth feature types/context: the login/register docs return `{ user, tokens }` (lines 35-93), while `AuthContext`/`features/auth/types` use flat `access_token` + `refresh_token` + `user`. The schema also uses `z.date()` for JSON timestamps (lines 9-19), which is not how API responses serialize dates.
- **Refactor TODO**: Derive the docs from a shared auth response type and serialize timestamps as strings with `.datetime()`.
- **Priority**: high

### `src/lib/openapi/schemas/analytics.ts`
- **Issues**: All response bodies are `z.unknown()` (lines 16-126), so the generated docs are effectively placeholders. The query parameter list is repeated as a raw const instead of being derived from a shared filter schema (lines 4-14).
- **Refactor TODO**: Replace `unknown` payloads with concrete response schemas and derive query params from a shared analytics filter type.
- **Priority**: medium

### `src/lib/openapi/schemas/accounts.ts`
- **Issues**: The schema uses `z.date()` for `created_at` and `updated_at` (lines 7-18), but JSON APIs should expose ISO strings. `account_type` is also duplicated inline instead of being imported from a shared enum/config source.
- **Refactor TODO**: Convert date fields to string datetime schemas and reuse a shared account-type enum.
- **Priority**: medium

### `src/lib/openapi/schemas/budgets.ts`
- **Issues**: The schema is relatively small and consistent, but it still hardcodes status values inline (lines 4-14) instead of reusing a shared budget-status model.
- **Refactor TODO**: Prefer shared enums/types for budget status and category labels.
- **Priority**: low

### `src/lib/openapi/schemas/backup.ts`
- **Issues**: Export/import endpoints use `z.unknown()` payloads (lines 7-39), so the docs do not describe the backup contract well. The file also imports the native import schema from validation, which is good, but the response side is still underspecified.
- **Refactor TODO**: Reuse the backup response schema/types and replace `unknown` with concrete shapes.
- **Priority**: medium

### `src/lib/openapi/schemas/debts.ts`
- **Issues**: Date fields are declared as `z.date()` (lines 5-24), which is incorrect for JSON transport. The increase endpoint reuses `CreateRepaymentSchema` (lines 148-170), which is semantically wrong for a debt-increase operation, and `transactions` is modeled as `z.unknown()` (lines 76-101).
- **Refactor TODO**: Use ISO string dates, introduce a dedicated increase schema, and define transaction-history payloads explicitly.
- **Priority**: high

### `src/lib/openapi/schemas/categories.ts`
- **Issues**: `type` and `nature` are modeled as plain strings instead of enums (lines 5-24), and the tree endpoint returns a union of array-or-tree shapes (lines 178-211), which is difficult for clients to consume safely. Date fields are also typed as `z.date()` (lines 21-22).
- **Refactor TODO**: Use enums imported from shared config and model a single, predictable tree response shape.
- **Priority**: high

### `src/lib/openapi/schemas/labels.ts`
- **Issues**: This file is mostly straightforward, but it also uses `z.date()` for timestamps if labels later expose them and repeats color validation inline (lines 4-142).
- **Refactor TODO**: If labels grow more fields, move to shared timestamp and color primitives.
- **Priority**: low

### `src/lib/openapi/schemas/settings.ts`
- **Issues**: The settings schema uses plain strings for locale/date-format fields (lines 4-22), so it does not constrain values to the locale and format options in config.
- **Refactor TODO**: Validate locale/date-format fields against shared config enums or generated options.
- **Priority**: medium

### `src/lib/openapi/schemas/transactions.ts`
- **Issues**: Response meta uses snake_case keys (`total_pages`, `has_next`, `has_prev`, lines 73-84) while the API helper returns camelCase. The schema also mixes `z.date()` with JSON payloads (lines 5-36), and the transaction type enum includes transfer/debt variants even though validation only allows income/expense (line 13 vs `validation/transaction.ts`).
- **Refactor TODO**: Standardize pagination naming, serialize dates as strings, and align transaction types with the validated domain model.
- **Priority**: high

### `src/lib/openapi/schemas/transfers.ts`
- **Issues**: Date fields are again modeled as `z.date()` (lines 5-15), and `transaction_out` / `transaction_in` are left as `z.unknown()` (lines 40-48). That makes the transfer response only partially documented.
- **Refactor TODO**: Use string datetime fields and define the linked transaction IDs or transaction objects explicitly.
- **Priority**: medium

### `src/lib/openapi/schemas/savedFilters.ts`
- **Issues**: `context` is a plain string in the response schema (lines 31-42), `filters` is `z.record(z.unknown())`, and the response shapes are much looser than the validated filter schema (lines 7-29). This makes it hard to know what a saved filter actually contains.
- **Refactor TODO**: Reuse the filter schema/type and tighten `context` to the supported enum.
- **Priority**: medium

### `src/lib/validation/transfer.ts`
- **Issues**: The CUID regex is duplicated here and in other validation modules (lines 3-29). The schema is otherwise fine, but it is another example of per-file regex duplication.
- **Refactor TODO**: Pull the ID regex into a shared validation primitive.
- **Priority**: low

### `src/lib/validation/transaction.ts`
- **Issues**: Transaction type validation only allows `income` and `expense` (line 12), while other modules and docs also model transfer/debt transaction types. `keyword` and `search` are duplicated aliases (lines 53-55), and `category_id` is required even where uncategorized transactions may exist (line 10).
- **Refactor TODO**: Align the transaction domain model across validation, docs, and UI; consider a shared enum plus optional category support.
- **Priority**: high

### `src/lib/validation/debt.ts`
- **Issues**: This schema is reasonable, but it is still using ad hoc strings and does not export inferred types for consumers. The `CreateRepaymentSchema` / `UpdateDebtSchema` split is also worth checking against the actual service contract.
- **Refactor TODO**: Export inferred types and reuse shared primitives for IDs, timestamps, and statuses.
- **Priority**: low

### `src/lib/validation/category.ts`
- **Issues**: Validation is generally solid, but the file still repeats the CUID regex (line 4) and uses string enums inline for type/nature, which should come from a shared constants module.
- **Refactor TODO**: Share ID regexes and enum definitions across validation and OpenAPI.
- **Priority**: low

### `src/lib/validation/backupSchemas.ts`
- **Issues**: This file duplicates `src/types/backup.types.ts` and is another full schema definition of the same backup payload. `isVersionCompatible()` only compares major versions (lines 153-159), which is simplistic, and `formatValidationErrors()` depends on a Zod error shape that should be kept in sync with the installed Zod major version (lines 171-175).
- **Refactor TODO**: Make backup schemas the single source of truth, export inferred types from here, and tighten version compatibility rules if needed.
- **Priority**: medium

### `src/lib/validation/auth.ts`
- **Issues**: The password policy regex is duplicated with `src/lib/auth/password.ts` (lines 18-25 vs `password.ts` lines 15-50). `validateAuthInput()` is fine, but the broader auth validation policy should be centralized.
- **Refactor TODO**: Extract a shared password policy constant/schema and reuse it in auth validation and password helpers.
- **Priority**: medium

### `src/lib/ai/types.ts`
- **Issues**: Tool definitions are too shallow for richer schemas (`ToolParameter` lacks nested object modeling, lines 26-40), and `ContextSnapshot` is a very broad bag of strings/numbers (lines 79-98). `arguments` is also only `Record<string, unknown>` (lines 19-24), which leaves runtime validation to the caller.
- **Refactor TODO**: Introduce discriminated/validated tool schemas and make the context snapshot a tighter domain type.
- **Priority**: medium

### `src/lib/ai/tools.ts`
- **Issues**: `toolExecutor()` takes unvalidated args (`Record<string, unknown>`, lines 96-101), does not validate `sort_by` / `sort_order` / `type` before hitting Prisma (lines 112-198), and relies on a raw `limit` conversion that can become `NaN` (line 110). The Gemini tool definitions also declare array params, but the adapter path does not fully preserve that shape.
- **Refactor TODO**: Add per-tool Zod schemas, validate all args before querying Prisma, and split tool handlers into smaller, typed executors.
- **Priority**: high

### `src/lib/ai/factory.ts`
- **Issues**: This factory is pretty clean, but `providerOverride` / `modelOverride` are plain strings and the environment-driven model lists are not validated until runtime (lines 23-67).
- **Refactor TODO**: Keep the factory, but validate provider/model config at startup so failures happen earlier and more clearly.
- **Priority**: low

### `src/lib/ai/formatters.ts`
- **Issues**: `formatIncomeExpenseReport()` hardcodes `id-ID` and then derives sign formatting by re-parsing the formatted string (lines 34-91), which is fragile. The system prompt builder also injects raw context text directly (lines 97-115), so the calling layer should ensure the context is sanitized and bounded.
- **Refactor TODO**: Use numeric sign formatting directly and keep the prompt/context boundary explicit.
- **Priority**: medium

### `src/lib/ai/providers/gemini.ts`
- **Issues**: `toGeminiFunctionDeclarations()` does not preserve array item schemas or nested object detail (lines 16-35), so tool definitions are lossy. The tool-response mapping also uses `tool_call_id` as the Gemini function response name (lines 41-49), which is likely incorrect because Gemini expects the function name.
- **Refactor TODO**: Preserve full tool schemas and keep a name↔call-id map for Gemini tool responses.
- **Priority**: high

### `src/lib/ai/providers/swiftrouter.ts`
- **Issues**: The provider is largely okay, but it still parses tool-call arguments with raw `JSON.parse()` (lines 72-83, 119-127) and assumes streamed tool-call chunks will accumulate cleanly. That’s workable but brittle without validation.
- **Refactor TODO**: Add argument validation after parsing and guard against malformed tool-call payloads.
- **Priority**: low

### `src/lib/openapi/schemas/index.ts` (already covered above) and related schema barrels
- **Issues**: These are side-effect barrels by design, but that means they should only be used for documentation generation and not as runtime imports.
- **Refactor TODO**: Keep the docs-only entrypoint separate from runtime code.
- **Priority**: low

### `src/features/auth/index.ts`
- **Issues**: This barrel is just a compatibility façade over types, services, and hooks (lines 1-13). It is useful for migration, but it does not make the feature truly self-contained because the implementation still lives elsewhere.
- **Refactor TODO**: Keep the barrel short term, but move the real implementation into the feature folder and leave the root service path as the backward-compatible alias.
- **Priority**: low

### `src/features/auth/hooks/index.ts`
- **Issues**: It re-exports hooks from `@/hooks/useLogin` and `@/hooks/useRegister` (lines 1-3), which means the canonical hooks do not actually live in the feature module.
- **Refactor TODO**: Move the hook implementations into the auth feature folder and keep only a compatibility export at the old path.
- **Priority**: medium

### `src/features/auth/types/auth.types.ts`
- **Issues**: This duplicates the auth user/token/login response shapes already declared in `AuthContext.tsx` (lines 6-23). That means changes to auth payloads can drift across feature and context layers.
- **Refactor TODO**: Make this the shared auth type source and import it everywhere else.
- **Priority**: medium

### `src/features/auth/services/authService.ts`
- **Issues**: This is a re-export of the root auth service (lines 1-3), so the feature folder still depends on the legacy service location.
- **Refactor TODO**: Move the implementation into the feature folder and keep the root file as a migration shim if necessary.
- **Priority**: low

### `src/features/accounts/index.ts`
- **Issues**: Compatibility barrel only; lines 1-7 re-export root services.
- **Refactor TODO**: Keep as a migration layer until imports are switched to feature-local implementations.
- **Priority**: low

### `src/features/labels/index.ts`
- **Issues**: Compatibility barrel only; lines 1-5 re-export the root label service.
- **Refactor TODO**: Same migration strategy as the other feature barrels.
- **Priority**: low

### `src/features/analytics/index.ts`
- **Issues**: Compatibility barrel only; lines 1-5 re-export the root analytics service.
- **Refactor TODO**: Keep as a temporary alias while moving implementation ownership into the feature folder.
- **Priority**: low

### `src/features/categories/index.ts`
- **Issues**: Compatibility barrel only, but it still depends on root hooks/services (lines 1-8).
- **Refactor TODO**: Move category hooks and service implementations into the feature module.
- **Priority**: low

### `src/features/transfers/index.ts`
- **Issues**: Compatibility barrel only; lines 1-5 re-export the root transfer service.
- **Refactor TODO**: Keep as a migration alias only.
- **Priority**: low

### `src/features/transactions/index.ts`
- **Issues**: Compatibility barrel only; lines 1-8 re-export root services/hooks.
- **Refactor TODO**: Move the transaction hooks and service into the feature folder and minimize the root alias layer.
- **Priority**: low

### `src/features/debts/index.ts`
- **Issues**: Compatibility barrel only; lines 1-5 re-export the root debt service.
- **Refactor TODO**: Same migration pattern as the other feature barrels.
- **Priority**: low

### `src/features/backup/index.ts`
- **Issues**: Compatibility barrel only, and it re-exports backup types from the root shared types folder (lines 1-7), which is another source-of-truth leak.
- **Refactor TODO**: Export backup types from the schema module or make the feature own its types directly.
- **Priority**: medium

### `src/features/budgets/index.ts`
- **Issues**: Compatibility barrel only; lines 1-5 re-export the root budget service.
- **Refactor TODO**: Keep only as a temporary alias while the feature module is being consolidated.
- **Priority**: low
