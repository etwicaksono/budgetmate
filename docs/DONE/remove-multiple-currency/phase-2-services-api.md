# Phase 2 — Services & API Routes

> Hapus semua logic multi-currency dari services dan API routes. Hardcode "IDR" sebagai satu-satunya currency.

## 2.1 — Services ✅ DONE

### `src/services/accountService.ts`
- **Line 10**: Hapus `currency` dari select/include clause
- **Line 33**: Hapus `currency` dari return mapping

### `src/services/transactionService.ts`
- **Line 26**: Hapus `currency` dari select clause
- **Line 39**: Hapus `currency` dari return mapping
- **Line 43**: Hapus `exchange_rate` dari return mapping
- **Line 56**: Hapus `currency` dari create/write payload
- **Line 64**: Hapus `exchange_rate` dari create/write payload

### `src/services/transferService.ts`
- **Line 9**: Hapus `currency` dari select
- **Lines 11-12**: Hapus `to_currency` dari select
- **Line 22**: Hapus `currency` dari return mapping
- **Lines 24-25**: Hapus `to_currency` dan `to_amount` dari return mapping
- Hapus semua logic validasi multi-currency (same-currency check, exchange rate validation)

### `src/services/analyticsService.ts`
- **Line 47**: Hapus filter `currency` dari query
- **Line 100**: Hapus grouping by currency
- **Line 105**: Hapus currency dari aggregation
- **Line 252**: Hapus currency filter
- **Line 256**: Hapus currency dari response
- **Line 300**: Hapus currency dari response mapping
- **Strategi**: Hapus semua `where: { currency: ... }` filter dan `groupBy: ['currency']` — semua data otomatis IDR

### `src/services/budgetService.ts`
- **Line 7**: Hapus `currency` dari query
- **Line 35**: Hapus `currency` dari return mapping

### `src/services/authService.ts`
- **Line 26**: Hapus `currency` dari user data return

### `src/services/currencyFormatService.ts` ✅ DONE
File ini adalah **central formatting service**. Ubah menjadi IDR-only:

- **Line 1**: Hapus `import { getCurrency } from '@/config/currencies'`
- **Line 38-90** (`formatCurrency`): Hapus parameter `currencyCode`, hardcode "IDR"
  ```typescript
  formatCurrency(amount: number, options: FormatOptions = {}): string {
    // Hardcode IDR: 0 decimal digits, locale from this.defaultLocale
    const decimalDigits = 0; // IDR has no decimals
    // ... rest of formatting logic with "IDR" prefix
    return `IDR ${formattedNumber}`;
  }
  ```
- **Line 99-106** (`formatForInput`): Hapus parameter `currencyCode`, hardcode IDR (0 decimals)
- **Line 139-144** (`getSymbol`): Return "Rp" selalu
- **Line 149-154** (`getName`): Return "Indonesian Rupiah" selalu
- **Line 159-173** (`formatWithSymbol`): Hapus parameter `currencyCode`, hardcode "Rp"
- **Line 182-184** (`formatCompact`): Hapus parameter `currencyCode`
- **Line 192-204** (`formatShort`): Hapus parameter `currencyCode`, hardcode "IDR"
- **Line 209-212** (`getDecimalDigits`): Return `0` selalu (IDR)
- **Line 217-220** (`getInputStep`): Return "1" selalu (IDR has 0 decimals)
- **Line 229-243** (`formatWithSign`): Hapus parameter `currencyCode`
- **Line 249-253**: Update convenience exports — hardcode "IDR"

### `src/lib/ai/formatters.ts` ✅ DONE
- **Lines 46-47, 51**: Hapus grouping by currency, format dengan "IDR" hardcoded

### `src/lib/ai/tools.ts` ✅ DONE
- **Lines 137, 162, 170, 179, 203**: Hapus `currency` dari query fields dan groupBy

### `src/lib/sync/sheetParse.ts` ✅ DONE
- **Lines 8, 40-41, 60-62, 92, 134-135, 158-160, 214, 250, 263**: Hapus parsing kolom currency, exchange_rate, to_currency, to_amount dari sheet rows

### `src/lib/sync/sheetTransform.ts` ✅ DONE
- **Lines 8, 17, 27, 44, 107, 129-130, 154, 156, 169-171, 234, 246**: Hapus currency fields dari transform output

### `src/lib/sync/syncPull.ts` ✅ DONE
- **Lines 126, 189-191, 201-202, 221-222, 243-244, 451, 465, 606-607, 696**: Hapus mapping currency saat sync pull

### `src/lib/sync/syncPush.ts` ✅ DONE
- **Lines 71, 120, 191**: Hapus read currency dari user/account data

## 2.2 — API Routes ✅ DONE

### `app/api/v1/accounts/route.ts`
- **Line 65**: Hapus `currency` dari response
- **Line 129**: Hapus `currency` dari create payload
- **Line 146**: Hapus `currency` dari response mapping

