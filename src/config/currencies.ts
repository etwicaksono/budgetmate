// Single-currency config (IDR only)
export const CURRENCY_CODE = 'IDR';
export const CURRENCY_SYMBOL = 'Rp';
export const CURRENCY_DECIMAL_DIGITS = 0;
export const CURRENCY_LOCALE = 'id-ID';

// Minimal CurrencyConfig for backward compatibility
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  symbolNative: string;
  decimalDigits: number;
  rounding: number;
  namePlural: string;
  flag?: string;
  countryCode?: string;
  popular: boolean;
}

const IDR_CONFIG: CurrencyConfig = {
  code: 'IDR',
  name: 'Indonesian Rupiah',
  symbol: 'Rp',
  symbolNative: 'Rp',
  decimalDigits: 0,
  rounding: 0,
  namePlural: 'Indonesian rupiahs',
  flag: '🇮🇩',
  countryCode: 'ID',
  popular: true,
};

const CURRENCIES: Record<string, CurrencyConfig> = {
  IDR: IDR_CONFIG,
};

// Utility functions — all return IDR-only data for backward compatibility
export function getCurrency(code: string): CurrencyConfig | undefined {
  return CURRENCIES[code] ?? IDR_CONFIG;
}

export function getAllCurrencies(): CurrencyConfig[] {
  return [IDR_CONFIG];
}

export function getPopularCurrencies(): CurrencyConfig[] {
  return [IDR_CONFIG];
}

export function getCurrencySymbol(_code: string): string {
  return 'Rp';
}

export function getCurrencyCodes(): string[] {
  return ['IDR'];
}

export function isValidCurrency(code: string): boolean {
  return code === 'IDR';
}
