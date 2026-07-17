# Debt & Transaction Edit Remediation Plan

## Project Context

**Repository:** `etwicaksono/budgetmate` — personal finance management app
**Tech stack:** Next.js 16, React 19, TypeScript 5.9 (strict), Prisma 7, PostgreSQL, Zod, React Bootstrap, SweetAlert2
**Working directory:** `D:\Project\FinanceApp\finance-web`
**Source branch under review:** `fix-bug-transaction-list` (diffed against `origin/main`)

### How to run

```bash
npm install
npm run dev           # Start dev server at http://localhost:3000
npm run type-check    # tsc --noEmit
npm run lint          # eslint . --ext .js,.jsx,.ts,.tsx
npm run validate      # Type-check + lint (run before committing)
npm run test          # jest
```

### Conventions

- **Commit style:** `type: short description` (e.g. `fix: sync debt ledger transaction on edit`)
- **Auth:** `requireAuth(request)` returns `{ user: { user_id } }` or `{ error }`
- **API responses:** `successResponse(data, meta)` / `errorResponse(code, message, status, details?)` from `@/lib/api/response`
- **Validation:** Zod schemas in `src/lib/validation/`
- **Prisma errors:** wrap DB access in try/catch and pass to `handlePrismaError(error, entity, action)`

---

## How to Use This Task List

This document is a remediation plan for bugs found during a Staff-level review of the
`fix-bug-transaction-list` branch. Each actionable item is a checkbox with three states.
Work through phases in order (Phase 1 → 4) — Phase 1 items are correctness blockers and
should be fixed before this branch merges.

### Checkbox states

| Marker | Meaning | When to use |
|--------|---------|-------------|
| `- [ ]` | Not started | Default state — item has not been worked on yet |
| `- [~]` | In progress | Agent is actively working on this item |
| `- [x]` | Completed | Item is done, verified, and committed |

### Workflow for AI agents

1. **Read this document fully** before starting. Understand the debt/transaction data model
   below and why the desync happens.
2. **Work on the `fix-bug-transaction-list` branch** unless told otherwise.
3. **Work on one phase at a time**, in order. Phase 1 is the merge blocker.
4. Mark an item `- [~]` before starting it and `- [x]` after it is done and verified.
5. **After completing a phase**, run `npm run validate` (and `npm run test` for Phase 3).
   Fix any errors before moving on.
6. **Commit after each step** (a numbered sub-section like `1.1`), e.g.
   `git commit -m "fix: [1.1] sync debt ledger transaction on edit"`.
7. If an item is blocked, leave it `- [ ]` and add a `> **Blocked:** ...` note beneath it.
8. When all phases are complete, move this file to `docs/DONE/`:
   `git mv docs/TODO/debt-transaction-edit-remediation.md docs/DONE/`.

---

## Domain Model Background

Understanding the debt ledger model is essential before touching anything.

### A `Debt` is backed by ledger `Transaction` rows

- A `Debt` row (`prisma.debt`) stores the metadata: `type` (`lend` | `borrow`), `counterparty`,
  `account_id`, `date`, `status`, `description`.
- The actual money movement lives in `prisma.transaction` rows linked via `transaction.debt_id`.
- The **initial** transaction type depends on debt type:
  - `debt.type === lend`  → initial tx type `debt_out` (negative amount, money leaves your account)
  - `debt.type === borrow` → initial tx type `debt_in` (positive amount, money enters your account)
- **Repayments** use the opposite type (`debt_in` for a lend, `debt_out` for a borrow).

### The GET endpoint derives everything from transactions

`app/api/v1/debts/[id]/route.ts` (GET) does **not** read `amount` from the `Debt` row.
It computes:

```ts
initialAmount   = sum(|amount|) of txs where tx.type === initialTxType
totalRepaid     = sum(|amount|) of txs where tx.type === repaymentTxType
remainingAmount = max(0, initialAmount - totalRepaid)
```

and classifies transactions using `debt.type`. **This is the key fact:** if `debt.type`
or the linked transaction's `account`/`date` drift out of sync with each other, the GET
response silently reports wrong amounts, wrong accounts, or misclassified transactions.

