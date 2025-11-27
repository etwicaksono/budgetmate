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
    (amount: number, currencyCode: string, options?: FormatOptions) => {
      return currencyFormatService.formatCurrency(amount, currencyCode, {
        forceDecimals: 2, // Force 2 decimals for all currencies for consistency
        ...options,
        locale, // Always use user's locale
      });
    },
    [locale]
  );

  const formatCompact = useCallback(
    (amount: number, currencyCode: string) => {
      return currencyFormatService.formatCompact(amount, currencyCode);
    },
    [locale]
  );

  const formatWithSign = useCallback(
    (amount: number, currencyCode: string, type: 'income' | 'expense' | 'transfer') => {
      return currencyFormatService.formatWithSign(amount, currencyCode, type);
    },
    [locale]
  );

  return {
    formatCurrency,
    formatCompact,
    formatWithSign,
    locale,
    // Expose other service methods
    parseAmount: currencyFormatService.parseAmount.bind(currencyFormatService),
    getSymbol: currencyFormatService.getSymbol.bind(currencyFormatService),
    getName: currencyFormatService.getName.bind(currencyFormatService),
    getDecimalDigits: currencyFormatService.getDecimalDigits.bind(currencyFormatService),
  };
}
