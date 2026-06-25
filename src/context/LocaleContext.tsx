'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AVAILABLE_LOCALES, getDefaultLocale, isValidLocale, type LocaleOption } from '@/config/locales';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { api } from '@/services/api';
import { logError } from '@/lib/logger';

interface LocaleContextValue {
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  availableLocales: LocaleOption[];
  loading: boolean;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'user-locale';

export function LocaleProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [locale, setLocaleState] = useState<string>('en-US');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();

  // Load locale from user settings or localStorage
  useEffect(() => {
    const loadLocale = async () => {
      try {
        setLoading(true);

        // Try localStorage first (for quick load)
        const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (storedLocale && isValidLocale(storedLocale)) {
          setLocaleState(storedLocale);
        }

        // If authenticated, try to load from user settings
        if (isAuthenticated && user) {
          try {
            const response = await api.get<{ success: boolean; data?: { locale?: string } }>('/user/settings');
            if (response.success && response.data?.locale && isValidLocale(response.data.locale)) {
              setLocaleState(response.data.locale);
              localStorage.setItem(LOCALE_STORAGE_KEY, response.data.locale);
            }
          } catch (error) {
            logError('Failed to load user locale from API:', error);
            // Continue with localStorage value
          }
        }
      } catch (error) {
        logError('Failed to load locale:', error);
        setLocaleState(getDefaultLocale().code);
      } finally {
        setLoading(false);
      }
    };

    loadLocale();
  }, [isAuthenticated, user]);

  // Update locale
  const setLocale = useCallback(async (newLocale: string) => {
    if (!isValidLocale(newLocale)) {
      showToast('Invalid locale selected', 'error');
      return;
    }

    try {
      // Update local state immediately for responsive UI
      setLocaleState(newLocale);
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);

      // Save to database if authenticated
      if (isAuthenticated) {
        try {
          const response = await api.put<{ success: boolean; error?: { message?: string } }>(
            '/user/settings',
            { locale: newLocale }
          );

          if (!response.success) {
            throw new Error(response.error?.message || 'Failed to save locale');
          }

          showToast('Number format preference saved', 'success');
        } catch (error) {
          logError('Failed to save locale to server:', error);
          showToast('Locale updated locally, but failed to save to server', 'warning');
        }
      } else {
        showToast('Number format preference updated', 'success');
      }
    } catch (error) {
      logError('Failed to update locale:', error);
      showToast('Failed to update number format preference', 'error');
    }
  }, [isAuthenticated, showToast]);

  const value: LocaleContextValue = {
    locale,
    setLocale,
    availableLocales: AVAILABLE_LOCALES,
    loading,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
