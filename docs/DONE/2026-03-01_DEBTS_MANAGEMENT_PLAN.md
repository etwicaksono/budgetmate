# Debts Management Feature - Implementation Plan

## Overview

Add a credit-debit (debts) management system that allows users to track money lent to or borrowed from people/entities. Each debt creates a **single linked transaction** (unlike transfers which create two). Debts support partial repayments and track remaining balance over time.

**Key design decision**: The `Debt` table does NOT store `amount`. All amounts are stored in the linked `Transaction` record. The debt's amount is derived from its transaction, and remaining balance is computed from the original transaction amount minus the sum of repayment transaction amounts.

### Debt Behavior

- **Lend (credit)**: User lends money to someone. Creates an **expense transaction** (negative amount) from the user's account. The counterparty owes the user.
- **Borrow (debit)**: User borrows money from someone. Creates an **income transaction** (positive amount) to the user's account. The user owes the counterparty.
- **Repayment**: A subsequent debt record linked to the original. Lend repayment = income (money returned to user). Borrow repayment = expense (user pays back).

---

## 1. Database Schema (Prisma)

### New `Debt` Model

```prisma
model Debt {
  id              String    @id @default(cuid())
  user_id         String
  personal_id     BigInt
  date            DateTime  @db.Timestamptz
  type            String    @db.VarChar(20)    // "lend" or "borrow"
  account_id      String
  counterparty    String    @db.VarChar(255)   // Person/entity name
  // NOTE: No amount field - amount is stored in the linked Transaction record
  description     String?   @db.Text
  status          String    @default("active") @db.VarChar(20) // "active", "settled", "cancelled"
  parent_debt_id  String?                       // For repayments: links to original debt
  position        Json?
  created_at      DateTime  @default(now()) @db.Timestamptz
  updated_at      DateTime  @updatedAt @db.Timestamptz
  created_by      String?   @db.VarChar(64)
  updated_by      String?   @db.VarChar(64)

  // Relations
  user          User          @relation(fields: [user_id], references: [id], onDelete: Cascade)
  account_rel   Account       @relation(fields: [account_id], references: [id], onDelete: Cascade)
  transactions  Transaction[]
  parent_debt   Debt?         @relation("DebtRepayments", fields: [parent_debt_id], references: [id], onDelete: SetNull)
  repayments    Debt[]        @relation("DebtRepayments")

  @@unique([user_id, personal_id])
  @@index([user_id])
  @@index([account_id])
  @@index([parent_debt_id])
  @@index([counterparty])
  @@index([status])
}
```

### Modified Models

**Transaction model** - Add `debt_id` field:
```prisma
debt_id    String?
debt       Debt?     @relation(fields: [debt_id], references: [id], onDelete: SetNull)
@@index([debt_id])
```

**User model** - Add relation:
```prisma
debts    Debt[]
```

**Account model** - Add relation:
```prisma
debts    Debt[]
```

### Migration

- Create a new Prisma migration via `npx prisma migrate dev --name add_debts_table`

---

## 2. SequenceService Update

**File**: `src/lib/db/sequence.ts`

- Add `'debt'` to the `EntityType` union: `type EntityType = 'transaction' | 'account' | 'category' | 'transfer' | 'label' | 'debt'`
- Add `case 'debt'` to `fetchMaxIdFromDb` switch statement querying `prisma.debt`

---

## 3. Validation Schema

**New file**: `src/lib/validation/debt.ts`

```
CreateDebtSchema:
  - date: z.string().datetime()
  - type: z.enum(["lend", "borrow"])
  - account_id: z.string() (cuid validation)
  - amount: z.number().positive()            // Passed to the linked Transaction, NOT stored in Debt
  - counterparty: z.string().min(1).max(255)
  - description: z.string().optional()
  - parent_debt_id: z.string().optional() (for repayments)

UpdateDebtSchema:
  - date, amount, description, status: all optional  // amount update goes to the linked Transaction
  
CreateRepaymentSchema:
  - date: z.string().datetime()
  - account_id: z.string()
  - amount: z.number().positive()            // Stored in the repayment's linked Transaction
  - description: z.string().optional()
```