### What this branch changed

The PUT handler was simplified from "update Debt **and** its linked ledger transaction inside
a `prisma.$transaction`" down to "update only the Debt row". `amount` was correctly removed
from the editable surface (`UpdateDebtSchema`, `UpdateDebtPayload`, `DebtModal`), but `type`,
`account_id`, and `date` are still editable on the `Debt` while the linked transaction is
left untouched. That is the source of the bugs below.

### Key files

| File | Role |
|------|------|
| `app/api/v1/debts/[id]/route.ts` | Server: GET (derives amounts from txs), PUT (edit), DELETE |
| `src/lib/validation/debt.ts` | Zod `CreateDebtSchema` / `UpdateDebtSchema` |
| `src/services/debtService.ts` | Client payload types `CreateDebtPayload` / `UpdateDebtPayload` |
| `src/components/debt/DebtModal.tsx` | Create/edit debt form (amount & type disabled in edit mode) |
| `src/components/debt/DebtDetailModal.tsx` | Detail view with new "Edit Debt" button |
| `src/components/debt/GlobalDebtModal.tsx` | Dispatches `transaction-updated` optimistic events |
| `src/components/transactions/GlobalTransactionModal.tsx` | Dispatches `transaction-updated` for tx edits |
| `app/(app)/transactions/page.tsx` | Listens for `transaction-updated`, applies optimistic list update |

---

## Phase 1 — Data Consistency (BLOCKER, must fix before merge)

### 1.1 — Debt edit desyncs the linked ledger transaction

**Severity:** High (data correctness)

**Problem:** In `app/api/v1/debts/[id]/route.ts` (PUT), the handler now updates only the
`Debt` row:

```ts
const updatedDebt = await prisma.debt.update({
   where: { id: debtId },
   data: {
      updated_by: authResult.user.user_id,
      ...(data.date && { date: new Date(data.date) }),
      ...(data.type && { type: data.type as DebtType }),
      ...(data.account_id && { account: { connect: { id: data.account_id } } }),
      ...(data.counterparty && { counterparty: data.counterparty }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status as DebtStatus }),
   },
});
```

The linked ledger transaction keeps its old `date`, `account_id`, and `payee`. Because the
GET endpoint derives the debt's displayed `account` and repayment rows from those
transactions, editing a debt's **account** or **date** makes the `Debt` header disagree with
the underlying ledger entry (and with the account balances the ledger drives).

**Impact:** A user edits a debt's account; the debt shows the new account but the money is
still recorded against the old account in the ledger/balances. Silent financial desync.

**Fix:** Re-introduce the linked-transaction sync inside a `prisma.$transaction`, limited to
the fields that are still editable (`date`, `account_id`, `counterparty` → `payee`,
`description`). Do **not** touch `amount` (no longer editable). Example:

```ts
const updatedDebt = await prisma.$transaction(async (tx) => {
   const updated = await tx.debt.update({
      where: { id: debtId },
      data: {
         updated_by: authResult.user.user_id,
         ...(data.date && { date: new Date(data.date) }),
         ...(data.account_id && { account: { connect: { id: data.account_id } } }),
         ...(data.counterparty && { counterparty: data.counterparty }),
         ...(data.description !== undefined && { description: data.description }),
         ...(data.status && { status: data.status as DebtStatus }),
      },
   });

   // Keep the INITIAL ledger transaction in sync (repayments are edited via their own flow).
   const initialTxType =
      existingDebt.type === DebtType.lend
         ? TransactionType.debt_out
         : TransactionType.debt_in;

   await tx.transaction.updateMany({
      where: { debt_id: debtId, type: initialTxType },
      data: {
         updated_by: authResult.user.user_id,
         ...(data.date && { date: new Date(data.date) }),
         ...(data.account_id && { account_id: data.account_id }),
         ...(data.counterparty && { payee: data.counterparty }),
         ...(data.description !== undefined && { description: data.description }),
      },
   });

   return updated;
});
```

