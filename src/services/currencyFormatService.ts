import { getCurrency } from '@/config/currencies';

export interface FormatOptions {
  showSymbol?: boolean;      // Include currency symbol
  showCode?: boolean;        // Include currency code
  compact?: boolean;         // Use compact notation (1.5K, 1.5M)
  locale?: string;           // Locale for formatting
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
  forceDecimals?: number;    // Force specific number of decimals (overrides currency default)
}

class CurrencyFormatService {
  private defaultLocale: string = 'en-US';

  /**
   * Set the default locale for all formatting operations
   */
  setDefaultLocale(locale: string): void {
    this.defaultLocale = locale;
  }

  /**
   * Get the current default locale
   */
  getDefaultLocale(): string {
    return this.defaultLocale;
  }

  /**
   * Format amount with currency symbol and proper localization
   * 
   * Examples:
   * formatCurrency(1234.56, 'USD') → "USD 1,234.56"
   * formatCurrency(1234.56, 'EUR') → "EUR 1,234.56"
   * formatCurrency(1234567, 'IDR') → "IDR 1,234,567"
   * formatCurrency(1234, 'JPY') → "JPY 1,234" (no decimals)
   */
  formatCurrency(
    amount: number, 
    currencyCode: string, 
    options: FormatOptions = {}
  ): string {
    const currency = getCurrency(currencyCode);
    const {
      showSymbol = true,
      showCode = true,  // Changed default to true - always show code
      compact = false,
      locale = this.defaultLocale,  // Use default locale
      signDisplay = 'auto',
      forceDecimals
    } = options;
    
    if (!currency) {
      // Fallback for unknown currency
      return `${currencyCode} ${amount.toFixed(2)}`;
    }
    
    // Use forceDecimals if provided, otherwise use currency's default
    const decimalDigits = forceDecimals !== undefined ? forceDecimals : currency.decimalDigits;
    
    try {
      // Format the number without currency symbol first
      const formatter = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: decimalDigits,
        maximumFractionDigits: decimalDigits,
        notation: compact ? 'compact' : 'standard',
        signDisplay: signDisplay as Intl.NumberFormatOptions['signDisplay'],
      });
      
      const formattedNumber = formatter.format(amount);
      
      // Always place currency code BEFORE the number
      if (showCode) {
        return `${currencyCode} ${formattedNumber}`;
      }
      
      // If showSymbol is true and showCode is false, use symbol
      if (showSymbol && !showCode) {
        return `${currency.symbol}${formattedNumber}`;
      }
      
      // Just the number
      return formattedNumber;
    } catch (error) {
      // Fallback if Intl fails
      console.error('Currency formatting failed:', error);
      return `${currencyCode} ${amount.toFixed(currency.decimalDigits)}`;
    }
  }
  
  /**
   * Format amount for input fields (plain number with decimals)
   * 
   * Examples:
   * formatForInput(1234.56, 'USD') → "1234.56"
   * formatForInput(1234, 'JPY') → "1234" (no decimals)
   */
  formatForInput(amount: number, currencyCode: string): string {
    const currency = getCurrency(currencyCode);
    if (!currency) return amount.toString();
    
    return currency.decimalDigits > 0 
      ? amount.toFixed(currency.decimalDigits)
      : Math.round(amount).toString();
  }
  
  /**
   * Parse currency input string to number
   * Handles various formats: "1,234.56", "1.234,56", "1234.56"
   */
  parseAmount(value: string): number {
    if (!value) return 0;
    
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[^0-9.,-]/g, '');
    
    // Detect if using comma as decimal separator
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
  
  /**
   * Get currency symbol only
   */
  getSymbol(currencyCode: string, native = false): string {
    const currency = getCurrency(currencyCode);
    if (!currency) return currencyCode;
    
    return native ? currency.symbolNative : currency.symbol;
  }
  
  /**
   * Get currency name
   */
  getName(currencyCode: string, plural = false): string {
    const currency = getCurrency(currencyCode);
    if (!currency) return currencyCode;
    
    return plural ? currency.namePlural : currency.name;
  }
  
  /**
   * Format with explicit symbol position
   */
  formatWithSymbol(
    amount: number,
    currencyCode: string,
    symbolPosition: 'before' | 'after' = 'before'
  ): string {
    const currency = getCurrency(currencyCode);
    if (!currency) return `${amount} ${currencyCode}`;
    
    const formatted = this.formatCurrency(amount, currencyCode, { showSymbol: false });
    const symbol = currency.symbol;
    
    return symbolPosition === 'before' 
      ? `${symbol}${formatted}`
      : `${formatted} ${symbol}`;
  }
  
  /**
   * Compact format for large numbers
   * 
   * Examples:
   * formatCompact(1234567, 'USD') → "USD 1.2M"
   * formatCompact(1234, 'EUR') → "EUR 1.2K"
   */
  formatCompact(amount: number, currencyCode: string): string {
    return this.formatCurrency(amount, currencyCode, { compact: true });
  }

  /**
   * Compact format with exactly 3 decimal places for mobile space-constrained displays.
   * ≥ 1,000,000 → "IDR 1.822M"
   * ≥ 1,000     → "IDR 430.718K"
   * < 1,000     → full format
   */
  formatShort(amount: number, currencyCode: string): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000) {
      const val = parseFloat((abs / 1_000_000).toFixed(3));
      return `${sign}${currencyCode} ${val}M`;
    }
    if (abs >= 1_000) {
      const val = parseFloat((abs / 1_000).toFixed(3));
      return `${sign}${currencyCode} ${val}K`;
    }
    return this.formatCurrency(amount, currencyCode);
  }
  
  /**
   * Get decimal digits for a currency
   */
  getDecimalDigits(currencyCode: string): number {
    const currency = getCurrency(currencyCode);
    return currency?.decimalDigits ?? 2;
  }
  
  /**
   * Get step value for input fields
   */
  getInputStep(currencyCode: string): string {
    const decimals = this.getDecimalDigits(currencyCode);
    return decimals === 0 ? '1' : `0.${'0'.repeat(decimals - 1)}1`;
  }
  
  /**
   * Format with sign (for income/expense display)
   * 
   * Examples:
   * formatWithSign(1234, 'USD', 'income') → "+USD 1,234.00"
   * formatWithSign(1234, 'USD', 'expense') → "-USD 1,234.00"
   */
  formatWithSign(amount: number, currencyCode: string, type: 'income' | 'expense' | 'transfer'): string {
    const absAmount = Math.abs(amount);
    
    if (type === 'income') {
      // Format: +CODE number
      const formatted = this.formatCurrency(absAmount, currencyCode);
      return `+${formatted}`;
    } else if (type === 'expense') {
      // Format: -CODE number
      const formatted = this.formatCurrency(absAmount, currencyCode);
      return `-${formatted}`;
    }
    
    return this.formatCurrency(absAmount, currencyCode);
  }
}

export const currencyFormatService = new CurrencyFormatService();

// Export for convenience
export const formatCurrency = (amount: number, currency: string) => 
  currencyFormatService.formatCurrency(amount, currency);
  
export const getCurrencySymbol = (currency: string) => 
  currencyFormatService.getSymbol(currency);
