# Debts Management - UI Design Specification

This document describes the UI design for the Debts Management feature, following the existing app's design system: React Bootstrap, custom CSS, `react-icons/fa`, SweetAlert2, `react-number-format`.

---

## 1. Sidebar Navigation

Add "Debts" item after "Transfers" in the sidebar navigation array:

```
Dashboard  (📊)
Transactions (💳)
Accounts   (🏦)
Categories (📁)
Transfers  (🔄)
Debts      (🤝)   <-- NEW
Analytics  (📈)
Settings   (⚙️)
```

Active state uses the same green left-border (`#00a86b`) and white background highlight as other nav items.

---

## 2. Debts Page Layout (`/debts`)

Follows the Transactions page pattern: `Container fluid` > `Row` > `Col lg={3}` sidebar + `Col lg={9}` main content.

### 2.1 Filter Sidebar (Desktop, left column)

Reuse the `DesktopFilterSidebar` pattern with debt-specific filters:

| Filter Section | Component | Options |
|----------------|-----------|---------|
| **Search** | Text input | Search by counterparty name or description |
| **Type** | Checkbox group | Lend, Borrow |
| **Status** | Checkbox group | Active, Settled, Cancelled |
| **Accounts** | Checkbox group | User's accounts (with icons & colors) |

Each section inside an `Accordion` with `alwaysOpen`, matching the Transactions filter sidebar.

### 2.2 Summary Cards Row (top of main content)

Three summary cards in a `Row` > `Col xs={12} md={4}` layout:

```
+-----------------------+  +-----------------------+  +-----------------------+
|  Total Lent           |  |  Total Borrowed       |  |  Net Position         |
|  (FaArrowCircleUp)    |  |  (FaArrowCircleDown)  |  |  (FaBalanceScale)     |
|                       |  |                       |  |                       |
|  Rp 5,000,000         |  |  Rp 2,000,000         |  |  Rp 3,000,000         |
|  3 active debts       |  |  2 active debts       |  |  You are owed more    |
+-----------------------+  +-----------------------+  +-----------------------+
```

**Card styling:**
- React Bootstrap `Card` with `shadow-sm`, `border-0`, `rounded-3`
- Icon on the left (`me-3`) with a colored circle background (`rounded-circle p-2`)
  - Lent: green icon bg (`bg-success bg-opacity-10`, icon `text-success`)
  - Borrowed: red icon bg (`bg-danger bg-opacity-10`, icon `text-danger`)
  - Net: blue icon bg (`bg-primary bg-opacity-10`, icon `text-primary`)
- Amount in `h4` with `fw-bold`
- Subtitle in `small text-muted`

### 2.3 Period Navigation

Reuse the `PeriodNavigation` + `PeriodRangeSelector` component, centered above the debts list.

### 2.4 Debts List

Inside a `Card` > `Card.Body`, similar to the Transactions page.

**List header** (inside Card.Body, top):
- Left: Count badge ("5 debts") 
- Right: "New Debt" button (`Button variant="success"` with `FaPlus` icon)

**Each debt item** rendered as a row/card within the list:

```
+------------------------------------------------------------------------+
| [Lend Badge]  John Doe                          Rp 5,000,000 (total)   |
|               Wallet Account  |  Jan 15, 2026   Rp 3,000,000 remaining |
|               "Loan for car repair"                                     |
|               [====60%==========------]  60% repaid                     |
|                                    [Repay] [Detail] [Edit] [Delete]     |
+------------------------------------------------------------------------+
```

