# Page Review Notes

Scope: all page-level files under `app/` outside `app/api/`, plus page-specific supporting components/hooks used directly by those pages.

## Executive summary

The page layer is in decent shape structurally, but a few pages still own too much business logic and data transformation. The biggest refactor wins are:

1. Extract shared transaction normalization / grouping logic used by `transactions` and `accounts/[id]`.
2. Split the dashboard fetch orchestration and widget state into dedicated hooks or sub-features.
3. Move budget roll-up, sorting, search, and summary calculations into pure helpers so the budgets page stops mixing presentation with data shaping.
4. Narrow the analytics filter state surface so the page only owns what the sidebar actually uses.
5. Clean up placeholder settings sections and commented/dead CTA code in auth pages.

## Cross-cutting observations

| Priority | Area | Finding | Evidence |
| --- | --- | --- | --- |
| High | Transactions / Account detail | Duplicate transaction grouping and record mapping logic | `app/(app)/transactions/page.tsx:341-430`, `app/(app)/accounts/[id]/page.tsx:202-257` |
| High | Dashboard | Large fetch orchestration with many independent states and event listeners | `app/(app)/dashboard/page.tsx:74-220`, `221-305` |
| High | Budgets | Dense roll-up / search / sort / render logic mixed into one page | `app/(app)/budgets/page.tsx:198-538`, `323-358`, `590-753` |
| Medium | Shared utilities | Repeated date-range -> ISO conversion and name -> ID mapping | dashboard, transactions, budgets, analytics, account detail |
| Medium | Shared utilities | Repeated `getIconComponent` helpers across multiple pages | dashboard, accounts, accounts/[id], budgets, categories |
| Medium | Analytics | The page still receives broad filter state even though the sidebar only needs accounts + drafts + saved filters | `app/(app)/analytics/page.tsx:53-86`, `AnalyticsFilterSidebar.tsx:23-190` |
| Low | Auth / landing | Some dead or placeholder UI remains | `app/(auth)/login/page.tsx:110-189`, `app/(auth)/register/page.tsx:116-245`, `app/page.tsx:12-16` |

## File-by-file review

### `app/layout.tsx`

- Solid root composition. The provider stack is clear and the layout is minimal.
- The inline service-worker registration script is functional, but if PWA bootstrap becomes more complex, it should move into a dedicated client-side initializer.
- The provider nesting could be wrapped in a single `AppProviders` component for readability, but this is not urgent.

### `app/page.tsx`

- The home page is simple and readable.
- The auth redirect happens in a client effect (`12-16`), so authenticated users may briefly see the landing page before redirect. If auth state ever becomes server-readable, a server redirect would avoid that flash.
- The page is otherwise fine for a public marketing/entry screen.

### `app/(auth)/login/page.tsx`

- Good separation of concerns: UI stays in the page while auth logic lives in `useLogin`.
- The `Suspense` boundary is appropriate for `useSearchParams()` usage.
- There is still dead/placeholder UI in the form footer and commented social-login markup (`110-189`). Those actions are not wired and should either be implemented or removed.
- The auto-dismiss modal effect is fine; no major issues here.

### `app/(auth)/register/page.tsx`

- Same positive comments as login: the page is reasonably thin and uses a custom hook well.
- The same placeholder/footer CTA patterns appear here (`116-245`). If these links/buttons are not functional, they should be removed to avoid false affordances.
- This page is not a refactor hotspot.

### `app/(app)/layout.tsx`

- This is intentionally tiny and clean.
- No action needed.

### `app/(app)/dashboard/page.tsx`

- This page is still the most orchestration-heavy feature screen. It owns widget ordering, visibility, draft inclusion, account loading, dashboard loading, transaction pagination, local storage persistence, and event listeners (`74-220`, `221-305`).
- `fetchDashboardData` conditionally fans out to five API calls, then normalizes their results into multiple state buckets. That logic should move into a dashboard data hook or service layer so the page becomes mostly composition.
- The transaction normalization for widgets (`333-371`) duplicates logic that already exists in the transactions/account pages.
- The widget configuration object (`408-491`) is rebuilt on every render. That is acceptable today, but if the dashboard gets heavier, a memoized widget registry or split widget components would reduce churn.
- The event-listener effect is a good idea, but the refresh behavior is complex enough that it should probably be extracted into a small reusable hook.
- Positive note: the dashboard already uses `useCallback` and conditional promises well, so this is more about reducing size and complexity than fixing correctness bugs.

### `app/(app)/accounts/page.tsx`

- The accounts list is relatively healthy.
- It does keep hover/edit button behavior inline, but the page is not excessive compared with the dashboard/transactions/budgets pages.
- The shared icon lookup pattern is duplicated here (`getIconComponent`), which is worth centralizing if you touch the account widgets again.
- No urgent refactor required.

