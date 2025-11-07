# Transactions Page - Categories & Accounts Data Flow

This note traces how category- and account-related data travels from the API layer until it reaches `DesktopFilterSidebar` in `src/views/Transactions/Transactions.tsx:1042-1068`.

---

## 1. API entry points

- **Categories**: `categoryService.fetchCategories` issues `apiService.get('/categories', { keyword })`, normalises IDs, refreshes the stored `personal_id`, and returns the raw `ApiCategoryResponse[]` (`src/services/categoryService.ts:177-194`). The shared `apiService` class wires in auth headers, retries, and token refresh logic before resolving the payload (`src/services/api.ts:92-220`).
- **Accounts**: `accountService.fetchAccounts` performs `apiService.get('/accounts')`, syncs the `personal_id` cache, and hands back `ApiAccountResponse[]` (`src/services/accountService.ts:150-178`).

Because both service methods return plain arrays, downstream hooks can stash them directly in React state without additional parsing.

---

## 2. Fetching & storing inside `useFilterData`

`TransactionsContent` loads every filter primitive via `useFilterData` (`src/views/Transactions/Transactions.tsx:183-214`). Inside the hook (`src/views/Transactions/hooks/useFilterData.ts:101-206`):

1. **Category load effect** (`src/views/Transactions/hooks/useFilterData.ts:101-147`):
   - Skips duplicate fetches with `categoriesFetchedRef`.
   - Calls `categoryService.fetchCategories()` (line 116), surfaces SweetAlert errors when nothing returns, and forwards the array into `setCategories` from `useCategoryData`.

2. **Account load effect** (`src/views/Transactions/hooks/useFilterData.ts:150-190`):
   - Uses `accountsFetchedRef` to avoid double-loading.
   - Invokes `accountService.fetchAccounts()` (line 161), persists the result in local `apiAccounts` state, and mirrors the same error-handling path.

3. **Account metadata bootstrap** (`src/views/Transactions/hooks/useFilterData.ts:192-206`):
   - Reads `ACCOUNT_METADATA_STORAGE_KEY` from `localStorage` and runs `buildAccountMetadata` so every selectable account always has a color/icon fallback.

The hook returns these datasets alongside setter functions, making them available to any page component that consumes `useFilterData`.

---

## 3. Category shaping via `useCategoryData`

`useCategoryData` (`src/views/Transactions/useCategoryData.tsx:165-213`) transforms the raw API array into dropdown-friendly structures:

- `categoryTree` (line 165) builds `{ parentName: [childNames...] }`, ensuring orphaned children still appear as standalone entries.
- `parentCategoryColors` (line 189) assigns each parent name a color, defaulting to `#6c757d`.
- `categoryIcons` (line 199) maps stored icon strings to actual `react-icons` components.
- `allCategories` (line 209) produces a flat list of display names for search/autocomplete.

These memoised values flow back through `useFilterData`, so any consuming screen (Transactions, Analytics, etc.) reuses the same derived structures.

---

## 4. Account shaping within `useFilterData`

Once `apiAccounts` is populated, the hook derives all account-facing helpers (`src/views/Transactions/hooks/useFilterData.ts:237-275`):

- `selectableAccounts` (lines 237-241) filters to active, named accounts and emits a plain string list for autocomplete.
- `accountTree` (lines 244-247) mirrors the category dropdown API by giving each account its own leaf node (`{ 'Cash Eko': [] }`), enabling the shared `CategoryDropdown` UI.
- `accountColors` (lines 249-259) prefers the API-provided color, falls back to metadata, and defaults to `#6c757d`.
- `accountIcons` (lines 262-275) translates stored icon keys into actual components using the `accountIconComponents` lookup.

All of these derived maps are bundled into the hook’s return object next to `setSelectedAccounts`, `setSortOption`, and the other filter setters.

---

## 5. Propagation into `DesktopFilterSidebar`

1. **Transactions page wiring**:
   - `TransactionsContent` destructures the hook output (`src/views/Transactions/Transactions.tsx:183-214`) and feeds the relevant props into `<DesktopFilterSidebar />` (`src/views/Transactions/Transactions.tsx:1042-1068`), including the various setters so the sidebar can mutate shared state.

2. **Sidebar consumption**:
   - `DesktopFilterSidebar` renders the category picker via `CategoryDropdown` with the category props (`src/views/Transactions/components/DesktopFilterSidebar.tsx:425-435`) and reuses the same component for the account picker (`src/views/Transactions/components/DesktopFilterSidebar.tsx:443-455`).
   - Both dropdowns call back into the setters from `useFilterData`, so selections immediately update `selectedCategories` / `selectedAccounts`, which the Transactions page then applies when filtering ledger data.

The end result is a straight-through pipeline:

```
apiService -> categoryService / accountService
        ->
useFilterData (effects) -> useCategoryData + local account state
        ->
TransactionsContent (props) -> DesktopFilterSidebar -> CategoryDropdown / Account dropdown
```

Use this map to pinpoint where categories or accounts can be intercepted, transformed, or extended before they surface inside the desktop filters.