**Debt item details:**
- **Type badge**: `Badge bg="success"` for Lend, `Badge bg="danger"` for Borrow. Pill style.
- **Counterparty name**: `fw-semibold fs-6` next to the badge
- **Amount (total)**: Right-aligned, `fw-bold`. Green for Lend, Red for Borrow.
- **Remaining amount**: Below total, `small text-muted`. E.g., "Rp 3,000,000 remaining"
- **Account name**: `small text-muted` with account icon
- **Date**: `small text-muted`, formatted like "Jan 15, 2026"
- **Description**: `small text-muted`, truncated to 1 line with ellipsis
- **Progress bar**: React Bootstrap `ProgressBar` 
  - Green (`variant="success"`) for Lend debts
  - Red (`variant="danger"`) for Borrow debts
  - Show percentage text on the right: "60% repaid"
  - Height: ~8px (`style={{ height: '8px' }}`)
- **Action buttons**: Right-aligned row of small buttons
  - "Repay" (`Button variant="outline-success" size="sm"`, `FaMoneyBillWave` icon) - only if status === "active"
  - "Detail" (`Button variant="outline-info" size="sm"`, `FaEye` icon)
  - "Edit" (`Button variant="outline-primary" size="sm"`, `FaPencilAlt` icon) - only if status === "active"
  - "Delete" (`Button variant="outline-danger" size="sm"`, `FaTrash` icon)

**Settled debts** should have a muted/faded appearance:
- Wrap in a `div` with `opacity-75`
- Show `Badge bg="secondary"` with "Settled" text instead of progress bar
- Hide "Repay" and "Edit" buttons

**Cancelled debts** similarly muted with `Badge bg="dark"` "Cancelled".

**Empty state**: Reuse `EmptyState` pattern:
```
(FaHandshake icon, large, text-muted)
"No debts yet"
"Track money you've lent or borrowed"
[New Debt] button
```

---

## 3. Debt Modal (`DebtModal.tsx`)

React Bootstrap `Modal`, `size="lg"`, `centered`, `backdrop="static"`.

### 3.1 Modal Header
- Title: "New Debt" (create) or "Edit Debt" (edit)
- Close button (X)

### 3.2 Modal Body

**Type Toggle** (top of form, full width):
```
+----------------------------+----------------------------+
|         LEND               |         BORROW             |
|   (FaArrowCircleUp)        |   (FaArrowCircleDown)      |
+----------------------------+----------------------------+
```
- `ButtonGroup className="w-100 mb-3"`
- Lend: `Button variant="success"` when selected, `variant="outline-secondary"` when not
- Borrow: `Button variant="danger"` when selected, `variant="outline-secondary"` when not
- Similar to `TransactionTypeToggle` but 2 options

**Form Fields** (inside `Form`, using `Row` > `Col`):

| Field | Component | Layout |
|-------|-----------|--------|
| **Counterparty** | `Form.Control type="text"` with `FaUser` prepended via `InputGroup` | `Col xs={12}` |
| **Account** | `Form.Select` (reuse account dropdown pattern) | `Col xs={12} md={6}` |
| **Amount** | `NumericFormat` with `Form.Control` (same as TransactionModal) | `Col xs={12} md={6}` |
| **Date & Time** | `Form.Control type="datetime-local"` | `Col xs={12} md={6}` |
| **Description** | `Form.Control as="textarea" rows={2}` | `Col xs={12}` |

All fields use `Form.Group className="mb-3"` with `Form.Label`.

### 3.3 Modal Footer

Three buttons following existing TransactionModal pattern:
- "Cancel" (`Button variant="secondary"`) - left side
- "Save & Create Another" (`Button variant="outline-success"`) - right side, only in create mode
- "Save" (`Button variant="success"`) - right side

Loading state on save buttons: Show `Spinner as="span" animation="border" size="sm"` with "Saving..." text.

---

## 4. Repayment Modal (`RepaymentModal.tsx`)

React Bootstrap `Modal`, `size="md"`, `centered`, `backdrop="static"`.

### 4.1 Modal Header
- Title: "Record Repayment"

### 4.2 Debt Info Summary (top of body, read-only)

An `Alert variant="info"` box showing the parent debt context:

