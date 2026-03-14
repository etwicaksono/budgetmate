# Refine Debts Page — Tab-Based Credit / Debit Layout

## Background

Currently, `app/(app)/debts/page.tsx` renders **all debt records** (both `lend` and `borrow` types) in a single flat list.
Users have to mentally separate "money I lent out" from "money I borrowed" while scrolling through one mixed feed.
The sidebar filter does have a **Type** dropdown that lets users isolate one type at a time, but this requires an extra interaction and hides the other view completely.

### Goal
Split the list into **two visually distinct tabs**:

| Tab | Maps to debt `type` |
|-----|---------------------|
| **Credit** | `lend` — money others owe you |
| **Debit** | `borrow` — money you owe others |

The **filter panel (status + counterparty search) is shared** — it sits outside the tabs and affects both tabs simultaneously. Switching tabs never clears the active filters.

---

## Proposed Changes

### Component / Data Flow Overview

```
DebtsPage (page.tsx)
 ├─ SummaryCards             ← unchanged (always shows totals across all active debts)
 ├─ Shared Filter Sidebar    ← status + counterparty filter (moved to page level, no Type filter)
 ├─ Nav.Tabs (Credit | Debit)← activeTab state lives here in page
 ├─ DebtTabPane[type="lend"]    ← receives shared filter as props, owns debts + pagination
 └─ DebtTabPane[type="borrow"]  ← receives shared filter as props, owns debts + pagination
 └─ Modals                   ← moved into each DebtTabPane
```

---

### Step 1 — Extract `DebtTabPane` sub-component

**File:** `src/components/debt/DebtTabPane.tsx` *(NEW)*

This component replaces the current right-side `Col` content, scoped to a single debt type. It does **not** own filter state — filters come in as props.

**Props interface:**
```ts
interface DebtTabPaneProps {
  debtType: 'lend' | 'borrow';
  statusFilter: string;
  counterpartyFilter: string;
  accounts: Account[];
  onMutated: () => void;
}
```

**Internal state (pagination + list only):**
```ts
const [debts, setDebts]         = useState<Debt[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError]         = useState<string | null>(null);
const [page, setPage]           = useState(1);
const [hasMore, setHasMore]     = useState(true);
// modals: showDebtModal, editDebt, showRepaymentModal, repaymentDebt,
//         showDetailModal, detailDebt, showIncreaseModal, increaseDebt
```

**Re-fetch trigger:**
The `useEffect` / `useCallback` for `fetchDebts` depends on `[statusFilter, counterpartyFilter, debtType]`. Whenever either shared filter prop changes, both mounted panes re-fetch from page 1 automatically.

```ts
const fetchDebts = useCallback(async (isLoadMore = false) => {
  const targetPage = isLoadMore ? page + 1 : 1;
  const response = await debtService.fetchDebts({
    page: targetPage,
    limit: 20,
    type: debtType,                           // fixed per pane
    status: statusFilter !== 'all' ? statusFilter : undefined,
    counterparty: counterpartyFilter || undefined,
  });
  // merge or replace debts, update page/hasMore
}, [debtType, statusFilter, counterpartyFilter, page]);

useEffect(() => { fetchDebts(); }, [fetchDebts]);
```

**Rendered structure:**
```
<Card>
  <Card.Header> N debts found | [+ New Debt] button </Card.Header>
  {/* loading / error / empty states */}
  <div className="debts-list">
    {debts.map(debt => <DebtCard ... />)}
  </div>
  {hasMore && <LoadMore button>}
</Card>
```

All modals (DebtModal, RepaymentModal, DebtDetailModal, DebtIncreaseModal) live **inside** `DebtTabPane`. The "New Debt" button pre-fills `DebtModal` with the pane's `debtType`.

---

### Step 2 — Update `src/components/debt/index.ts`

```ts
export * from './DebtTabPane';
```

---

### Step 3 — Refactor `app/(app)/debts/page.tsx`

**State to keep in the page:**
- `accounts` — loaded once, passed to both panes.
- `totalLent`, `totalBorrowed` — for summary cards.
- `activeTab: 'lend' | 'borrow'` — default `'lend'`.
- `statusFilter`, `counterpartyFilter` — **shared** filter state (the `typeFilter` state is fully removed).

**State / logic removed from page:**
- `debts`, `page`, `hasMore`, `typeFilter`
- All modal states (moved into `DebtTabPane`)
- The large `fetchDebts` is replaced by a focused `fetchSummary` function.

**`fetchSummary()` — dedicated summary fetcher:**
```ts
const fetchSummary = useCallback(async () => {
  const allActive = await debtService.fetchDebts({ limit: -1, status: 'active' });
  let lentOut = 0; let borrowIn = 0;
  allActive.data.forEach(d => {
    if (d.type === 'lend')   lentOut  += (d.remaining_amount || 0);
    if (d.type === 'borrow') borrowIn += (d.remaining_amount || 0);
  });
  setTotalLent(lentOut);
  setTotalBorrowed(borrowIn);
}, []);
```

