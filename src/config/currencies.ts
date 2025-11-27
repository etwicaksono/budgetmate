export interface CurrencyConfig {
  code: string;           // ISO 4217 code
  name: string;           // Full name
  symbol: string;         // Currency symbol
  symbolNative: string;   // Native symbol
  decimalDigits: number;  // Decimal places (0 for JPY, 2 for most)
  rounding: number;       // Rounding increment
  namePlural: string;     // Plural form
  flag?: string;          // Country flag emoji
  countryCode?: string;   // ISO country code (e.g., "US", "GB", "ID")
  popular: boolean;       // Show in popular section
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  // Americas
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'US dollars',
    flag: '🇺🇸',
    countryCode: 'US',
    popular: true
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Canadian dollars',
    flag: '🇨🇦',
    countryCode: 'CA',
    popular: true
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    symbolNative: 'R$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Brazilian reais',
    flag: '🇧🇷',
    countryCode: 'BR',
    popular: false
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: 'MX$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Mexican pesos',
    flag: '🇲🇽',
    countryCode: 'MX',
    popular: false
  },
  
  // Europe
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolNative: '€',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'euros',
    flag: '🇪🇺',
    countryCode: 'EU',
    popular: true
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolNative: '£',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'British pounds',
    flag: '🇬🇧',
    countryCode: 'GB',
    popular: true
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    symbolNative: 'CHF',
    decimalDigits: 2,
    rounding: 0.05,
    namePlural: 'Swiss francs',
    flag: '🇨🇭',
    countryCode: 'CH',
    popular: true
  },
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    symbolNative: 'kr',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Swedish kronor',
    flag: '🇸🇪',
    countryCode: 'SE',
    popular: false
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    symbol: 'kr',
    symbolNative: 'kr',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Norwegian kroner',
    flag: '🇳🇴',
    countryCode: 'NO',
    popular: false
  },
  DKK: {
    code: 'DKK',
    name: 'Danish Krone',
    symbol: 'kr',
    symbolNative: 'kr',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Danish kroner',
    flag: '🇩🇰',
    countryCode: 'DK',
    popular: false
  },
  PLN: {
    code: 'PLN',
    name: 'Polish Zloty',
    symbol: 'zł',
    symbolNative: 'zł',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Polish zlotys',
    flag: '🇵🇱',
    countryCode: 'PL',
    popular: false
  },
  
  // Asia
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    symbolNative: '¥',
    decimalDigits: 0,
    rounding: 0,
    namePlural: 'Japanese yen',
    flag: '🇯🇵',
    countryCode: 'JP',
    popular: true
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: 'CN¥',
    symbolNative: '¥',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Chinese yuan',
    flag: '🇨🇳',
    countryCode: 'CN',
    popular: true
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    symbolNative: '₹',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Indian rupees',
    flag: '🇮🇳',
    countryCode: 'IN',
    popular: true
  },
  IDR: {
    code: 'IDR',
    name: 'Indonesian Rupiah',
    symbol: 'Rp',
    symbolNative: 'Rp',
    decimalDigits: 0,
    rounding: 0,
    namePlural: 'Indonesian rupiahs',
    flag: '🇮🇩',
    countryCode: 'ID',
    popular: true
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Singapore dollars',
    flag: '🇸🇬',
    countryCode: 'SG',
    popular: true
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Hong Kong dollars',
    flag: '🇭🇰',
    countryCode: 'HK',
    popular: false
  },
  KRW: {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    symbolNative: '₩',
    decimalDigits: 0,
    rounding: 0,
    namePlural: 'South Korean won',
    flag: '🇰🇷',
    countryCode: 'KR',
    popular: false
  },
  THB: {
    code: 'THB',
    name: 'Thai Baht',
    symbol: '฿',
    symbolNative: '฿',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Thai baht',
    flag: '🇹🇭',
    countryCode: 'TH',
    popular: false
  },
  MYR: {
    code: 'MYR',
    name: 'Malaysian Ringgit',
    symbol: 'RM',
    symbolNative: 'RM',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Malaysian ringgits',
    flag: '🇲🇾',
    countryCode: 'MY',
    popular: false
  },
  PHP: {
    code: 'PHP',
    name: 'Philippine Peso',
    symbol: '₱',
    symbolNative: '₱',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Philippine pesos',
    flag: '🇵🇭',
    countryCode: 'PH',
    popular: false
  },
  VND: {
    code: 'VND',
    name: 'Vietnamese Dong',
    symbol: '₫',
    symbolNative: '₫',
    decimalDigits: 0,
    rounding: 0,
    namePlural: 'Vietnamese dong',
    flag: '🇻🇳',
    countryCode: 'VN',
    popular: false
  },
  
  // Oceania
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Australian dollars',
    flag: '🇦🇺',
    countryCode: 'AU',
    popular: true
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    symbolNative: '$',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'New Zealand dollars',
    flag: '🇳🇿',
    countryCode: 'NZ',
    popular: false
  },
  
  // Middle East & Africa
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED',
    symbolNative: 'د.إ',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'UAE dirhams',
    flag: '🇦🇪',
    countryCode: 'AE',
    popular: false
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR',
    symbolNative: 'ر.س',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Saudi riyals',
    flag: '🇸🇦',
    countryCode: 'SA',
    popular: false
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    symbolNative: 'R',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'South African rand',
    flag: '🇿🇦',
    countryCode: 'ZA',
    popular: false
  },
  
  // Other
  RUB: {
    code: 'RUB',
    name: 'Russian Ruble',
    symbol: '₽',
    symbolNative: '₽',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Russian rubles',
    flag: '🇷🇺',
    countryCode: 'RU',
    popular: false
  },
  TRY: {
    code: 'TRY',
    name: 'Turkish Lira',
    symbol: '₺',
    symbolNative: '₺',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Turkish lira',
    flag: '🇹🇷',
    countryCode: 'TR',
    popular: false
  },
  ILS: {
    code: 'ILS',
    name: 'Israeli Shekel',
    symbol: '₪',
    symbolNative: '₪',
    decimalDigits: 2,
    rounding: 0,
    namePlural: 'Israeli shekels',
    flag: '🇮🇱',
    countryCode: 'IL',
    popular: false
  },
};

// Utility functions
export function getCurrency(code: string): CurrencyConfig | undefined {
  return CURRENCIES[code];
}

export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES).sort((a, b) => a.name.localeCompare(b.name));
}

export function getPopularCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES)
    .filter(c => c.popular)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCurrencySymbol(code: string): string {
  return CURRENCIES[code]?.symbol || code;
}

export function getCurrencyCodes(): string[] {
  return Object.keys(CURRENCIES).sort();
}

export function isValidCurrency(code: string): boolean {
  return code in CURRENCIES;
}
