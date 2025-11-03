'use client';

import { useState, useEffect, useMemo } from 'react';
import { debounce } from '../utils/performance';

/**
 * Hook for debounced search input
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object with value, debouncedValue, and setValue
 */
export function useDebouncedSearch(initialValue = '', delay = 300) {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Create debounced function with useMemo to prevent recreation
  const debouncedSetValue = useMemo(
    () => debounce((newValue: string) => {
      setDebouncedValue(newValue);
    }, delay),
    [delay]
  );

  useEffect(() => {
    debouncedSetValue(value);
  }, [value, debouncedSetValue]);

  return {
    value,
    debouncedValue,
    setValue,
  };
}

/**
 * Hook for debounced callback
 * @param callback - Function to debounce
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  return useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  );
}