### `app/api/v1/accounts/[id]/route.ts`
- **Line 14**: Hapus `currency` dari validation schema
- **Line 23**: Hapus `currency` dari update validation
- **Line 25**: Hapus `currency` dari select
- **Line 100**: Hapus `currency` dari update payload
- **Lines 182, 203**: Hapus `currency` dari response

### `app/api/v1/transactions/route.ts`
- **Lines 174, 178**: Hapus `currency` dari select
- **Lines 182-183**: Hapus `currency` dan `exchange_rate` dari create payload
- **Lines 204, 224, 226-227**: Hapus currency dari response mapping
- **Lines 237, 243, 247, 249-250, 253, 255, 260-261**: Hapus currency formatting logic
- **Lines 278, 292-293, 296, 302-303, 306-307**: Hapus currency dari filter/query
- **Lines 406, 465**: Hapus currency dari response

### `app/api/v1/transactions/[id]/route.ts`
- **Lines 55, 76, 78-79**: Hapus `currency`, `exchange_rate` dari select dan response
- **Lines 99-100, 117, 120-121**: Hapus dari update payload
- **Line 323**: Hapus currency dari response

### `app/api/v1/transactions/bulk/route.ts`
- **Line 142**: Hapus currency dari bulk payload

### `app/api/v1/transfers/route.ts`
- **Lines 74-76, 79-80**: Hapus `currency`, `to_currency`, `to_amount` dari create payload
- **Lines 91, 93-94**: Hapus dari validation
- **Lines 164-166, 168-169, 171, 173**: Hapus dari response
- **Lines 187-188, 190-192, 204**: Hapus multi-currency transfer logic
- **Lines 219, 251-253, 256-257, 268, 270-271**: Hapus dari response mapping

### `app/api/v1/transfers/[id]/route.ts`
- **Lines 44, 49**: Hapus `currency`, `to_currency` dari select
- **Lines 62-64, 75, 77-78**: Hapus dari response
- **Lines 104, 106-107**: Hapus dari update payload
- **Lines 185, 187-188, 198, 200-201**: Hapus multi-currency logic
- **Lines 214, 216-217, 232, 241, 249, 275, 277-280**: Hapus dari response

### `app/api/v1/analytics/balance-trend/route.ts` (32 referensi)
- Hapus semua `where: { currency: ... }` filter
- Hapus semua `groupBy: ['currency']` — aggregate tanpa grouping
- Hapus currency dari response — return single dataset (not per-currency)
- **Strategi**: Ubah dari `Map<currency, data>` menjadi single `data` object

### `app/api/v1/analytics/trends/route.ts` (32 referensi)
- Sama dengan balance-trend — hapus currency filter, grouping, dan response keys

### `app/api/v1/analytics/cashflow/route.ts` (15 referensi)
- Hapus currency grouping dan formatting — return single currency dataset

### `app/api/v1/analytics/advanced-charts/route.ts` (17 referensi)
- Hapus currency-filtered chart datasets — return single dataset

### `app/api/v1/analytics/expenses-by-category/route.ts` (11 referensi)
- Hapus `groupBy: ['currency']` — group by category only

### `app/api/v1/analytics/income-expense-report/route.ts` (11 referensi)
- Hapus per-currency reporting — return single report

### `app/api/v1/analytics/income-vs-expenses/route.ts` (10 referensi)
- Hapus currency filter — single dataset

### `app/api/v1/auth/login/route.ts`
- **Line 89**: Hapus `currency` dari login response payload

### `app/api/v1/auth/register/route.ts`
- **Lines 87, 221**: Hapus `currency` dari register payload dan response

### `app/api/v1/backup/export/route.ts`
- **Lines 92, 121, 151-152, 169, 171-172, 199**: Hapus currency, exchange_rate, to_currency, to_amount dari export data

### `app/api/v1/backup/import/route.ts`
- **Lines 99, 121, 144, 385, 387-388, 404, 406-407, 424, 426-427, 465-466, 488-489, 512-513**: Hapus currency fields dari import mapping

### `app/api/v1/debts/route.ts`
- **Lines 50, 55, 240**: Hapus `currency` dari debt creation dan listing

### `app/api/v1/debts/[id]/route.ts`
- **Lines 29, 34**: Hapus `currency` dari validation dan response

### `app/api/v1/debts/[id]/increase/route.ts` + `[transactionId]/route.ts`
- **Lines 77, 94**: Hapus currency dari debt increase transaction

### `app/api/v1/debts/[id]/repayments/route.ts`
- **Line 93**: Hapus currency dari repayment response

### `app/api/v1/budgets/status/route.ts`
- **Line 141**: Hapus currency-aware data dari response

### `app/api/v1/user/settings/route.ts`
- **Lines 8, 23, 76, 95, 102, 112**: Hapus `currency` dari settings GET/PUT

## 2.3 — Verifikasi ✅ DONE

- [x] `npx tsc --noEmit` — remaining errors are all in UI components (Phase 4) and scripts (Phase 5), no more errors in services or API routes
- [x] Fixed `totals.IDR` index signature access in transactions/route.ts
- [ ] Test API endpoints — pending until Phase 4 UI is fixed
- [ ] Test backup export — pending until Phase 5 cleanup
