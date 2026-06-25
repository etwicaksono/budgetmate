/**
 * Logger utility that adds caller file:line info to error logs.
 *
 * Usage:
 *   import { logError } from '@/lib/logger';
 *   logError('Failed to fetch accounts:', error);
 *   // Output: [accounts/page.tsx:224] Failed to fetch accounts: Error: ...
 */

/**
 * Extract the caller's file name and line number from the stack trace.
 * Skips frames originating from this logger module.
 */
function getCallerLocation(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown';

  const lines = stack.split('\n');

  for (const line of lines) {
    // Skip frames from logger module
    if (line.includes('logger')) continue;

    // Match: at functionName (path:line:col) or at path:line:col
    // (.+) is greedy and backtracks to find the last :line:col
    const match = line.match(/at\s+(?:\S+\s+\()?(.+):(\d+):\d+\)?\s*$/);
    if (match) {
      const fullPath = match[1] ?? 'unknown';
      const lineNumber = match[2] ?? '0';
      const fileName = fullPath.split(/[/\\]/).pop() ?? fullPath;
      return `${fileName}:${lineNumber}`;
    }
  }

  return 'unknown';
}

/**
 * Log an error with caller location prefix.
 * Drop-in replacement for console.error with automatic file:line detection.
 *
 * @example
 * // Before: console.error('Failed to fetch accounts:', error);
 * // After:  logError('Failed to fetch accounts:', error);
 * // Output: [accounts/page.tsx:224] Failed to fetch accounts: Error: ...
 */
export function logError(...args: unknown[]): void {
  const location = getCallerLocation();
  console.error(`[${location}]`, ...args);
}
