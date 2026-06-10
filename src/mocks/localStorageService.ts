/**
 * Local Storage Service
 * 
 * Centralized service for managing localStorage operations.
 * Follows DRY principle - single source of truth for storage keys and operations.
 * Provides type-safe storage with error handling and SSR safety.
 */

// Storage Keys
const STORAGE_KEYS = {
  WIDGET_ORDER: 'dashboard-widget-order',
  WIDGET_VISIBILITY: 'dashboard-widget-visibility',
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user-preferences',
  INCLUDE_DRAFT: 'dashboard-include-draft',
} as const;

// Default Values
export const DEFAULT_WIDGET_ORDER = [
  'netWorth',
  'balanceTrend',
  'expensesByCategory',
  'incomeVsExpenses',
  'recentTransactions',
  'budgetStatus',
];

export const DEFAULT_WIDGET_VISIBILITY = {
  netWorth: true,
  balanceTrend: true,
  expensesByCategory: true,
  incomeVsExpenses: true,
  recentTransactions: true,
  budgetStatus: true,
};

// Type Definitions
export type WidgetVisibility = typeof DEFAULT_WIDGET_VISIBILITY;

/**
 * Check if localStorage is available (SSR safety)
 */
const isLocalStorageAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
};

/**
 * Generic get function with type safety
 */
const getItem = <T>(key: string, defaultValue: T): T => {
  if (!isLocalStorageAvailable()) {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.error(`Failed to get item from localStorage (${key}):`, error);
  }

  return defaultValue;
};

/**
 * Generic set function with error handling
 */
const setItem = <T>(key: string, value: T): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set item in localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Remove item from localStorage
 */
const removeItem = (key: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove item from localStorage (${key}):`, error);
    return false;
  }
};

/**
 * Clear all localStorage
 */
const clear = (): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
    return false;
  }
};

// ============================================================================
// Widget Order Operations
// ============================================================================

/**
 * Load widget order from localStorage
 */
export const loadWidgetOrder = (): string[] => {
  const stored = getItem<string[]>(STORAGE_KEYS.WIDGET_ORDER, DEFAULT_WIDGET_ORDER);
  
  // Validate array length matches expected
  if (Array.isArray(stored) && stored.length === DEFAULT_WIDGET_ORDER.length) {
    return stored;
  }
  
  return DEFAULT_WIDGET_ORDER;
};

/**
 * Save widget order to localStorage
 */
export const saveWidgetOrder = (order: string[]): boolean => {
  return setItem(STORAGE_KEYS.WIDGET_ORDER, order);
};

// ============================================================================
// Widget Visibility Operations
// ============================================================================

/**
 * Load widget visibility from localStorage
 */
export const loadWidgetVisibility = (): WidgetVisibility => {
  const stored = getItem<WidgetVisibility>(STORAGE_KEYS.WIDGET_VISIBILITY, DEFAULT_WIDGET_VISIBILITY);
  
  // Validate all expected keys exist
  const hasAllKeys = Object.keys(DEFAULT_WIDGET_VISIBILITY).every(key => key in stored);
  if (hasAllKeys) {
    return stored;
  }
  
  return DEFAULT_WIDGET_VISIBILITY;
};

/**
 * Save widget visibility to localStorage
 */
export const saveWidgetVisibility = (visibility: WidgetVisibility): boolean => {
  return setItem(STORAGE_KEYS.WIDGET_VISIBILITY, visibility);
};

// ============================================================================
// Auth Token Operations
// ============================================================================

/**
 * Get auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
};

/**
 * Set auth token in localStorage
 */
export const setAuthToken = (token: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('Failed to set auth token:', error);
    return false;
  }
};

/**
 * Remove auth token from localStorage
 */
export const removeAuthToken = (): boolean => {
  return removeItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

/**
 * Set refresh token in localStorage
 */
export const setRefreshToken = (token: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    return true;
  } catch (error) {
    console.error('Failed to set refresh token:', error);
    return false;
  }
};

/**
 * Remove refresh token from localStorage
 */
export const removeRefreshToken = (): boolean => {
  return removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Clear all auth tokens
 */
export const clearAuthTokens = (): boolean => {
  const tokenCleared = removeAuthToken();
  const refreshCleared = removeRefreshToken();
  return tokenCleared && refreshCleared;
};

// ============================================================================
// User Preferences Operations
// ============================================================================

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  locale?: string;
  currency?: string;
  dateFormat?: string;
  [key: string]: unknown;
}

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'auto',
  locale: 'en-US',
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
};

/**
 * Load user preferences from localStorage
 */
export const loadUserPreferences = (): UserPreferences => {
  return getItem<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_USER_PREFERENCES);
};

/**
 * Save user preferences to localStorage
 */
export const saveUserPreferences = (preferences: UserPreferences): boolean => {
  return setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
};

/**
 * Update specific user preference
 */
export const updateUserPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): boolean => {
  const current = loadUserPreferences();
  const updated = { ...current, [key]: value };
  return saveUserPreferences(updated);
};

// ============================================================================
// Draft Filter Operations
// ============================================================================

/**
 * Load the "include draft" toggle state (default: false — exclude drafts)
 */
export const loadIncludeDraft = (): boolean => {
  return getItem<boolean>(STORAGE_KEYS.INCLUDE_DRAFT, false);
};

/**
 * Save the "include draft" toggle state
 */
export const saveIncludeDraft = (value: boolean): boolean => {
  return setItem(STORAGE_KEYS.INCLUDE_DRAFT, value);
};

// ============================================================================
// Export Service Object
// ============================================================================

export const localStorageService = {
  // Widget Operations
  loadWidgetOrder,
  saveWidgetOrder,
  loadWidgetVisibility,
  saveWidgetVisibility,
  
  // Auth Token Operations
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  clearAuthTokens,
  
  // User Preferences
  loadUserPreferences,
  saveUserPreferences,
  updateUserPreference,

  // Draft Filter
  loadIncludeDraft,
  saveIncludeDraft,
  
  // Generic Operations
  clear,
};

export default localStorageService;