- [x] Wrap the debt update + linked-transaction update in a single `prisma.$transaction`
- [x] Sync `date`, `account_id`, `payee` (from `counterparty`), and `description` onto the initial ledger transaction
- [x] Do NOT modify transaction `amount` (amount is no longer editable — leave it alone)
- [x] Decide whether editing `date`/`account` should also affect repayment transactions, or only the initial one — document the decision inline (see 1.2 for the `type` question). Decision: only the INITIAL transaction is synced; repayment/increase transactions have their own edit flows and are left untouched.
- [x] Run `npm run validate`

### 1.2 — `type` is still writable via the PUT API but no longer re-syncs the ledger

**Severity:** High (API-level inconsistency)

**Problem:** `UpdateDebtSchema` (`src/lib/validation/debt.ts`) still allows `type`, and the
PUT handler writes `data.type` to the `Debt`. But the linked transaction's directional type
(`debt_in` / `debt_out`) is no longer flipped to match. The UI disables the type toggle in
edit mode (`DebtModal` passes `disabled={isEdit}`) and no longer sends `type`, so this is
dead-but-dangerous surface: a direct API caller can set `debt.type` while the ledger stays
on the old type. The GET endpoint then misclassifies initial vs. repayment transactions and
returns wrong `amount` / `remaining_amount`.

**Decision needed:** Editing debt `type` after creation is not supported by the UI. Choose one:
- **(A) Drop `type` from edit** (recommended, matches how `amount` was handled): remove it
  from `UpdateDebtSchema` and stop writing it in the PUT handler.
- **(B) Keep `type` editable**: then the PUT handler MUST also flip every linked transaction's
  type and re-sign amounts, and re-validate repayments — significantly more work and risk.

**Recommended fix (A):**

```ts
// src/lib/validation/debt.ts
export const UpdateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }).optional(),
   account_id: z.string().min(1).optional(),
   counterparty: z.string().min(1).max(255).optional(),
   description: z.string().optional(),
   status: z.nativeEnum(DebtStatus).optional()
});
```

and remove the `...(data.type && { type: data.type as DebtType })` line from the PUT update.