```
+----------------------------------------------------------+
|  Lend to John Doe                                        |
|  Total: Rp 5,000,000  |  Remaining: Rp 3,000,000        |
|  [====60%==========------]                               |
+----------------------------------------------------------+
```

### 4.3 Form Fields

| Field | Component | Notes |
|-------|-----------|-------|
| **Account** | `Form.Select` | Default to same account as original debt |
| **Amount** | `NumericFormat` | Max validation = remaining amount. Show helper text: "Max: Rp 3,000,000" |
| **Date & Time** | `Form.Control type="datetime-local"` | Default to now |
| **Description** | `Form.Control as="textarea" rows={2}` | Optional. Placeholder: "Repayment note..." |

### 4.4 Modal Footer
- "Cancel" (`Button variant="secondary"`)
- "Record Repayment" (`Button variant="success"`)

---

## 5. Debt Detail Modal (`DebtDetailModal.tsx`)

React Bootstrap `Modal`, `size="lg"`, `centered`.

### 5.1 Modal Header
- Title: "Debt Details"
- Status badge next to title: `Badge` (Active=green, Settled=secondary, Cancelled=dark)

### 5.2 Info Section (top)

Two-column layout with key-value pairs:

```
Type:          [Lend Badge]          Counterparty:  John Doe
Account:       Wallet                Date:          Jan 15, 2026
Total Amount:  Rp 5,000,000          Remaining:     Rp 3,000,000
Description:   Loan for car repair
```

Using `Row` > `Col md={6}` with `small text-muted` labels and `fw-semibold` values.

### 5.3 Progress Section

Full-width `ProgressBar` with percentage label:
```
Repaid: Rp 2,000,000 of Rp 5,000,000 (40%)
[========40%========------------------]
```

### 5.4 Repayment History Timeline

A vertical timeline showing each repayment:

```
  o--- Jan 20, 2026 ------- Rp 1,000,000
  |    Wallet Account
  |    "First repayment installment"
  |
  o--- Feb 10, 2026 ------- Rp 1,000,000
  |    Wallet Account
  |    "Second installment"
  |
  (End)
```

Implementation:
- Each repayment is a `div` with a left-border (`border-start border-3 border-success ps-3 mb-3`)
- Circle dot: `position-relative` with a small `rounded-circle` element
- Date in `fw-semibold`, amount in `fw-bold text-success` (for lend) or `text-danger` (for borrow)
- Account and description in `small text-muted`

If no repayments yet: `text-center text-muted py-3` "No repayments recorded yet"

### 5.5 Modal Footer
- "Close" (`Button variant="secondary"`)
- "Record Repayment" (`Button variant="success"`) - only if debt status is "active"

---

## 6. SweetAlert2 Confirmations

### Delete Debt
```javascript
Swal.fire({
  icon: 'warning',
  title: 'Delete Debt',
  html: `
    <p>Are you sure you want to delete this debt?</p>
    <div class="text-start mt-3">
      <strong>Lend to John Doe</strong><br>
      <small class="text-muted">Rp 5,000,000 - 3 repayments will also be deleted</small>
    </div>
  `,
  showCancelButton: true,
  confirmButtonText: 'Yes, delete it',
  cancelButtonText: 'Cancel',
  confirmButtonColor: '#dc3545',
  cancelButtonColor: '#6c757d',
  reverseButtons: true
});
```

### Settle Debt Manually
```javascript
Swal.fire({
  icon: 'question',
  title: 'Settle Debt',
  text: 'Mark this debt as settled? Remaining balance: Rp 1,000,000',
  showCancelButton: true,
  confirmButtonText: 'Yes, settle it',
  confirmButtonColor: '#198754',
  cancelButtonColor: '#6c757d',
  reverseButtons: true
});
```

### Success Toast
```javascript
Swal.fire({
  toast: true,
  position: 'top-end',
  icon: 'success',
  title: 'Debt created successfully',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});
```

---

## 7. CSS Classes (new, in `Debts.css`)

