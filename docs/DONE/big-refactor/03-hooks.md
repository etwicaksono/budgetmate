# Hooks Refactor TODO

## Summary

I reviewed all 13 hook files under `src/hooks/` and the related service/context integrations they depend on. The biggest themes are:

- **Too much shared responsibility in a few hooks**, especially `useFilterData`, `useTransactionActions`, `useRegister`, and `useTransactionForm`.
- **Repeated data-fetching and refresh logic** across hooks and context providers (`useTransactionData`, `useFilterData`, `useCategories`, `TransactionModalContext`, `useNetWorth`).
- **Event-bus driven synchronization** via `window.CustomEvent` that is inconsistent, untyped, and in some cases likely dead or mismatched.
- **Type safety gaps** from stringly-typed option values, ad hoc cast-based DTO extensions, and duplicated type definitions.
- **Performance and maintainability concerns** from oversized hook return objects, repeated list scans, non-memoized derived values, and missing cancellation/refresh guards.

The most urgent refactor targets are `useFilterData`, the auth hooks (`useLogin` / `useRegister`), transaction/debt orchestration hooks (`useTransactionActions`, `useTransactionForm`, `useTransactionData`), and the global invalidation model.

## Architecture Issues

1. **Entity fetching is duplicated across multiple layers**
   - `useTransactionData.ts`, `useFilterData.ts`, `useCategories.ts`, and `src/context/TransactionModalContext.tsx` all fetch overlapping entity sets (accounts, categories, labels).
   - `useNetWorth.ts` also fetches accounts and debts separately and re-fetches on many global events.
   - This makes cache invalidation and refresh behavior inconsistent and wastes network calls.

2. **The app relies on a loose, untyped `window` event bus**
   - `useAccountModal.ts` emits `account-created` / `account-updated`.
   - `useTransactionActions.ts`, `GlobalTransactionModal.tsx`, and `TransactionModalContext.tsx` emit various `transaction-*` events with different payload shapes.
   - `GlobalDebtModal.tsx` emits `debt-mutated`, while `useNetWorth.ts` listens for `debt-created` / `debt-updated` / `debt-deleted`.
   - `useCategories.ts` listens to category events, but no dispatcher for those events was found in the current `src/` / `app/` code.
   - This pattern is fragile, hard to test, and easy to break during refactors.

3. **Filter-related types are duplicated across the codebase**
   - `src/hooks/useFilterData.ts` defines `SortValue`, `TransferOption`, `DebtOption`, `DraftOption`, and `FilterVisibility`.
   - Similar/shared filter shapes also exist in `src/types/filter.types.ts` and `src/components/FilterSidebar/FilterSidebar.types.ts`.
   - `useSavedFilters.ts` imports types from `useFilterData.ts`, coupling one hook to another hook’s API surface.
   - These should live in a single shared type module.

4. **The transaction modal architecture is split across too many pieces**
   - `useTransactionForm.ts`, `useTransactionData.ts`, `useTransactionActions.ts`, `TransactionContext.tsx`, `TransactionModalContext.tsx`, and `GlobalTransactionModal.tsx` all own part of the same workflow.
   - There are effectively two transaction modal paradigms in the repo.
   - This makes behavior drift likely and raises the cost of future refactors.

5. **Global mutable singletons are hidden behind hooks**
   - `useFormattedCurrency.ts` mutates the singleton `currencyFormatService` locale.
   - Several hooks read and write `localStorage` directly.
   - The resulting state is harder to reason about in tests and when more than one tree or locale may exist.

6. **Error handling is inconsistent**
   - Some hooks return `Error | null`, some return `string | null`, some only show toasts, and some swallow errors.
   - There is no single error contract for data hooks vs mutation hooks.

7. **Naming conventions are inconsistent across frontend-facing APIs**
   - Some hooks expose backend-style snake_case fields (`email_or_username`, `account_id`, `category_id`, `to_account_id`), while others use camelCase.
   - This leaks backend DTO details into UI-facing hook APIs and makes the code harder to standardize.

## Per-File Findings