### `app/(app)/accounts/[id]/page.tsx`

- The page itself is readable, but the `RecordsTab` subcomponent is large and duplicates a lot of transaction-page behavior.
- `RecordsTab` owns fetch/pagination/infinite scroll/selection/grouping all at once (`119-257`). That is too much for a tab renderer.
- The transaction grouping logic here is materially the same as the transactions page grouping logic (`202-257` vs. `app/(app)/transactions/page.tsx:341-430`), including date-key generation, category color resolution, transfer/debt normalization, and record shaping.
- The account load/error flow (`351-369`) is okay, but it mixes navigation fallback and error presentation. A small account hook would make retry / not-found handling easier to reason about.
- The balance tab fetch is simple and acceptable (`63-116`).
- This file is a good candidate for splitting into `useAccountDetail`, `useAccountRecords`, and a shared transaction record mapper.

### `app/(app)/transactions/page.tsx`

- This is still the other major complexity hotspot.
- The page owns a large amount of state: filters, pagination, selection, global selection, total counts, mobile filter state, saved filters, infinite scroll, and the fetch generation counter (`24-90`).
- The fetch pipeline is good from a correctness standpoint: it debounces search, converts dates, resolves IDs, converts sort options, and guards against stale responses with the generation ref (`123-257`). That said, the amount of inline request-building logic is a strong candidate for extraction into a pure `buildTransactionQuery()` helper.
- The date-grouping / record-mapping block (`338-430`) is duplicated in the account detail page and should be shared.
- Bulk delete payload construction (`479-550`) repeats the same filter resolution logic used in `fetchTransactions`. This is a strong sign that the page needs a shared transaction-query builder.
- The rendering section is fine, but the page is too large to comfortably maintain as one file.
- Recommended split:
  - transaction query builder
  - transaction grouping / record mapper
  - selection/bulk-action hook
  - list renderer and header composition

### `app/(app)/budgets/page.tsx`

- The budgets page is feature-rich and currently carries too much data-shaping logic.
- `loadData` and `refreshBudgets` repeat the same date/account resolution logic (`81-167`). That should be one helper so the page doesn’t drift when filters change.
- `combinedData` and `summaryTotals` are okay as memoized derivations, but `parentItems` combines filtering, roll-up math, search, sorting, and view-mode branching in one dense block (`198-538`). That block should be moved into pure helpers or a dedicated hook.
- The summary bar renderer (`234-358`) is fairly self-contained, but the page also has a large `renderBudgetItem` function that duplicates mobile and desktop markup (`590-753`). That should become a dedicated row component.
- Positive note: some structure already exists (`BudgetFilterSidebar`, `BudgetToolbar`, `BudgetTableMode`), so the page is close to being split properly. The remaining work is mostly moving the last pieces of business logic out of the page.
- The bottom modal wiring (`897-913`) is straightforward and fine.

### `app/(app)/budgets/_components/BudgetFilterSidebar.tsx`

- This is a good encapsulation of the sidebar panel.
- It already reduces page complexity by wrapping the shared desktop/mobile UI.
- Minor improvement: account-color/icon map creation could be pushed to a helper if you find yourself reusing it elsewhere.

### `app/(app)/budgets/_components/BudgetToolbar.tsx`

- This component is reasonably clean.
- It is doing UI composition, not business logic, which is good.
- No major issues.

### `app/(app)/budgets/_components/BudgetTableMode.tsx`

- Good separation of the editable grid mode from the page.
- The component still holds a lot of editing, selection, persistence, and localStorage state (`23-384`), so it is not small, but it is a clear improvement over keeping that logic in the page.
- `handleRowsChange` and `onCellsChange` duplicate row recalculation logic (`106-132`). A small `recomputeBudgetRow()` helper would remove that duplication and lower the risk of inconsistent recalculation rules.
- The `selectedMetric` footer is useful, but it adds another layer of UI state that should probably stay inside the grid feature rather than bubbling back to the page.

### `app/(app)/budgets/_components/budget-table/hooks/useBudgetGridData.ts`

- This hook is doing a lot: sorting, flat/grouped view conversion, row building, summary row creation, and collapse-state handling (`17-217`).
- The calculations are correct-looking, but the hook is large enough that I would consider extracting:
  - `computeBudgetRowTotals()`
  - `buildGroupedRows()`
  - `buildFlatRows()`
- The summary row construction at the end is especially easy to break if the row shape changes.

### `app/(app)/budgets/_components/budget-table/hooks/useBudgetSelection.ts`

- This is functionally solid, but it is a big hook (`13-340`).
- It combines selection rectangles, copy/paste, keyboard navigation, delete behavior, and stats aggregation in one place.
- The logic is inherently complex because of spreadsheet-style editing, but the hook would be easier to maintain if copy/paste parsing and keyboard navigation were split into smaller helpers.

