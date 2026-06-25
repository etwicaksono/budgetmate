/**
 * Zod validation schemas for backup/restore feature
 * 
 * These schemas validate imported backup files to ensure
 * data integrity and compatibility before restoring to database.
 */

import { z } from 'zod';
import { AccountType, CategoryNature, CategoryType, TransactionType } from '@prisma/client';

// =============================================================================
// Entity Schemas
// =============================================================================

const BackupAccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  account_type: z.nativeEnum(AccountType),
  initial_balance: z.number(),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  is_active: z.boolean(),
  is_included_in_total: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const BackupCategorySchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable().optional(),
  name: z.string().min(1).max(100),
  type: z.nativeEnum(CategoryType),
  nature: z.nativeEnum(CategoryNature),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  is_system: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const BackupTransactionSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  category_id: z.string().nullable().optional(),
  type: z.nativeEnum(TransactionType),
  amount: z.number(),
  date: z.string().datetime(),
  description: z.string().nullable().optional(),
  payee: z.string().max(255).nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  payment_status: z.string().max(32).nullable().optional(),
  transfer_id: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const BackupTransferSchema = z.object({
  id: z.string(),
  date: z.string().datetime(),
  from_account: z.string(),
  to_account: z.string(),
  amount: z.number().positive(),
  description: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const BackupLabelSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const BackupTransactionLabelSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  label_id: z.string(),
});

// =============================================================================
// Main Backup Data Schema
// =============================================================================

export const BackupDataSchema = z.object({
  exportVersion: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver format
  exportDate: z.string().datetime(),
  appVersion: z.string(),
  user: z.object({
    email: z.string().email(),
    settings: z.object({
      timezone: z.string(),
      locale: z.string(),
      date_format: z.string(),
      number_format: z.string(),
    }),
  }),
  data: z.object({
    accounts: z.array(BackupAccountSchema),
    categories: z.array(BackupCategorySchema),
    transactions: z.array(BackupTransactionSchema),
    transfers: z.array(BackupTransferSchema),
    labels: z.array(BackupLabelSchema),
    transactionLabels: z.array(BackupTransactionLabelSchema),
  }),
  metadata: z.object({
    totalRecords: z.number().int().nonnegative(),
    checksum: z.string(),
    recordCounts: z.object({
      accounts: z.number().int().nonnegative(),
      categories: z.number().int().nonnegative(),
      transactions: z.number().int().nonnegative(),
      transfers: z.number().int().nonnegative(),
      labels: z.number().int().nonnegative(),
      transactionLabels: z.number().int().nonnegative(),
    }),
  }),
});

// =============================================================================
// Import Request Schema
// =============================================================================

export const ImportRequestSchema = z.object({
  mode: z.enum(['replace', 'merge']).default('replace'),
  data: BackupDataSchema,
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validate backup file data
 */
export function validateBackupData(data: unknown): {
  success: boolean;
  data?: z.infer<typeof BackupDataSchema>;
  error?: z.ZodError;
} {
  const result = BackupDataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Check if backup version is compatible with current app version
 */
export function isVersionCompatible(backupVersion: string, currentVersion: string = '1.0.0'): boolean {
  const [backupMajor] = backupVersion.split('.');
  const [currentMajor] = currentVersion.split('.');

  // Major version must match for compatibility
  return backupMajor === currentMajor;
}

/**
 * Validate file size (max 10MB by default)
 */
export function validateFileSize(fileSize: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return fileSize <= maxSize;
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// =============================================================================
// Type Exports
// =============================================================================

export type BackupData = z.infer<typeof BackupDataSchema>;
export type BackupAccount = z.infer<typeof BackupAccountSchema>;
export type BackupCategory = z.infer<typeof BackupCategorySchema>;
export type BackupTransaction = z.infer<typeof BackupTransactionSchema>;
export type BackupTransfer = z.infer<typeof BackupTransferSchema>;
export type BackupLabel = z.infer<typeof BackupLabelSchema>;
export type BackupTransactionLabel = z.infer<typeof BackupTransactionLabelSchema>;