### `src/hooks/useTransactionForm.ts`
- **Issues**:
  - `L19-L21, L80-L110`: validation errors are stored as a generic string-indexed object, but the hook uses domain-specific keys like `account`, `category`, and `toAccount`. The error model is not type-safe and is tightly coupled to the current form implementation.
  - `L139-L165`: `transaction` is cast to an extended type with `label_ids`, `to_account_id`, and `is_draft`. This indicates the form DTO is not aligned with the service DTO. The transfer mapping also collapses `transfer_in` / `transfer_out` into a single `transfer` type and does not preserve `from_account_id`.
  - `L33-L56, L118-L165`: date conversion, form initialization, and transfer normalization are embedded directly in the hook instead of being shared utilities. That makes transfer/date refactors harder.
- **Refactor TODO**:
  - Introduce a dedicated shared `TransactionFormModel` / DTO for form state.
  - Replace stringly validation keys with a typed union derived from the form model.
  - Extract date conversion and transfer normalization into reusable utility functions.
- **Priority**: **High**

### `src/hooks/useTransactionData.ts`
- **Issues**:
  - `L22-L25`: icon resolution uses `FaIcons as unknown as Record<string, IconType>`, which bypasses type safety. A typo in icon names would only fail at runtime.
  - `L28-L49, L84-L124`: `categoryTree`, `parentCategoryColors`, `categoryIcons`, and account icon/color maps are keyed by **names** rather than stable IDs. Duplicate names can collide and break lookups.
  - `L58-L77`: fetch logic is self-contained, but it duplicates the same entity-loading pattern that also exists in `useFilterData.ts`, `useCategories.ts`, and `TransactionModalContext.tsx`.
- **Refactor TODO**:
  - Replace dynamic icon casting with a typed icon registry.
  - Prefer IDs for internal lookup structures; only convert to display names at the edge.
  - Move entity loading into a shared data hook/cache layer.
- **Priority**: **Medium-High**

### `src/hooks/useTransactionActions.ts`
- **Issues**:
  - `L14-L246`: the hook is doing too much. It owns edit, delete, clone-as-draft, draft confirmation, debt intercept logic, modal orchestration, optimistic updates, and user feedback.
  - `L44-L53, L138-L149, L195-L201`: SweetAlert configuration is repeated several times with only minor variations.
  - `L22-L55, L110-L161, L193-L244`: optimistic updates are dispatched through untyped custom events. The payload shapes differ between actions, which makes consumers brittle and difficult to test.
  - `L62-L85, L165-L244`: transfer/debt branching is deeply nested, which makes the flow hard to read and easy to break.
- **Refactor TODO**:
  - Split into focused hooks or helpers (`useTransactionEditActions`, `useTransactionDeleteActions`, `useTransactionDraftActions`).
  - Extract shared toast / confirmation helpers.
  - Replace untyped custom events with a typed invalidation mechanism or centralized store updates.
- **Priority**: **High**

### `src/hooks/useSavedFilters.ts`
- **Issues**:
  - `L17-L24`: `React.Dispatch` is referenced without importing `React` as a namespace (or importing `Dispatch` / `SetStateAction` directly). This is fragile and depends on TypeScript/react config details.
  - `L11-L14, L159-L169, L194-L205, L210-L229`: filter option values are stored as plain strings and later cast back to union types. This weakens type safety and can hide invalid values until runtime.
  - `L71-L116`: name-to-id and id-to-name resolution repeatedly scans arrays with `find` / `some`. For larger filter sets this becomes unnecessarily expensive.
  - `L176-L185, L194-L205, L220-L229`: mutation errors are logged but not surfaced through hook state or returned results beyond a boolean-ish response. Consumers cannot render a reliable error state.
  - `L235-L249`: reorder logic sorts using `indexOf` inside the comparator, which is O(n²)-ish and can be replaced with a simple map-based ordering pass.
- **Refactor TODO**:
  - Move filter option types into a shared module and import them directly.
  - Build memoized lookup maps for categories/accounts instead of repeatedly scanning arrays.
  - Return structured errors (or raise them) so callers can present consistent feedback.
  - Replace reorder sorting with a map-based stable order function.
- **Priority**: **High**

### `src/hooks/useRegister.ts`
- **Issues**:
  - `L55-L66, L123-L266`: the hook largely duplicates the auth-validation / auth-error parsing pattern found in `useLogin.ts`. This should be shared.
  - `L10-L13`: `FieldError.field` is never actually read; only `message` is used. The shape is over-specified.
  - `L214-L220`: the `WEAK_PASSWORD` branch assumes `errorDetails` is a string array, but the type allows arrays of objects too. That can lead to `[object Object]` being shown to users.
  - `L94-L97` vs `L347-L350`: `closeSuccessModal` always pushes to `/login`, while the success flow also schedules a redirect to `redirectTo`. That is inconsistent and can send users to the wrong screen.
  - `L331-L342`: the hook writes user data to `localStorage` even though `useAuth().login()` also persists auth/user data. Persistence responsibility is duplicated.
  - `L347-L350`: the timer is not cleaned up on unmount.
