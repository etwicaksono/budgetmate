'use client';

import { useMemo } from 'react';
import { throttle } from '../utils/performance';

/**
 * Hook for throttled callback
 * Useful for scroll handlers, resize handlers, etc.
 * @param callback - Function to throttle
 * @param delay - Throttle delay in milliseconds (default: 100ms)
 * @returns Throttled version of the callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay = 100
): (...args: Parameters<T>) => void {
  return useMemo(
    () => throttle(callback, delay),
    [callback, delay]
  );
}
