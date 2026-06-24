import { useEffect, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext';
import { currencyFormatService, type FormatOptions } from '@/services/currencyFormatService';

/**
 * Hook to format currency using user's preferred locale
 * Automatically updates when locale changes
 */
export function useFormattedCurrency() {
  const { locale } = useLocale();

  // Update the service's default locale whenever user's locale changes
  useEffect(() => {
    currencyFormatService.setDefaultLocale(locale);
  }, [locale]);

  // Memoized format function that uses user's locale
  const formatCurrency = useCallback(
    (amount: number, optionsOrLegacy?: FormatOptions | string, maybeOptions?: FormatOptions) => {
      const options = typeof optionsOrLegacy === 'string' ? maybeOptions : optionsOrLegacy;
      return currencyFormatService.formatCurrency(amount, {
        forceDecimals: 0,
        ...(options ?? {}),
        locale,
      });
    },
    [locale]
  );

  const formatCompact = useCallback(
    (amount: number, _legacy?: unknown) => {
      return currencyFormatService.formatCompact(amount);
    },
    []
  );

  const formatWithSign = useCallback(
    (amount: number, typeOrLegacy?: 'income' | 'expense' | 'transfer' | string, maybeType?: 'income' | 'expense' | 'transfer') => {
      const type = typeOrLegacy === 'income' || typeOrLegacy === 'expense' || typeOrLegacy === 'transfer'
        ? typeOrLegacy
        : maybeType || 'transfer';
      return currencyFormatService.formatWithSign(amount, type);
    },
    []
  );

  const formatShort = useCallback(
    (amount: number, _legacy?: unknown) => {
      return currencyFormatService.formatShort(amount);
    },
    []
  );

  return {
    formatCurrency,
    formatCompact,
    formatShort,
    formatWithSign,
    locale,
    // Expose other service methods
    parseAmount: currencyFormatService.parseAmount.bind(currencyFormatService),
    getSymbol: () => 'Rp',
    getName: () => 'Indonesian Rupiah',
    getDecimalDigits: () => 0,
  };
}
