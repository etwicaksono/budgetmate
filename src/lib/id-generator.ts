/**
 * ID Generation Utilities
 * 
 * This module provides utilities for generating sortable, unique identifiers.
 * Uses CUID2 which provides:
 * - Time-sortable (k-sortable)
 * - Collision-resistant
 * - URL-safe
 * - Shorter than UUIDs
 * 
 * To migrate existing database from UUID to CUID2:
 * 1. Update prisma/schema.prisma:
 *    - Change `@default(uuid())` to `@default(cuid())`
 *    - Or use custom default: `@default(dbgenerated("gen_cuid()"))`
 * 2. Create and run migration
 * 3. Update existing records (optional, only for new records to benefit)
 * 
 * For new installations, use CUID2 from the start by modifying schema.prisma.
 */

import { createId } from '@paralleldrive/cuid2';

/**
 * Generate a sortable unique ID using CUID2
 * @returns A sortable, collision-resistant unique identifier
 */
export function generateSortableId(): string {
  return createId();
}

/**
 * Generate multiple sortable IDs at once
 * @param count Number of IDs to generate
 * @returns Array of sortable unique identifiers
 */
export function generateSortableIds(count: number): string[] {
  return Array.from({ length: count }, () => createId());
}

/**
 * Check if a string is a valid CUID2
 * @param id String to validate
 * @returns true if valid CUID2 format
 */
export function isValidCuid(id: string): boolean {
  // CUID2 format: starts with a lowercase letter, followed by lowercase letters and digits
  // Length is configurable but typically 24 characters
  return /^[a-z][a-z0-9]{8,}$/.test(id);
}

/**
 * Usage examples:
 * 
 * // In API routes or services:
 * import { generateSortableId } from '@/lib/id-generator';
 * 
 * // Create new record with sortable ID
 * const newAccount = await prisma.account.create({
 *   data: {
 *     id: generateSortableId(), // Only needed if not using @default(cuid()) in schema
 *     // ... other fields
 *   }
 * });
 * 
 * // For existing UUID-based systems:
 * // The current system uses UUID (@default(uuid()) in schema)
 * // To adopt CUID2, you would need to:
 * // 1. Create a migration to change the default
 * // 2. Optionally migrate existing IDs (complex, usually not necessary)
 * // 3. New records will automatically use CUID2
 */