---

## 4. API Routes

### `app/api/v1/debts/route.ts` (GET, POST)

**GET** - List debts with filters:
- Query params: `status`, `type`, `counterparty`, `start_date`, `end_date`, `page`, `limit`, `sort_by`, `sort_order`
- Always filter by `user_id`
- Include: `account_rel`, `transactions`, `repayments` (with their transactions, for calculating remaining balance)
- Transform response to include computed fields:
  - `amount` = `Math.abs(debt.transactions[0].amount)` (derived from the linked transaction)
  - `remaining_amount` = `amount` - sum of `Math.abs(repayment.transactions[0].amount)` for each repayment

**POST** - Create a new debt:
1. Validate with `CreateDebtSchema`
2. Verify account belongs to user and is active
3. Get next personal IDs via `SequenceService` (one for debt, one for transaction)
4. Atomic `prisma.$transaction`:
   - Create `Debt` record
   - Create linked `Transaction`:
     - If `type === "lend"`: transaction type = `"debt_out"`, amount = `-Math.abs(amount)` (money leaving user's account)
     - If `type === "borrow"`: transaction type = `"debt_in"`, amount = `+Math.abs(amount)` (money entering user's account)
   - Set `debt_id` on the transaction
5. Return created debt with relations

### `app/api/v1/debts/[id]/route.ts` (GET, PUT, DELETE)

**GET** - Fetch single debt with repayment history and remaining balance

**PUT** - Update debt (description, date, status) and optionally the amount on the linked transaction
- If amount is provided, update the linked Transaction's amount atomically
- Also update the linked transaction's date/description if changed
- If status changed to "settled", validate remaining_amount === 0 (or allow manual settle)

**DELETE** - Delete debt and its linked transaction atomically

### `app/api/v1/debts/[id]/repayments/route.ts` (POST)

**POST** - Record a repayment:
1. Validate with `CreateRepaymentSchema`
2. Verify parent debt exists, belongs to user, and is active
3. Calculate remaining balance; validate repayment doesn't exceed it
4. Atomic `prisma.$transaction`:
   - Create new `Debt` record with `parent_debt_id` set (this IS the repayment record)
   - Create linked `Transaction`:
     - If original was "lend": repayment transaction type = `"debt_in"`, amount = `+Math.abs(amount)` (money returning to user)
     - If original was "borrow": repayment transaction type = `"debt_out"`, amount = `-Math.abs(amount)` (user paying back)
   - If fully repaid (remaining === 0), auto-update parent debt status to "settled"
5. Return repayment record

---

## 5. Frontend Service

**New file**: `src/services/debtService.ts`

```typescript
interface Debt {
  id, personal_id, date, type, account_id, account,
  counterparty, description, status, parent_debt_id,
  repayments: Debt[], transactions: Transaction[],
  // Computed fields (derived from linked transactions):
  amount: number,           // From Math.abs(transactions[0].amount)
  remaining_amount: number, // amount - sum(repayment transaction amounts)
  created_at, updated_at
}

class DebtService {
  fetchDebts(filters?) -> Debt[]
  createDebt(data) -> Debt
  updateDebt(id, data) -> Debt
  deleteDebt(id) -> void
  createRepayment(debtId, data) -> Debt
}
```

---

## 6. Constants Update

**File**: `src/utils/constants.ts`

- Add `DEBT_TYPES = { LEND: 'lend', BORROW: 'borrow' } as const`
- Add `DEBT_STATUSES = { ACTIVE: 'active', SETTLED: 'settled', CANCELLED: 'cancelled' } as const`
- Add `debt` colors to `COLORS` (e.g., purple/violet theme for debts)
- Update `TRANSACTION_TYPES` to include `DEBT_IN: 'debt_in', DEBT_OUT: 'debt_out'`
- Add `debtsPerPage: 20` to `APP_CONFIG.pagination`

---

## 7. Debts Page

**New file**: `app/(app)/debts/page.tsx`

A dedicated debts management page with:

### Page Layout
- **PageHeader**: Title "Debts", description "Track money you've lent or borrowed", action button "New Debt"
- **Summary Cards** (top of page, amounts computed from linked transactions):
  - Total Lent (active) - how much others owe you (sum of remaining from lend debts)
  - Total Borrowed (active) - how much you owe others (sum of remaining from borrow debts)
  - Net position (total lent remaining - total borrowed remaining)
- **Filter bar**: Status filter (Active/Settled/All), Type filter (Lend/Borrow/All), Counterparty search
- **Debts list**: Cards showing each debt with:
  - Counterparty name, type badge (Lend/Borrow), amount, remaining amount
  - Progress bar (repaid amount / total amount)
  - Account name, date
  - Actions: View details, Record repayment, Edit, Delete
- **EmptyState** when no debts exist

### Debt Modal (`src/components/debt/DebtModal.tsx`)
- Form fields:
  - Type toggle: Lend / Borrow (similar to TransactionTypeToggle but 2 options)
  - Account selector (reuse `AccountSelect`)
  - Amount input (reuse `AmountInput`)
  - Counterparty name (text input)
  - Date & time (datetime-local)
  - Description (textarea, optional)
- Buttons: Save, Save & Create Another, Cancel (following existing modal pattern)

### Repayment Modal (`src/components/debt/RepaymentModal.tsx`)
- Shows original debt info (counterparty, type, total amount, remaining)
- Form fields:
  - Account selector (default to same account as original debt)
  - Amount input (max = remaining amount)
  - Date & time
  - Description (optional)
- Button: Record Repayment

### Debt Detail View (`src/components/debt/DebtDetailModal.tsx`)
- Shows full debt info
- Repayment history timeline
- Remaining balance with progress visualization

---

## 8. Sidebar Navigation Update

**File**: `src/components/Sidebar.tsx`

Add debt nav item (after Transfers):
```typescript
{ name: 'Debts', href: '/debts', icon: FaHandHoldingUsd }
```

---

## 9. File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `prisma/migrations/xxx_add_debts_table/` | Prisma migration |
| `src/lib/validation/debt.ts` | Zod validation schemas |
| `app/api/v1/debts/route.ts` | GET (list) + POST (create) |
| `app/api/v1/debts/[id]/route.ts` | GET (detail) + PUT (update) + DELETE |
| `app/api/v1/debts/[id]/repayments/route.ts` | POST (create repayment) |
| `src/services/debtService.ts` | Frontend API service |
| `app/(app)/debts/page.tsx` | Debts page |
| `src/components/debt/DebtModal.tsx` | Create/edit debt modal |
| `src/components/debt/RepaymentModal.tsx` | Record repayment modal |
| `src/components/debt/DebtDetailModal.tsx` | Debt detail with repayment history |
| `src/components/debt/DebtTypeToggle.tsx` | Lend/Borrow toggle component |
| `src/components/debt/DebtCard.tsx` | Individual debt card in the list |
| `src/components/debt/index.ts` | Barrel exports |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `Debt` model, add `debt_id` to Transaction, add relations to User/Account |
| `src/lib/db/sequence.ts` | Add `'debt'` entity type |
| `src/utils/constants.ts` | Add debt types, statuses, colors, pagination config |
| `src/components/Sidebar.tsx` | Add "Debts" nav item |

---

## 10. Implementation Order

1. **Schema & Migration**: Update `schema.prisma`, run migration
2. **Backend Core**: SequenceService, validation schemas, API routes (debts CRUD + repayments)
3. **Frontend Service**: `debtService.ts`
4. **Constants**: Update constants with debt types/statuses/colors
5. **UI Components**: DebtTypeToggle, DebtModal, RepaymentModal, DebtDetailModal, DebtCard
6. **Debts Page**: Full page with list, filters, summary cards
7. **Navigation**: Add to sidebar
