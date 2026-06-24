# Phase 4 — UI Components

> Hapus currency picker, currency tabs, dan currency selection dari semua UI. Simplify semua display menjadi IDR-only.

## 4.1 — Hapus Komponen Currency-Specific ✅ DONE

### `src/components/common/CurrencyPicker.tsx`
- **Hapus seluruh file** — tidak diperlukan lagi
- Cari semua import `CurrencyPicker` dan hapus:
  - `src/components/accounts/AccountForm.tsx` (lines 8-9, 146, 149-152, 166, 168, 292, 294)
  - `app/(app)/settings/sections/GeneralSection.tsx` (lines 6, 10, 77-79, 81)

### `src/components/AmountRangeFilter.tsx`
- **Lines 20, 32, 104, 106, 149, 170**: Hapus `currencyCode` parameter, hardcode "IDR" untuk formatting

## 4.2 — Account Forms ✅ DONE

### `src/components/accounts/AccountForm.tsx`
- **Lines 8-9**: Hapus import CurrencyPicker
- **Line 18**: Hapus `currency` dari form state
- **Lines 146, 149-152**: Hapus currency dropdown/select UI
- **Lines 166, 168**: Hapus `currency` dari form data
- **Lines 292, 294**: Hapus `currency` dari submit payload

### `src/components/accounts/AccountModal.tsx`
- **Lines 28, 48**: Hapus currency handling dari modal

## 4.3 — Transaction Forms ✅ DONE

### `src/components/transaction/TransactionForm.tsx`
- **Line 10**: Hapus import currency-related
- **Lines 80-82, 84, 86**: Hapus `to_amount`, `to_currency` dari form state
- **Line 97, 100**: Hapus currency dari form data
- **Lines 168, 177**: Hapus destination currency display
- **Lines 193, 198, 203-204, 208**: Hapus destination amount/currency input fields
- **Lines 220-221, 240, 249**: Hapus currency dari submit payload

### `src/components/transaction/TransactionModal.tsx`
- **Lines 84, 87**: Hapus `currency` dari modal data
- **Lines 103-104, 109-110, 112-113**: Hapus `to_currency`, `to_amount` dari modal
- **Lines 122, 129, 132, 134-135**: Hapus currency field population

### `src/components/transactions/GlobalTransactionModal.tsx`
- **Lines 48, 53, 55-56, 58-59**: Hapus `to_amount`, `to_currency` dari modal data
- **Lines 104, 106-107, 118**: Hapus transfer conversion fields

## 4.4 — Dashboard ✅ DONE

### `app/(app)/dashboard/page.tsx` (37 referensi)
- **Line 36**: Hapus `currency` dari state
- **Line 106**: Hapus currency selection UI (dropdown/tabs)
- **Line 138**: Hapus currency dari data fetching
- **Lines 197, 200, 209-211, 213, 219, 225, 227, 229**: Hapus currency dari chart data normalization
- **Lines 347-349, 353, 357, 363, 369-370, 375, 379, 382, 385, 394, 396, 400, 406**: Hapus per-currency formatting — gunakan single format
- **Lines 443, 503, 515, 533, 535, 549, 581, 632**: Hapus currency dari display
- **Strategi**: Ubah dari `Map<currency, data>` menjadi single `data` object

### `src/components/dashboard/AccountCard.tsx`
- **Lines 5, 11, 20, 23, 39**: Hapus `currency` dari props, hardcode "IDR" untuk formatting

### `src/components/dashboard/widgets/BalanceTrendWidget.tsx`
- **Lines 7-8, 10**: Hapus import currency
- **Lines 17, 34, 43, 53, 57**: Hapus currency switching logic
- **Lines 77, 80-81, 83-84, 92, 109, 111-112**: Hapus per-currency data — single dataset

### `src/components/dashboard/widgets/BudgetStatusWidget.tsx`
- **Lines 10, 15, 17, 23, 32, 36, 39**: Hapus currency filter
- **Lines 68-69, 71-72, 80, 102**: Hapus currency dari display

