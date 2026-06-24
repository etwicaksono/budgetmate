/**
 * Typed event bus for cross-component communication.
 *
 * Replaces the previous untyped window.dispatchEvent/addEventListener pattern
 * with a type-safe wrapper that:
 * - Ensures event names and payloads are type-checked
 * - Centralizes all event names in one place
 * - Provides proper cleanup in useEffect
 * - Avoids string typos
 */

// All app event types
export type AppEventMap = {
  'account-created': { accountId: string };
  'account-updated': { accountId: string };
  'account-deleted': { accountId: string };
  'transaction-created': { transactionId: string };
  'transaction-updated': { transactionId: string };
  'transaction-deleted': { transactionId: string };
  'category-created': { categoryId: string };
  'category-updated': { categoryId: string };
  'category-deleted': { categoryId: string };
  'debt-created': { debtId: string };
  'debt-updated': { debtId: string };
  'debt-deleted': { debtId: string };
  'label-created': { labelId: string };
  'label-updated': { labelId: string };
  'label-deleted': { labelId: string };
  'transfer-created': { transferId: string };
  'transfer-updated': { transferId: string };
  'transfer-deleted': { transferId: string };
};

type AppEventName = keyof AppEventMap;

/**
 * Dispatch a typed app event.
 */
export function dispatchAppEvent<K extends AppEventName>(
  eventName: K,
  detail: AppEventMap[K]
): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

/**
 * Subscribe to a typed app event.
 * Returns an unsubscribe function.
 */
export function onAppEvent<K extends AppEventName>(
  eventName: K,
  handler: (detail: AppEventMap[K]) => void
): () => void {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<AppEventMap[K]>;
    handler(customEvent.detail);
  };

  window.addEventListener(eventName, listener);

  return () => {
    window.removeEventListener(eventName, listener);
  };
}
