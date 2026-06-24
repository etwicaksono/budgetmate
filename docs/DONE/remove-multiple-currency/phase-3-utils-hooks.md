# Phase 3 — Utils & Hooks

> Simplify utility functions dan hooks menjadi IDR-only. Hapus semua logic multi-currency conversion.

## 3.1 — Config ✅ DONE

### `src/config/currencies.ts`
File ini berisi registry 30+ currency. **Hapus seluruh file** dan ganti dengan versi minimal:

```typescript
// Single-currency config (IDR only)
export const CURRENCY_CODE = 'IDR';
export const CURRENCY_SYMBOL = 'Rp';
export const CURRENCY_DECIMAL_DIGITS = 0;
export const CURRENCY_LOCALE = 'id-ID';
```

### Update semua import dari `currencies.ts`
Cari semua file yang import dari `@/config/currencies` dan update:
- Hapus import `CURRENCIES`, `getAllCurrencies`, `getPopularCurrencies`, `getCurrencyCodes`, `isValidCurrency`
- Ganti `getCurrency(code)` dengan hardcoded IDR config
- Ganti `getCurrencySymbol(code)` dengan `"Rp"`

## 3.2 — Utils ✅ DONE

### `src/utils/transferUtils.ts` (39 referensi)
File ini berisi semua logic multi-currency transfer. Simplify:

- **Lines 25-33** (`Transfer` interface): Hapus field `to_amount`, `currency`, `to_currency`
  ```typescript
  export interface Transfer {
    id: string;
    amount: number;
    from_account?: string;
    to_account?: string;
  }
  ```

- **Lines 35-38** (`TransferDestination` interface): Hapus — tidak diperlukan lagi

- **Lines 97-127** (Currency conversion utilities): Hapus seluruh section:
  - `isMultiCurrencyTransfer()` — hapus, selalu return false
  - `isSameCurrencyTransfer()` — hapus, selalu return true
  - `getTransferDestination()` — hapus, destination = source

- **Lines 129-157** (`shouldUseNullForDestination`): Hapus — tidak ada destination fields

- **Lines 159-181** (`validateSameCurrencyTransfer`): Hapus — tidak ada multi-currency

- **Lines 183-204** (`validateMultiCurrencyTransfer`): Hapus — tidak ada multi-currency

- **Pertahankan**: `isTransferTransaction()`, `mapTransferAccounts()`, `getModalTransactionType()` — ini tidak terkait currency

### `src/utils/formatters.ts`
- **Lines 6, 9, 11-12**: Hapus import dari currencies config
- **Lines 36-37, 39-40**: Hapus parameter `currencyCode` dari format functions, hardcode "IDR"
- **Lines 46-47, 68, 70**: Hapus currency symbol lookup, hardcode "Rp"

### `src/utils/constants.ts`
- **Line 40**: Hapus atau update currency-related constant/label

## 3.3 — Hooks ✅ DONE

### `src/hooks/useFormattedCurrency.ts`
Simplify menjadi IDR-only:

```typescript
import { useEffect, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { currencyFormatService, type FormatOptions } from '@/services/currencyFormatService';

export function useFormattedCurrency() {
  const { locale } = useLocale();

  useEffect(() => {
    currencyFormatService.setDefaultLocale(locale);
  }, [locale]);

  // Hardcode IDR — no currencyCode parameter needed
  const formatCurrency = useCallback(
    (amount: number, options?: FormatOptions) => {
      return currencyFormatService.formatCurrency(amount, {
        forceDecimals: 0, // IDR has 0 decimals
        ...options,
        locale,
      });
    },
    [locale]
  );

  const formatCompact = useCallback(
    (amount: number) => currencyFormatService.formatCompact(amount),
    []
  );

  const formatWithSign = useCallback(
    (amount: number, type: 'income' | 'expense' | 'transfer') =>
      currencyFormatService.formatWithSign(amount, type),
    []
  );

  const formatShort = useCallback(
    (amount: number) => currencyFormatService.formatShort(amount),
    []
  );

  return {
    formatCurrency,
    formatCompact,
    formatShort,
    formatWithSign,
    locale,
    parseAmount: currencyFormatService.parseAmount.bind(currencyFormatService),
    getSymbol: () => 'Rp',
    getName: () => 'Indonesian Rupiah',
    getDecimalDigits: () => 0,
  };
}
```

**Key changes**:
- Hapus parameter `currencyCode` dari semua function
- `forceDecimals: 0` (IDR has no decimals)
- `getSymbol` return "Rp" selalu
- `getName` return "Indonesian Rupiah" selalu
- `getDecimalDigits` return 0 selalu

### `src/hooks/useNetWorth.ts`
- **Lines 8, 41, 44-46, 51, 54-56**: Hapus per-currency calculation — return single total
- **Lines 103, 108, 110, 115-119**: Hapus currency grouping dari response
- **Strategi**: Ubah dari `Record<currency, amount>` menjadi single `number`

### `src/hooks/useIncomeExpenseData.ts`
- **Lines 31, 55, 57, 118**: Hapus grouping by currency — return single dataset

### `src/hooks/useFilterData.ts`
- **Lines 203-204**: Hapus `currencies` dari filter state
- **Line 278**: Hapus `currencies` dari filter params

### `src/hooks/useTransactionActions.ts`
- **Lines 58-61**: Hapus destination currency derivation
- **Lines 77-79**: Hapus `to_currency` dari transfer payload
- **Line 97**: Hapus currency dari transaction data

### `src/hooks/useTransactionForm.ts`
- **Line 11**: Hapus `to_amount` dari form state
- **Line 51**: Hapus destination amount state
- **Lines 139, 157**: Hapus `to_amount` dari form data

### `src/hooks/useAccountModal.ts`
- **Line 16**: Hapus `currency` dari form state
- **Line 67**: Hapus `currency` dari initial form values
- **Line 83**: Hapus `currency` dari form data
- **Line 113**: Hapus `currency` dari submit payload

## 3.4 — Context ✅ DONE

### `src/context/AuthContext.tsx`
- **Line 17**: Hapus `currency` dari user context type

### `src/context/TransactionContext.tsx`
- **Line 19**: Hapus `to_amount`, `to_currency` dari transaction context type

### `src/context/TransactionModalContext.tsx`
- **Line 28**: Hapus currency state tracking

## 3.5 — Verifikasi ✅ DONE

- [x] `npx tsc --noEmit` — remaining errors are all in UI components (Phase 4), scripts (Phase 5), and mocks (Phase 5)
- [x] `src/config/currencies.ts` — simplified to IDR-only
- [x] `src/utils/transferUtils.ts` — no multi-currency functions remain
- [x] `src/hooks/useFormattedCurrency.ts` — no `currencyCode` parameter
- [ ] Test formatting — pending until Phase 4 UI is fixed