### `src/components/dashboard/widgets/ExpensesByCategoryWidget.tsx`
- **Lines 9, 11, 20, 27, 34**: Hapus currency filter
- **Lines 81, 100, 109, 112-113, 115-116, 119, 151**: Hapus currency dari display

### `src/components/dashboard/widgets/IncomeVsExpensesWidget.tsx`
- **Lines 8, 10, 17, 34, 37-38, 40-41, 49, 67, 76**: Hapus currency switching — single dataset

### `src/components/dashboard/widgets/NetWorthWidget.tsx`
- **Lines 42, 51, 161-162, 168-169, 173, 182, 190, 198**: Hapus per-currency net worth — single total

### `src/components/widgets/BalanceTrendChart.tsx` (36 referensi)
- **Lines 46, 50, 57, 60, 73, 78**: Hapus currency dari chart data
- **Lines 93, 96, 101, 104, 110, 113**: Hapus per-currency dataset
- **Lines 136, 155, 159, 172-173, 175**: Hapus currency formatting
- **Lines 199-201, 205, 207, 211, 228, 234-235, 239-241, 243, 248, 254, 260, 276, 280**: Hapus currency dari axis labels dan tooltips
- **Strategi**: Ubah dari multi-dataset (per currency) menjadi single dataset

## 4.5 — Analytics Reports ✅ DONE

### `src/components/analytics/IncomesExpensesReport.tsx` (25 referensi)
- **Line 9**: Hapus import currency
- **Line 76**: Hapus currency dari state
- **Lines 216, 264, 286, 293, 328, 334, 346, 352, 361**: Hapus per-currency data — single dataset
- **Lines 440, 449, 456, 474, 494, 508, 529, 544**: Hapus currency dari display
- **Lines 861, 872, 875, 882, 886, 888-890, 892, 923**: Hapus currency tabs/selector

### `src/components/analytics/BalanceTrendReport.tsx` (23 referensi)
- **Line 10**: Hapus import currency
- **Lines 90, 92, 94**: Hapus currency dari state
- **Lines 163, 172, 177-178, 188, 198, 203, 213**: Hapus per-currency data
- **Lines 283, 287, 330, 341, 344, 351, 354, 356-358, 360, 373**: Hapus currency dari chart
- **Lines 445, 458, 470**: Hapus currency dari display

### `src/components/analytics/CashFlowReport.tsx` (18 referensi)
- **Line 18**: Hapus import currency
- **Lines 73, 75, 77**: Hapus currency dari state
- **Lines 91, 141, 193, 227**: Hapus currency tabs
- **Lines 308, 319, 322, 329, 332, 334-336, 338**: Hapus per-currency data
- **Lines 405, 442, 461**: Hapus currency dari display

### `src/components/analytics/AdvancedChartsReport.tsx` (14 referensi)
- **Line 27**: Hapus import currency
- **Lines 89, 91, 93, 107**: Hapus currency selection
- **Lines 164, 186**: Hapus currency dari chart data
- **Lines 372, 383, 386, 393, 396, 398-400, 402**: Hapus per-currency datasets

### `src/components/analytics/CategoryTransactionsModal.tsx`
- **Lines 19, 31, 52, 62, 104**: Hapus currency dari modal data dan display

## 4.6 — Transactions & Records ✅ DONE

### `app/(app)/transactions/page.tsx`
- **Line 12**: Hapus import currency
- **Line 26**: Hapus `currency` dari state
- **Lines 182, 298, 317, 325, 339, 342, 351, 368, 371, 380**: Hapus per-currency grouping dan totals
- **Lines 493, 668-669, 672, 674, 676, 684, 686, 691**: Hapus currency dari display

### `src/components/Records/RecordsList.tsx`
- **Lines 5, 19**: Hapus import currency
- **Lines 61, 136, 144-145, 167-168, 174**: Hapus currency dari amount formatting
- **Line 350**: Hapus currency dari display