**JSX layout after refactor:**
```tsx
<Container fluid className="py-4">
  {/* Page header — unchanged */}

  {/* Summary cards — unchanged */}
  <Row className="mb-4 g-3"> ... </Row>

  <Row>
    {/* Shared filter sidebar — visible when there's data or an active filter */}
    <Col lg={3} className="d-none d-lg-block mb-4">
      <Card className="border-0 debt-summary-card">
        <Card.Header>Filters</Card.Header>
        <Card.Body className="p-0 mt-2">
          <Accordion defaultActiveKey={['search', 'status']} alwaysOpen flush>
            <Accordion.Item eventKey="search">
              {/* counterpartyFilter input + ClearButton */}
            </Accordion.Item>
            <Accordion.Item eventKey="status">
              {/* statusFilter select */}
            </Accordion.Item>
            {/* ← Type filter item REMOVED (tabs handle it) */}
          </Accordion>
        </Card.Body>
      </Card>
    </Col>

    {/* Tab area */}
    <Col xs={12} lg={9}>
      {/* Tab strip */}
      <Nav variant="tabs" className="mb-0 debt-type-tabs">
        <Nav.Item>
          <Nav.Link active={activeTab === 'lend'} onClick={() => setActiveTab('lend')}>
            <FaArrowCircleUp className="me-2 text-success" /> Credit
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link active={activeTab === 'borrow'} onClick={() => setActiveTab('borrow')}>
            <FaArrowCircleDown className="me-2 text-danger" /> Debit
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Both panes always mounted; d-none hides the inactive one */}
      <div className={activeTab === 'lend' ? 'debt-tab-content' : 'debt-tab-content d-none'}>
        <DebtTabPane
          debtType="lend"
          statusFilter={statusFilter}
          counterpartyFilter={counterpartyFilter}
          accounts={accounts}
          onMutated={fetchSummary}
        />
      </div>
      <div className={activeTab === 'borrow' ? 'debt-tab-content' : 'debt-tab-content d-none'}>
        <DebtTabPane
          debtType="borrow"
          statusFilter={statusFilter}
          counterpartyFilter={counterpartyFilter}
          accounts={accounts}
          onMutated={fetchSummary}
        />
      </div>
    </Col>
  </Row>
</Container>
```

> **Why `d-none` instead of conditional rendering?**
> Conditional unmounting resets pagination state. Using `d-none` keeps each pane's
> scroll position and page cursor intact when switching tabs.

> **Filter reactivity:** When the user changes `statusFilter` or `counterpartyFilter` in the
> sidebar, both panes receive the new props and their internal `useEffect` automatically
> re-fetches from page 1 — even the inactive (hidden) pane updates in the background
> so it's ready when the user switches to it.

---

### Step 4 — Update `Debts.css`

```css
/* Tab strip */
.debt-type-tabs .nav-link {
  border-bottom: none;
  color: #6c757d;
  font-weight: 500;
  padding: 0.6rem 1.25rem;
  transition: color 0.15s ease;
}
.debt-type-tabs .nav-link:hover { color: #212529; }
.debt-type-tabs .nav-link.active {
  color: #059669;
  border-color: #dee2e6 #dee2e6 #fff;
  font-weight: 600;
}

/* Panel below tabs — seamless connection */
.debt-tab-content {
  border: 1px solid #dee2e6;
  border-top: none;
  border-radius: 0 0 0.375rem 0.375rem;
  background: #fff;
}
```

---

### Step 5 — Debt Modal pre-fill type

When "New Debt" is opened from inside `DebtTabPane`, the modal pre-selects the
pane's type. If `DebtModal.tsx` doesn't yet accept a `defaultType` prop, add one:

```ts
// DebtModal.tsx props addition
defaultType?: 'lend' | 'borrow';
```

`DebtTabPane` passes `defaultType={debtType}` to `<DebtModal>`. Users can still
change the type inside the modal if needed.

---

## Impact Summary

| Concern | Before | After |
|---------|--------|-------|
| Mixed list | All types in one list | Separated by tab |
| Type sidebar filter | Required to separate types | Removed — tab controls it |
| Status / counterparty filter | Per-page (global) | Still global — shared across both tabs |
| Pagination | Single cursor | One cursor per tab (independent) |
| Modals | Centralized in page | Inside each `DebtTabPane` |
| Summary cards | Unchanged | Unchanged |
| New Debt pre-fill | Always blank type | Pre-fills the current tab's type |

---

## Verification Plan

### Manual Testing in Browser

1. Navigate to the **Debts** page — two tabs ("Credit", "Debit") appear below summary cards; "Credit" is active by default.
2. **Credit tab** shows only `lend` debts; **Debit tab** shows only `borrow` debts.
3. Apply a **counterparty search** in the sidebar — both tabs filter by the same value (switch tabs and confirm the search applies).
4. Apply a **status filter** — confirm both tabs respect it.
5. Clear filters — both tabs return to their unfiltered list.
6. Scroll / use **Load More** on Credit tab, switch to Debit tab, switch back — Credit tab **retains its pagination position**.
7. Click **"New Debt"** on Credit tab → modal opens with **Lend** pre-selected.
8. Click **"New Debt"** on Debit tab → modal opens with **Borrow** pre-selected.
9. Record a repayment or delete a debt → summary cards (Total Lent / Total Borrowed) update correctly.
10. Verify responsive layout on mobile — filter sidebar hidden below `lg`, tabs scroll horizontally if needed.