- [x] Choose approach A or B and note the decision here. Decision: **Approach A** — `type` is not editable after creation.
- [x] If A: remove `type` from `UpdateDebtSchema` in `src/lib/validation/debt.ts`
- [x] If A: remove the `type` write from the PUT handler in `app/api/v1/debts/[id]/route.ts`
- [x] If A: confirm `DebtType` import is still used (it is, via 1.1's `initialTxType`) so no unused-import lint error
- [ ] If B: implement full ledger re-typing + re-signing + repayment revalidation (out of scope of the current bug fix — prefer A)
- [x] Run `npm run validate`

---

## Phase 2 — Optimistic UI Correctness (Medium)

### 2.1 — Transfer edit relies on `to_account_id` being present in the event payload

**Severity:** Medium (transient UI desync, not data loss)

**Problem:** In `app/(app)/transactions/page.tsx`, the transfer branch of the
`transaction-updated` handler resolves the destination leg's account from
`data.to_account_id`, applying it only when `nextAccountId !== undefined`. The event payload
is built in `GlobalTransactionModal.tsx` as `{ ...initialData, ...transactionData, id }`. If
the transfer edit form does not populate `to_account_id` in `transactionData`, the guard
silently keeps the old destination account, so the optimistic row diverges from the persisted
value until the next `fetchTransactions()`.

**Impact:** After editing a transfer's destination account, the list can show a stale account
until a manual refresh/refetch — defeating the optimistic update this branch adds.

**Fix / verification:**

- [x] Confirm the transfer edit form always includes `to_account_id` (and `account_id` for the source leg) in the dispatched `transactionData`. Verified: `handleEditRecord` builds `modalData` with `to_account_id` (via `mapTransferAccounts`) for every transfer, and `GlobalTransactionModal` dispatches `{ ...initialData, ...transactionData, id }`, so the event always carries `to_account_id`. `to_account_id` is also required by the form validation for transfers, so it cannot be cleared.
- [x] If it can be absent, either carry both legs' account ids explicitly in the event `detail.data`, or fall back to `fetchTransactions()` for transfer edits instead of an optimistic patch. N/A — always present (see above).
- [ ] Add/adjust a test or manual check: edit a transfer's destination account and confirm the row updates without a refetch (deferred with Phase 3)
- [x] Run `npm run validate`

---

## Phase 3 — Test Coverage (Low–Medium)

### 3.1 — Add regression tests for debt edit ledger sync

- [ ] Create/extend a test for `PUT /api/v1/debts/[id]`
- [ ] Test: editing `account_id` updates BOTH the `Debt.account_id` and the initial linked transaction's `account_id`
- [ ] Test: editing `date` updates BOTH the `Debt.date` and the initial linked transaction's `date`
- [ ] Test: editing `counterparty` updates `Debt.counterparty` and the transaction's `payee`
- [ ] Test: `amount` is never present in the payload and never changes any transaction amount
- [ ] Test (if approach 1.2-A chosen): sending `type` in the body is rejected/ignored and does not desync the ledger
- [ ] Test: GET after an edit returns a consistent `account` and correct `amount` / `remaining_amount`

### 3.2 — Add optimistic transfer edit test

- [ ] Test the `transaction-updated` handler in `app/(app)/transactions/page.tsx` for a transfer edit: both legs get the correct signed amount and their respective account ids

---

## Phase 4 — Documentation & Comment Cleanup (Low)

### 4.1 — Fix stale comment in AI session title fallback

**Problem:** In `app/api/ai/sessions/[id]/messages/route.ts`, the block comment above
`generateSessionTitle` still says "Falls back to the user's message (truncated to 255 chars)"
while the code now truncates to 100 (`userMessage.slice(0, 100)`).

- [x] Update the comment to say "truncated to 100 chars"

### 4.2 — Verify `DebtCard` inactive-state labels match real statuses

**Problem:** `src/components/debt/DebtCard.tsx` renders `{isSettled ? 'Fully repaid' : 'Cancelled'}`
in the inactive branch, but `DebtStatus` (and the `DebtModal` status dropdown) only expose
`active` and `settled`. If there is no `cancelled` status, the `'Cancelled'` label is
unreachable/misleading.

- [x] Confirm whether a `cancelled`/non-settled inactive state actually exists in `DebtStatus` — it does (`enum DebtStatus { active, settled, cancelled }` in `schema.prisma`), so the `'Cancelled'` label is valid, not dead code. No change needed.
- [x] If not, replace the misleading `'Cancelled'` fallback with the correct label (or remove the branch) — N/A, label is correct.

---

## Summary

| Phase | Issue | Severity | Blocker? | Items |
|-------|-------|----------|----------|-------|
| 1.1 | Debt edit desyncs linked ledger transaction | High | Yes | 5 |
| 1.2 | `type` writable via API but not re-synced | High | Yes | 5 |
| 2.1 | Transfer optimistic edit needs `to_account_id` | Medium | No | 4 |
| 3.1 | No debt-edit ledger-sync tests | Medium | No | 7 |
| 3.2 | No optimistic transfer edit test | Low | No | 1 |
| 4.1 | Stale 255-char comment in title fallback | Low | No | 1 |
| 4.2 | `DebtCard` "Cancelled" label may be dead code | Low | No | 2 |

**Phase 1 must be completed before merging `fix-bug-transaction-list`.**

### Areas confirmed clean during review (no action needed)

- **Security:** debt/transaction endpoints keep `user_id`-scoped `findFirst` authorization; chat-restore reuses the authenticated session endpoint; titles are truncated; no new untrusted input reaches SQL/HTML.
- **`src/lib/ai/formatters.ts`:** flattening + `?? []` defaults correctly harden against malformed report payloads.
- **`AIChatPanel.tsx`:** `?? 'Percakapan baru'` → `|| 'Percakapan baru'` correctly handles empty-string titles.
- **Typecheck + ESLint:** both pass on the changed files.