### `src/components/widgets/TransactionsList.tsx`
- **Lines 7, 26, 217**: Hapus currency dari amount formatting

### `src/components/FilterSidebar/FilterInputs.tsx`
- **Lines 226-227, 230, 232, 237, 250, 280**: Hapus currency filter UI

## 4.7 — Budgets ✅ DONE

### `app/(app)/budgets/page.tsx` (20 referensi)
- **Line 20**: Hapus import currency
- **Line 47**: Hapus `currency` dari state
- **Lines 66, 273, 275, 278, 280, 330, 332, 334**: Hapus currency dari calculations
- **Lines 536, 559, 563, 575-576, 581**: Hapus currency dari display
- **Lines 671-672, 713-714, 817, 902**: Hapus currency dari formatting

### `app/(app)/budgets/_components/budget-table/columns.tsx`
- **Lines 7, 12, 37, 47, 56, 67, 78, 97, 107, 116, 127, 131**: Hapus `currencyCode` parameter, hardcode "IDR"

### `app/(app)/budgets/_components/budget-table/formatters.tsx`
- **Lines 75, 78**: Hapus currency dari format functions

### `app/(app)/budgets/_components/BudgetAccountFilter.tsx`
- **Line 335**: Hapus currency filtering

### `app/(app)/budgets/_components/BudgetTableMode.tsx`
- **Lines 20, 24, 78, 329-332, 372-375**: Hapus currency dari totals formatting

### `src/components/budgets/BudgetProgressBar.tsx`
- **Lines 1, 9, 15-16**: Hapus import dan `currencyCode` parameter
- **Lines 79, 84, 89, 98, 100, 103, 105**: Hapus currency dari formatting
- **Lines 136, 141, 146, 155, 157, 160, 162**: Hapus currency dari display

### `src/components/widgets/BudgetStatusList.tsx`
- **Lines 20, 28, 67, 72**: Hapus currency dari formatting

## 4.8 — Accounts Pages ✅ DONE

### `app/(app)/accounts/page.tsx`
- **Line 29**: Hapus `currency` dari state
- **Lines 95, 130**: Hapus currency dari data
- **Lines 179, 185-187, 190, 286, 291-292, 295, 297-298, 399**: Hapus per-currency grouping — single total

### `app/(app)/accounts/[id]/page.tsx`
- **Line 13**: Hapus import currency
- **Line 131**: Hapus currency dari data
- **Lines 241, 280-284, 290, 292, 295**: Hapus per-currency totals — single total

## 4.9 — Debt Components ✅ DONE

### `src/components/debt/DebtCard.tsx`
- **Lines 20, 116, 126**: Hapus currency, hardcode "IDR" untuk formatting

### `src/components/debt/DebtDetailModal.tsx`
- **Lines 16, 43**: Hapus currency prefix, hardcode "IDR"

### `src/components/debt/DebtIncreaseModal.tsx`
- **Lines 13, 77**: Hapus currency, hardcode "IDR"

### `src/components/debt/DebtModal.tsx`
- **Lines 14, 85**: Hapus currency handling

### `src/components/debt/RepaymentModal.tsx`
- **Line 76**: Hapus currency display, hardcode "IDR"

## 4.10 — Settings ✅ DONE

### `app/(app)/settings/sections/GeneralSection.tsx`
- **Lines 6, 10**: Hapus import CurrencyPicker
- **Lines 77-79, 81**: Hapus currency selection UI dari settings

## 4.11 — Verifikasi ✅ DONE

- [x] `npx tsc --noEmit` — remaining errors are all in scripts (Phase 5) and mocks (Phase 5)
- [x] `CurrencyPicker.tsx` — file deleted, no imports remain
- [x] Dashboard — no currency selector/tabs, all charts single dataset
- [x] Transaction form — no destination currency/amount fields
- [x] Account form — no currency dropdown
- [x] Settings — no currency preference
- [ ] Test: buka dashboard, transactions, accounts, budgets, analytics — pending runtime test
