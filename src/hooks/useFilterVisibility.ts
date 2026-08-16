import { useCallback, useEffect, useRef, useState } from 'react';
import { logError } from '@/lib/logger';

/**
 * Per-sidebar filter visibility, persisted to its own localStorage key.
 *
 * The transactions sidebar keeps its visibility inside useFilterData under the
 * shared 'filter-visibility' key. Sidebars that render a different set of
 * filters get their own key so hiding a filter on one page does not hide it on
 * another that happens to share the same hook.
 *
 * Generic over the filter keys so callers get a checked map instead of an index
 * signature, which catches a guard that misspells one of its own filter ids.
 */
/**
 * Merge a persisted visibility map over the defaults.
 *
 * Stored data is untrusted: it may be malformed, hold non-boolean values, or
 * name filters a sidebar no longer offers. Unknown keys are dropped so a stale
 * entry can't resurrect a filter, and non-booleans fall back to the default.
 */
export function mergeStoredVisibility<K extends string>(
  defaults: Record<K, boolean>,
  stored: string | null
): Record<K, boolean> {
  if (!stored) return defaults;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    logError('Failed to parse filter visibility:', error);
    return defaults;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return defaults;
  }

  const record = parsed as Record<string, unknown>;
  const merged = { ...defaults };

  (Object.keys(defaults) as K[]).forEach((key) => {
    const value = record[key];
    if (typeof value === 'boolean') {
      merged[key] = value;
    }
  });

  return merged;
}

export function useFilterVisibility<K extends string>(
  storageKey: string,
  defaults: Record<K, boolean>
) {
  const [visibility, setVisibility] = useState<Record<K, boolean>>(defaults);

  // Hydrate after mount — localStorage is unavailable during SSR
  const restored = useRef(false);

  useEffect(() => {
    try {
      setVisibility(mergeStoredVisibility(defaults, localStorage.getItem(storageKey)));
    } catch (error) {
      logError('Failed to read filter visibility from localStorage:', error);
    } finally {
      restored.current = true;
    }
    // defaults is a module-level constant at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    // Skip the first pass so the defaults don't overwrite what we just restored
    if (!restored.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(visibility));
    } catch (error) {
      logError('Failed to persist filter visibility to localStorage:', error);
    }
  }, [storageKey, visibility]);

  const toggle = useCallback((id: K) => {
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return { visibility, toggle };
}
