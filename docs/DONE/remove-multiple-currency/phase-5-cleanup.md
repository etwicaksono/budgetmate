# Phase 5 — Cleanup (Types, Validation, Mocks, Dead Code)

> Hapus sisa-sisa code currency yang sudah tidak terpakai: types, validation schemas, OpenAPI schemas, mocks, dan test scripts.

## 5.1 — Types & Interfaces ✅ DONE

### `src/types/backup.types.ts`
- **Line 20**: Hapus `currency` dari BackupUser type
- **Lines 55, 87-88**: Hapus `currency`, `exchange_rate` dari BackupTransaction type
- **Lines 106, 108-109**: Hapus `currency`, `to_currency`, `to_amount` dari BackupTransfer type

### `src/features/auth/types/auth.types.ts`
- **Line 12**: Hapus `currency` dari auth type

## 5.2 — Validation Schemas ✅ DONE

### `src/lib/validation/transfer.ts`
- **Line 6**: Hapus `currency` dari transfer validation
- **Lines 12, 14-15**: Hapus `to_currency`, `to_amount` dari validation schema
- **Lines 22, 24-25, 30-31, 33, 35-36, 38, 43-44, 53**: Hapus semua multi-currency validation rules
- **Strategi**: Simplify menjadi transfer validation tanpa destination currency fields

### `src/lib/validation/transaction.ts`
- **Line 14**: Hapus note tentang "currency derived from account"
- **Line 59**: Hapus `currencies` dari filter schema

### `src/lib/validation/backupSchemas.ts`
- **Line 18**: Hapus `currency` dari user backup schema
- **Lines 50-51**: Hapus `currency`, `exchange_rate` dari transaction backup schema
- **Lines 69, 71-72**: Hapus `currency`, `to_currency`, `to_amount` dari transfer backup schema
- **Line 103**: Hapus currency dari schema lainnya

## 5.3 — OpenAPI Schemas ✅ DONE

### `src/lib/openapi/schemas/accounts.ts`
- **Line 16**: Hapus `currency` dari account schema
- **Lines 36, 38-39**: Hapus `currency` dari account create/update schema

### `src/lib/openapi/schemas/auth.ts`
- **Line 17**: Hapus `currency` dari auth/user schema

### `src/lib/openapi/schemas/budgets.ts`
- **Line 13**: Hapus `currency` dari budget schema

### `src/lib/openapi/schemas/debts.ts`
- **Line 14**: Hapus `currency` dari debt schema

### `src/lib/openapi/schemas/settings.ts`
- **Lines 8, 19, 30**: Hapus `currency` dari user settings schema

### `src/lib/openapi/schemas/transactions.ts`
- **Lines 15, 30**: Hapus `currency` dari transaction schema

### `src/lib/openapi/schemas/transfers.ts`
- **Lines 12, 14-15**: Hapus `currency`, `to_currency`, `to_amount` dari transfer schema

## 5.4 — Mocks & Test Data ✅ DONE

### `src/mocks/mockData.ts`
- **Lines 34, 48, 62, 84, 94, 104, 114**: Hapus `currency` dari mock account data
- **Lines 171, 196, 221, 246, 271**: Hapus `currency` dari mock transaction data
- **Lines 292, 305, 318, 331**: Hapus `currency` dari mock transfer data

### `src/mocks/localStorageService.ts`
- **Lines 270, 278**: Hapus `currency` dari mock storage data

### `scripts/test-balance-api.ts`
- **Lines 23, 31, 38-40, 43-45, 63, 72, 76, 81, 86-87, 94, 98, 104, 109-112, 122-124, 128, 131-132, 139-140, 146-147, 150**: Update test script — hapus per-currency grouping assertions, test single dataset

### `scripts/check-balance-data.ts`
- **Lines 17, 22, 33, 38-39, 41, 47-49, 72, 78, 88, 90-91, 94-96, 101-103**: Update diagnostic script — hapus per-currency reporting

### `scripts/check-transaction-amounts.ts`
- **Lines 16, 31**: Hapus currency dari diagnostic output

## 5.5 — Sync Feature ✅ DONE (no changes needed)

### `src/features/sync/index.ts`
- **Line 6**: Hapus re-export currency-aware sync code jika sudah tidak diperlukan

## 5.6 — Dead Code Sweep ✅ DONE

Setelah semua phase selesai, lakukan sweep untuk mencari sisa code yang masih reference currency:

### Pencarian yang harus 0 hasil:
```bash
# Cari referensi currency di seluruh codebase
grep -rn "currency" src/ app/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".next"

# Cari referensi exchange_rate
grep -rn "exchange_rate\|exchangeRate" src/ app/ --include="*.ts" --include="*.tsx"

# Cari referensi to_currency
grep -rn "to_currency\|toCurrency" src/ app/ --include="*.ts" --include="*.tsx"

# Cari referensi to_amount
grep -rn "to_amount\|toAmount" src/ app/ --include="*.ts" --include="*.tsx"

# Cari import CurrencyPicker
grep -rn "CurrencyPicker" src/ app/ --include="*.ts" --include="*.tsx"

# Cari import currencies config
grep -rn "from.*currencies" src/ app/ --include="*.ts" --include="*.tsx"

# Cari getCurrency, getAllCurrencies, getPopularCurrencies
grep -rn "getCurrency\|getAllCurrencies\|getPopularCurrencies\|getCurrencyCodes\|isValidCurrency" src/ app/ --include="*.ts" --include="*.tsx"
```

### Untuk setiap hasil yang ditemukan:
1. Hapus jika dead code
2. Hardcode "IDR" jika masih diperlukan untuk display
3. Hapus parameter jika function signature tidak lagi memerlukan currencyCode

## 5.7 — Final Verification ✅ DONE

- [x] `npx tsc --noEmit` — **0 errors** (passes cleanly!)
- [x] `exchange_rate` / `exchangeRate` — 0 results
- [x] `to_currency` / `toCurrency` — 0 results
- [x] `to_amount` / `toAmount` — 0 results
- [x] `CurrencyPicker` — 0 results (file deleted)
- [x] Remaining `currency` references are only in legitimate IDR-only utilities (useFormattedCurrency, formatCurrency, currencyFormatService, CurrencyReport, currencies.ts)
- [ ] `npm run build` — pending runtime test
- [ ] `npm run dev` — pending runtime test
- [ ] Test flow lengkap — pending runtime test