- **Refactor TODO**:
  - Extract a shared auth form error/validation hook used by login and register.
  - Make success redirect behavior consistent with the `redirectTo` parameter.
  - Remove redundant storage writes from the hook if auth context already owns persistence.
  - Store and clear the redirect timer on unmount.
- **Priority**: **High**

### `src/hooks/useNetWorth.ts`
- **Issues**:
  - `L54-L81`: the hook subscribes to many global events and reloads everything on each one. That is expensive and hard to tune.
  - `L60-L79` plus the current debt flow in `GlobalDebtModal.tsx`: the hook listens for `debt-created` / `debt-updated` / `debt-deleted`, but the current modal emits `debt-mutated`. Net worth refreshes can therefore be missed.
  - `L14-L15, L94-L101`: `refresh` is typed as `() => void`, but it actually returns the async `fetchData` callback. This is a composability/type mismatch.
  - `L18-L41`: all account/debt totals are recomputed from full reloads, which is fine for small datasets but becomes wasteful as usage grows.
- **Refactor TODO**:
  - Align event names across debt/account flows or replace event listeners with explicit invalidation.
  - Type `refresh` as `() => Promise<void>`.
  - Consider caching or deriving the total from already-fetched entity data.
- **Priority**: **Medium-High**

### `src/hooks/useLogin.ts`
- **Issues**:
  - `L47-L199`: the hook duplicates the same auth validation / API error mapping pattern as `useRegister.ts`.
  - `L10-L13`: `FieldError.field` is unused here as well.
  - `L41, L204-L255`: the public hook API leaks backend-style snake_case naming (`email_or_username`) into the frontend boundary. This makes the hook less ergonomic and less consistent with the rest of the UI code.
  - `L119-L199`: `closeErrorModal` only hides the modal; it does not clear the error state. That can leave stale errors in memory between modal openings.
- **Refactor TODO**:
  - Extract a shared auth error normalizer.
  - Rename the hook’s public API to camelCase-friendly names.
  - Decide whether modal close should also clear error state and make that behavior consistent with `useRegister`.
- **Priority**: **High**

### `src/hooks/useIncomeExpenseData.ts`
- **Issues**:
  - `L49-L94`: the effect has no cancellation or generation guard, so rapid filter changes can race and overwrite newer data with stale responses.
  - `L55-L83`: parameter building repeats the `20000000` max-amount magic number and uses truthy checks that obscure intent.
  - `L24-L28, L87-L90`: the hook only returns a string error. It loses structured failure details and does not distinguish between retryable and non-retryable failures.
  - `L94`: dependencies are raw arrays, so the effect will refetch if parent components pass new array identities even when content is unchanged.
- **Refactor TODO**:
  - Add an abort controller or generation counter.
  - Extract report param construction and constants into shared helpers.
  - Stabilize filter inputs upstream or memoize a normalized query object.
- **Priority**: **Medium-High**

### `src/hooks/useFormattedCurrency.ts`
- **Issues**:
  - `L12-L25`: the hook mutates a singleton service’s default locale in an effect. That creates hidden shared state and can interfere with tests or multiple locales.
  - `L18-L65`: the returned API is not fully stable. Some functions are memoized, but `parseAmount.bind(...)`, `getSymbol`, `getName`, and `getDecimalDigits` are recreated on every render.
  - `L18-L45`: the legacy compatibility arguments (`optionsOrLegacy`, `typeOrLegacy`) make the API harder to understand and maintain.
  - `L21-L25`: `forceDecimals: 0` is always injected, which means the hook’s caller cannot override decimal precision through this wrapper.
- **Refactor TODO**:
  - Remove global mutable locale state from the service layer.
  - Return a fully memoized formatter object from the hook.
  - Drop legacy overloads once migration is complete.
- **Priority**: **Medium-High**

### `src/hooks/useFilteredCategories.ts`
- **Issues**:
  - `L16-L48`: the hook does not declare an explicit return type/interface, which makes its API less self-documenting for consumers.
  - `L24-L40`: filtering happens in two passes (`availableCategories` and then `filteredCategories`). That is acceptable for small arrays, but it is not the most efficient option if category lists grow.