```css
/* Debt card item */
.debt-item {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.2s ease;
}

.debt-item:hover {
  background-color: #f8f9fa;
}

.debt-item:last-child {
  border-bottom: none;
}

/* Debt type badges */
.debt-badge-lend {
  background-color: #198754;
  color: white;
}

.debt-badge-borrow {
  background-color: #dc3545;
  color: white;
}

/* Summary card icon containers */
.debt-summary-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Progress bar custom height */
.debt-progress {
  height: 8px;
  border-radius: 4px;
}

/* Repayment timeline */
.repayment-timeline-item {
  position: relative;
  padding-left: 24px;
  padding-bottom: 16px;
  border-left: 2px solid #dee2e6;
  margin-left: 8px;
}

.repayment-timeline-item:last-child {
  border-left-color: transparent;
}

.repayment-timeline-dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #198754;
  background-color: white;
}

.repayment-timeline-dot.borrow {
  border-color: #dc3545;
}

/* Settled/cancelled debt muted state */
.debt-item-inactive {
  opacity: 0.65;
}

/* Debt detail key-value pair */
.debt-detail-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 2px;
}

.debt-detail-value {
  font-weight: 600;
  margin-bottom: 12px;
}
```

---

## 8. Color & Icon Reference

| Element | Color | Icon |
|---------|-------|------|
| Lend (credit) | `#198754` (Bootstrap success green) | `FaArrowCircleUp` |
| Borrow (debit) | `#dc3545` (Bootstrap danger red) | `FaArrowCircleDown` |
| Net positive | `#0d6efd` (Bootstrap primary blue) | `FaBalanceScale` |
| Sidebar nav | Same as other items | `FaHandshake` |
| New Debt button | `variant="success"` | `FaPlus` |
| Repay button | `variant="outline-success"` | `FaMoneyBillWave` |
| Detail button | `variant="outline-info"` | `FaEye` |
| Edit button | `variant="outline-primary"` | `FaPencilAlt` |
| Delete button | `variant="outline-danger"` | `FaTrash` |
| Empty state | `text-muted` | `FaHandshake` (large) |

---

## 9. Responsive Behavior

| Breakpoint | Layout |
|------------|--------|
| `lg` and up | 3-col sidebar + 9-col main. Summary cards in 3 columns. Action buttons show text + icon. |
| `md` | No sidebar (hidden). Summary cards in 3 columns. Action buttons show icon only (use `d-none d-md-inline` for text). |
| `xs` / `sm` | Summary cards stack to 1 column. Debt items show compact view. Action buttons as icon-only or dropdown menu (`Dropdown` with `FaEllipsisV`). |

Mobile filter access: Use a `Button` that triggers an `Offcanvas` with the filter content (same pattern as Transactions mobile filters if they exist).

---

## 10. Component Tree

```
DebtsPage
  |-- PeriodNavigationProvider
  |     |-- DebtsContent
  |           |-- DesktopFilterSidebar (reuse, with debt filters)
  |           |-- PeriodNavigation + PeriodRangeSelector
  |           |-- DebtSummaryCards
  |           |     |-- SummaryCard (Total Lent)
  |           |     |-- SummaryCard (Total Borrowed)
  |           |     |-- SummaryCard (Net Position)
  |           |-- Card (debts list container)
  |           |     |-- DebtsListHeader (count + New Debt button)
  |           |     |-- DebtItem (repeated for each debt)
  |           |     |     |-- Badge (type)
  |           |     |     |-- ProgressBar
  |           |     |     |-- Action buttons
  |           |     |-- EmptyState (when no debts)
  |           |-- DebtModal (create/edit)
  |           |     |-- DebtTypeToggle
  |           |     |-- Form fields
  |           |-- RepaymentModal
  |           |     |-- Debt info summary
  |           |     |-- Form fields
  |           |-- DebtDetailModal
  |                 |-- Info section
  |                 |-- ProgressBar
  |                 |-- Repayment timeline
```
