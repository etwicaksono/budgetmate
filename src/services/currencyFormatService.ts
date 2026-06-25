import { logError } from '@/lib/logger';
export interface FormatOptions {
  showSymbol?: boolean;      // Include currency symbol
  showCode?: boolean;        // Include currency code
  compact?: boolean;         // Use compact notation (1.5K, 1.5M)
  locale?: string;           // Locale for formatting
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  forceDecimals?: number;    // Force specific number of decimals (overrides default)
}

// IDR constants — single currency
const CURRENCY_CODE = 'IDR';
const CURRENCY_SYMBOL = 'Rp';
const CURRENCY_DECIMAL_DIGITS = 0;

class CurrencyFormatService {
  private defaultLocale: string = 'id-ID';

  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Format amount with IDR currency code and proper localization
   *
   * Examples:
   * formatCurrency(1234567) → "IDR 1,234,567"
   * formatCurrency(1234, { compact: true }) → "IDR 1.2K"
   */
  formatCurrency(amount: number, options: FormatOptions = {}): string {
    const {
      showSymbol = false,
      showCode = true,
      compact = false,
      locale = this.defaultLocale,
      signDisplay = 'auto',
      forceDecimals,
    } = options;

    const decimalDigits = forceDecimals !== undefined ? forceDecimals : CURRENCY_DECIMAL_DIGITS;

    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: decimalDigits,
        maximumFractionDigits: decimalDigits,
        notation: compact ? 'compact' : 'standard',
        signDisplay: signDisplay as Intl.NumberFormatOptions['signDisplay'],
      });

      const formattedNumber = formatter.format(amount);

      if (showCode) {
        return `${CURRENCY_CODE} ${formattedNumber}`;
      }

      if (showSymbol && !showCode) {
        return `${CURRENCY_SYMBOL} ${formattedNumber}`;
      }

      return formattedNumber;
    } catch (error) {
      logError('Currency formatting failed:', error);
      return `${CURRENCY_CODE} ${amount.toFixed(decimalDigits)}`;
    }
  }

  /**
   * Format amount for input fields (plain number with decimals)
   */
  formatForInput(amount: number): string {
    return CURRENCY_DECIMAL_DIGITS > 0
      ? amount.toFixed(CURRENCY_DECIMAL_DIGITS)
      : Math.round(amount).toString();
  }

  /**
   * Parse currency input string to number
   * Handles various formats: "1,234,567", "1234567", "Rp 1.234.567"
   */
  parseAmount(value: string): number {
    if (!value) return 0;

    const cleaned = value.replace(/[^0-9.,-]/g, '');

    const commaCount = (cleaned.match(/,/g) || []).length;
    const dotCount = (cleaned.match(/\./g) || []).length;

    let normalized = cleaned;

    if (commaCount === 1 && dotCount === 0) {
      // European format: 1.234,56 → 1234.56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (commaCount > 1 || (commaCount === 1 && dotCount === 1)) {
      // US format with thousands: 1,234.56 → 1234.56
      normalized = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  /** Get currency symbol — always "Rp" for IDR */
  getSymbol(_currencyCode?: string, _native = false): string {
    return CURRENCY_SYMBOL;
  }

  /** Get currency name — always "Indonesian Rupiah" for IDR */
  getName(_currencyCode?: string, _plural = false): string {
    return 'Indonesian Rupiah';
  }

  /** Format with explicit symbol position */
  formatWithSymbol(
    amount: number,
    symbolPosition: 'before' | 'after' = 'before'
  ): string {
    const formatted = this.formatCurrency(amount, { showCode: false, showSymbol: true });
    return symbolPosition === 'before'
      ? `${CURRENCY_SYMBOL} ${formatted}`
      : `${formatted} ${CURRENCY_SYMBOL}`;
  }

  /** Compact format for large numbers */
  formatCompact(amount: number): string {
    return this.formatCurrency(amount, { compact: true });
  }

  /**
   * Compact format for mobile space-constrained displays.
   * >= 1,000,000 → "IDR 1.822M"
   * >= 1,000     → "IDR 430.718K"
   * < 1,000     → full format
   */
  formatShort(amount: number): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      const val = parseFloat((abs / 1_000_000).toFixed(3));
      return `${sign}${CURRENCY_CODE} ${val}M`;
    }
    if (abs >= 1_000) {
      const val = parseFloat((abs / 1_000).toFixed(3));
      return `${sign}${CURRENCY_CODE} ${val}K`;
    }
    return this.formatCurrency(amount);
  }

  /** Get decimal digits — always 0 for IDR */
  getDecimalDigits(_currencyCode?: string): number {
    return CURRENCY_DECIMAL_DIGITS;
  }

  /** Get step value for input fields — always "1" for IDR */
  getInputStep(_currencyCode?: string): string {
    return '1';
  }

  /** Format with sign (for income/expense display) */
  formatWithSign(amount: number, type: 'income' | 'expense' | 'transfer'): string {
    const absAmount = Math.abs(amount);

    if (type === 'income') {
      return `+${this.formatCurrency(absAmount)}`;
    } else if (type === 'expense') {
      return `-${this.formatCurrency(absAmount)}`;
    }

    return this.formatCurrency(absAmount);
  }
}

export const currencyFormatService = new CurrencyFormatService();

// Convenience exports
export const formatCurrency = (amount: number) =>
  currencyFormatService.formatCurrency(amount);

export const getCurrencySymbol = (_currency?: string) =>
  currencyFormatService.getSymbol();
