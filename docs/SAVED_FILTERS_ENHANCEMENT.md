# Saved Filters Enhancement Plan

## Overview

Allow users to **save, name, load, and delete** filter presets across pages (Transactions, Analytics, Debts).
Filter state is persisted in the **backend database** (per user), so it is available across devices and sessions.

Each saved filter captures a **structural/categorical** snapshot — ephemeral fields like search text and amount range are intentionally excluded. Filters are **global** (not tied to any specific page).

Saved fields:
- `selectedCategoryIds` — category IDs (stable across renames)
- `selectedAccountIds` — account IDs (stable across renames)
- `selectedCurrencies` — currency codes (e.g. `"IDR"`, stable strings)
- `selectedLabelIds` — label IDs
- `sortOption`

> **Why IDs, not names?** If a user renames "Food" → "Dining", a name-based saved filter would silently stop matching. IDs are immutable, so renames never break saved filters. When loading, the frontend resolves IDs → names using the data already fetched by `useFilterData`. Any ID whose entity was deleted is gracefully skipped.

---

## Data Model

### `SavedFilter` (frontend type)

```ts
interface SavedFilter {
  id: string;
  name: string;
  filters: {
    selectedCategoryIds?: string[];   // category IDs
    selectedAccountIds?: string[];    // account IDs
    selectedCurrencies?: string[];    // e.g. ["IDR", "USD"]
    selectedLabelIds?: string[];      // label IDs
    sortOption?: SortValue;
  };
  created_at: string;
  updated_at: string;
}
```

### Backend API Contract

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/saved-filters` | List all saved filters for the authenticated user |
| `POST` | `/saved-filters` | Create a new saved filter |
| `PUT` | `/saved-filters/:id` | Rename or update a saved filter |
| `DELETE` | `/saved-filters/:id` | Delete a saved filter |

**POST / PUT body:**
```json
{
  "name": "My weekend filters",
  "filters": {
    "selectedCategoryIds": ["cat-abc123", "cat-def456"],
    "selectedAccountIds": ["acc-xyz789"],
    "sortOption": "timeDesc"
  }
}
```

---

## Proposed Changes

### Frontend

---

#### [NEW] `src/services/savedFilterService.ts`

A new service class — modelled after `labelService.ts` — that wraps the `/saved-filters` API:

- `fetchSavedFilters()` → `SavedFilter[]`
- `createSavedFilter(payload)` → `SavedFilter`
- `updateSavedFilter(id, payload)` → `SavedFilter`
- `deleteSavedFilter(id)` → `void`

---

#### [NEW] `src/hooks/useSavedFilters.ts`

A custom hook that:
- Calls `savedFilterService.fetchSavedFilters()` on mount
- Exposes `savedFilters`, `saveCurrentFilter(name)`, `loadFilter(id)`, `deleteFilter(id)`, `renameFilter(id, name)`
- On **save**: converts current selected category/account *names* → IDs using the data from `useFilterData` before persisting
- On **load**: resolves stored IDs → names (using the same data) so they can be written back into `useFilterData`; silently drops any IDs whose entity no longer exists

---

#### [MODIFY] `src/components/FilterSidebar/DesktopFilterSidebar.tsx`

Add a **"Saved Filters"** panel section above the reset button. It includes:
- A **"Save current filters"** button that opens an inline name input + confirm
- A list of saved filter pills/rows with:
  - **Name** (click to load)
  - **Delete** icon button (×)
- Loading and empty states

New props added to `DesktopFilterSidebarProps`:
```ts
savedFilters?: SavedFilter[];
onSaveFilter?: (name: string) => void;
onLoadFilter?: (filter: SavedFilter) => void;
onDeleteFilter?: (id: string) => void;
savedFiltersLoading?: boolean;
```

---

#### [MODIFY] `app/(app)/transactions/page.tsx`

Wire up `useSavedFilters` hook and pass the new props to `DesktopFilterSidebar`.

---

#### [MODIFY] `app/(app)/analytics/page.tsx`

Wire up `useSavedFilters` hook and pass the new props to `DesktopFilterSidebar`.

---

### Backend

> The frontend team is responsible for the API contract definition above. Backend implementation (model, migration, controller, routes) follows the standard REST pattern already established in this app.

**Expected DB table: `saved_filters`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `name` | VARCHAR(100) | |
| `filters` | JSONB | blob of filter state (categories, accounts, currencies, labels, sort) |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

---

## UI / UX Design

A **"🔖 Saved Filters"** dropdown button sits at the top of the sidebar body (above the existing filter fields). Clicking it opens a dropdown menu — consistent with the existing `SortDropdown` pattern in the sidebar.

```
┌─────────────────────────────────────┐
│  Transactions                  ⚙ +  │  ← sidebar header (existing)
├─────────────────────────────────────┤
│  [ 🔖 Saved Filters         ▾ ]     │  ← new dropdown button
├─────────────────────────────────────┤  (when open ↓)
│  ┌───────────────────────────────┐  │
│  │ ✓ My work expenses       [×] │  │  ← active filter highlighted
│  │   Weekend food           [×] │  │
│  │ ─────────────────────────── │  │
│  │ + Save current filters       │  │  ← save action at bottom
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  Search …                           │  ← existing filters unchanged
│  Sort by …                          │
│  …                                  │
├─────────────────────────────────────┤
│  [ Reset all filters ]              │
└─────────────────────────────────────┘
```

- The dropdown button label shows the active saved filter name if one is loaded (e.g. `🔖 My work expenses ▾`), otherwise `🔖 Saved Filters ▾`.
- Clicking a filter item **instantly applies** it and closes the dropdown.
- **"+ Save current filters"** opens a small inline name input inside the dropdown, with Save / Cancel.
- The active saved filter row shows a checkmark (✓) indicator.
- Each row has a delete (×) icon on the right; clicking it removes the filter without closing the dropdown.

---

## Verification Plan

### Manual Testing (Browser)

1. Start the dev server: `npm run dev` (or `make start` from the project root)
2. Open the Transactions page → expand the filter sidebar (desktop)
3. Select some categories, accounts, and a sort option
4. Click **"Save current filters"** → enter a name → confirm
5. Verify the saved filter appears in the list
6. Reset filters
7. Click the saved filter name → verify categories, accounts, currencies, labels and sort are restored
8. Navigate to the Analytics page → verify the same saved filter is available and applies correctly
9. Click the delete (×) button → verify it is removed from the list
10. Refresh the page → verify the saved filter still appears (persisted in DB)
11. Log in from a different browser session → verify the saved filter is available

### API Contract Testing

Use any REST client (e.g. Thunder Client, Postman, or `curl`) with a valid auth token:

```bash
# List
GET /saved-filters

# Create
POST /saved-filters
{ "name": "Test", "filters": { "sortOption": "timeAsc", "selectedCategoryIds": ["cat-abc123"] } }

# Update
PUT /saved-filters/:id
{ "name": "Renamed" }

# Delete
DELETE /saved-filters/:id
```

### Automated Tests (once backend is implemented)

- Unit test `useSavedFilters` hook with a mocked `savedFilterService`
- Unit test `savedFilterService` methods with mocked `apiClient`

---

## Implementation Order

1. **Backend** — DB migration → model → controller → routes
2. **Frontend: Service** — `savedFilterService.ts`
3. **Frontend: Hook** — `useSavedFilters.ts`
4. **Frontend: UI** — `DesktopFilterSidebar.tsx` new section + props
5. **Frontend: Pages** — wire up Transactions and Analytics pages
