/**
 * Locale Configuration
 * Defines available locales and their number formatting patterns
 */

export interface LocaleOption {
  code: string;           // Locale code (e.g., 'en-US')
  name: string;           // Display name
  numberFormat: string;   // Example format
  example: string;        // Full example with label
}

export const AVAILABLE_LOCALES: LocaleOption[] = [
  {
    code: 'en-US',
    name: 'English (United States)',
    numberFormat: '1,234.56',
    example: 'Example: 1,234.56'
  },
  {
    code: 'en-GB',
    name: 'English (United Kingdom)',
    numberFormat: '1,234.56',
    example: 'Example: 1,234.56'
  },
  {
    code: 'de-DE',
    name: 'German (Germany)',
    numberFormat: '1.234,56',
    example: 'Example: 1.234,56'
  },
  {
    code: 'id-ID',
    name: 'Indonesian (Indonesia)',
    numberFormat: '1.234,56',
    example: 'Example: 1.234,56'
  },
  {
    code: 'fr-FR',
    name: 'French (France)',
    numberFormat: '1 234,56',
    example: 'Example: 1 234,56'
  },
  {
    code: 'ja-JP',
    name: 'Japanese (Japan)',
    numberFormat: '1,234.56',
    example: 'Example: 1,234.56'
  },
  {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    numberFormat: '1.234,56',
    example: 'Example: 1.234,56'
  },
  {
    code: 'it-IT',
    name: 'Italian (Italy)',
    numberFormat: '1.234,56',
    example: 'Example: 1.234,56'
  },
  {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)',
    numberFormat: '1.234,56',
    example: 'Example: 1.234,56'
  },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    numberFormat: '1,234.56',
    example: 'Example: 1,234.56'
  }
];

/**
 * Get locale option by code
 */
export function getLocaleOption(code: string): LocaleOption | undefined {
  return AVAILABLE_LOCALES.find(locale => locale.code === code);
}

/**
 * Get default locale
 */
export function getDefaultLocale(): LocaleOption {
  return AVAILABLE_LOCALES[0]!; // en-US
}

/**
 * Check if locale code is valid
 */
export function isValidLocale(code: string): boolean {
  return AVAILABLE_LOCALES.some(locale => locale.code === code);
}