- **Refactor TODO**:
  - Add a dedicated result type.
  - Collapse the filtering logic into a single memoized pass if this hook becomes hot.
- **Priority**: **Low**

### `src/hooks/useFilterData.ts`
- **Issues**:
  - `L33-L285`: this hook is a classic “god hook.” It owns query state, debounce logic, persistence, remote data loading, derived lookup structures, and compatibility helpers all at once.
  - `L103-L125`: it duplicates the same accounts/categories/labels fetch logic that also exists in `useTransactionData.ts`, `useCategories.ts`, and `TransactionModalContext.tsx`.
  - `L81-L101`: localStorage persistence is unvalidated and tied directly to the hook lifecycle. Bad JSON or schema changes can break the persisted state, and every visibility change writes immediately.
  - `L128-L203`: derived structures are rebuilt from full arrays and key off human-readable names instead of stable IDs.
  - `L205-L229`: `addCategory` is a legacy compatibility shim; `_isParent` is unused, defaults are hard-coded, and it constructs a category object that may not match the server model.
  - `L52-L53, L277-L279`: `selectedCurrencies` / `availableCurrencies` are over-generalized for a single-currency app, and `availableCurrencies` is just a constant wrapped in `useMemo`.
  - `L78-L80, L117-L123`: remote fetches and persistence do not include cancellation guards, so state can update after unmount in slow network conditions.
- **Refactor TODO**:
  - Split the hook into smaller concerns (`useFilterState`, `useFilterPersistence`, `useFilterEntities`).
  - Move shared filter types into a dedicated module.
  - Remove legacy compatibility helpers after consumers are migrated.
  - Consider a query/cache layer instead of repeated fetches and event-driven reloads.
- **Priority**: **High**

### `src/hooks/useCategories.ts`
- **Issues**:
  - `L27-L63`: the hook repeats the same fetch + event refresh pattern used elsewhere, instead of delegating to a shared entity cache.
  - `L48-L63`: it listens for `category-created` / `category-updated` / `category-deleted`, but no dispatcher for those events was found in the current `src/` / `app/` code. The refresh path may never fire.
  - `L65-L72`: `incomeCategories` and `expenseCategories` are recomputed on every render rather than memoized.
  - `L69-L72`: `refreshCategories` is just a wrapper around `fetchCategories`, so it adds little value.
- **Refactor TODO**:
  - Replace event listeners with query invalidation or a shared state/cache layer.
  - Memoize the filtered category lists if category counts become large.
  - Remove the redundant refresh wrapper if the callback itself can be returned.
- **Priority**: **Medium**

### `src/hooks/useAccountModal.ts`
- **Issues**:
  - `L57-L83`: `parseFloat(formData.initial_balance) || 0` silently converts invalid balances to zero. That hides user input problems and can create bad account data.
  - `L10-L18`: `account_type` is typed as `string` instead of `Account['account_type']`, so invalid account types are possible at compile time.
  - `L57-L102`: the hook combines persistence, event dispatch, and optional refresh callback orchestration, but it does not expose loading/error state to consumers.
  - `L70-L88, L91-L94`: the hook dispatches `account-created` / `account-updated` and also calls `onSuccess`, which can cause duplicate refresh work.
- **Refactor TODO**:
  - Validate numeric input before save.
  - Tighten account type to the service union.
  - Centralize refresh/invalidation so the modal does not both emit events and call refresh callbacks.
- **Priority**: **Medium**

## Suggested Refactor Order

1. **Stabilize shared types and error handling**
   - Move filter/auth form types into shared modules.
   - Extract auth error parsing used by `useLogin` and `useRegister`.

2. **Replace brittle event-driven refreshes**
   - Decide on a single invalidation strategy for transactions, accounts, categories, and debts.
   - Align debt event names (`debt-mutated` vs `debt-created/updated/deleted`).

3. **Split oversized hooks**
   - Break `useFilterData` into smaller pieces.
   - Split `useTransactionActions` into focused action hooks.

4. **Normalize data-fetching/caching**
   - Introduce a shared query/cache layer for account/category/label/debt lookups.
   - Remove duplicate fetches from modal contexts and helper hooks.

5. **Clean up legacy compatibility code**
   - Remove unused overloads, unused params, and compatibility shims once consumers are migrated.