### `app/(app)/budgets/_components/budget-table/hooks/useBudgetPersistence.ts`

- This hook is well isolated and easier to understand than the page-level alternatives.
- Sequential save/error accumulation is fine, but the code would benefit from a small pure mapper for the request payload and a helper for the sweetalert error HTML.

### `app/(app)/budgets/_components/budget-table/columns.tsx`

- Good separation of column definitions.
- The column list is long, but that is appropriate for the table feature.
- The column renderers could eventually share formatting helpers to reduce repeated `Intl.NumberFormat` calls.

### `app/(app)/budgets/_components/budget-table/formatters.tsx`

- This file already contains reusable formatting logic and is a good place to centralize more shared budget-table helpers.
- `getIconComponent` is duplicated elsewhere in the app; if this file expands, it could become the canonical icon helper for budgets.

### `app/(app)/analytics/page.tsx`

- The page is well organized overall and the tab routing is clear.
- The main issue is that the page still owns more filter state than the sidebar currently needs. The code already acknowledges this with a TODO (`57-60`), which is accurate.
- `buildContextSnapshot` and `handleRestoreContext` are useful, but they are fairly large and would be easier to test if extracted to helpers (`112-166`).
- Tab rendering repeats the same date-to-ISO conversion logic across each report branch (`168-249`). A small helper would reduce duplication.
- The analytics page is not broken; it just has an oversized filter/context surface area.

### `app/(app)/analytics/_components/AnalyticsFilterSidebar.tsx`

- This sidebar is much narrower than the page-level filter data object suggests.
- It only needs accounts, drafts, and saved filters, which reinforces the TODO in the analytics page about introducing a smaller analytics-specific filter hook.
- The panel itself is fine, but the parent page is passing in too much state.

### `app/(app)/debts/page.tsx`

- This page is fairly self-contained and maintainable.
- The biggest issue is that it duplicates the pattern used by the other filter-heavy pages: local state, a custom sort dropdown, desktop sidebar, and mobile offcanvas.
- The page is acceptable, but if you later split more filter pages, this would be a good candidate for a generic filter-shell layout.

### `app/(app)/settings/page.tsx`

- This is a simple master-detail shell and is mostly fine.
- It has a local source-of-truth issue: `activeSection` is initialized from the URL, but subsequent URL changes outside `handleSectionChange` will not automatically sync unless the component remounts.
- The navigation config is explicit and easy to follow.
- Good candidate for keeping as-is unless routing behavior becomes more dynamic.

### `app/(app)/settings/sections/CategoriesSection.tsx`

- This is the largest settings subsection and does a lot: load, search, render hierarchy, add/edit/delete, modal wiring, and icon resolution.
- The code is still readable, but it mixes CRUD orchestration with fairly detailed list rendering.
- `getIconComponent` is duplicated here and can be shared.
- `handleSaveCategory` duplicates create/edit payload assembly; a small payload builder would reduce drift.
- `renderCategoryItem` and the child rendering branch are very similar. A reusable item component would improve readability.

### `app/(app)/settings/sections/LabelsSection.tsx`

- Similar to categories: reasonably self-contained but still does list rendering, CRUD, modal control, and confirmation flows in one component.
- The delete flow and save flow are both a bit verbose, but not pathological.
- If you keep refactoring settings, categories and labels should probably share a common “settings list CRUD” pattern.

### `app/(app)/settings/sections/AutomaticRulesSection.tsx`
### `app/(app)/settings/sections/BillingSection.tsx`
### `app/(app)/settings/sections/HelpSection.tsx`
### `app/(app)/settings/sections/PrivacySection.tsx`
### `app/(app)/settings/sections/TemplatesSection.tsx`

- These are all placeholders or very small presentational stubs.
- They are fine as placeholders, but if the product expects these sections to ship soon, they should be marked clearly as unfinished rather than looking complete.
- No technical refactor required.

### `app/(app)/transfers/page.tsx`

- This was described in the earlier review as a minimal stub page.
- No notable complexity.

## Recommended refactor order

1. Extract shared transaction helpers:
   - date range → ISO conversion
   - name → ID resolution
   - record normalization/grouping
   - bulk filter payload builder
2. Split dashboard orchestration into a `useDashboardData` hook and a `useDashboardWidgets` composition layer.
3. Move budgets roll-up / search / sort logic into pure functions and keep the page focused on rendering and composition.
4. Narrow analytics filter state and move context snapshot helpers out of the page.
5. Clean up placeholder settings/auth copy after the structural work lands.

## Assumptions

- I treated page-specific supporting files under `app/(app)/.../_components` and `app/(app)/settings/sections` as in-scope because they directly support the pages being reviewed.
- This review is focused on maintainability, scalability, and readability rather than correcting runtime bugs.
- I did not run the app or tests; this is a static code review only.
