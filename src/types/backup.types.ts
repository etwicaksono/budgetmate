/**
 * TypeScript types for Backup/Restore feature
 * 
 * These types define the structure of exported JSON backup files
 * and the API responses for import operations.
 */

// =============================================================================
// Backup Data Structure
// =============================================================================

export interface BackupData {
  exportVersion: string;
  exportDate: string;
  appVersion: string;
  user: {
    email: string;
    settings: {
      timezone: string;
      locale: string;
      date_format: string;
      number_format: string;
    };
  };
  data: {
    accounts: BackupAccount[];
    categories: BackupCategory[];
    categoryBudgets: BackupCategoryBudget[];
    debts: BackupDebt[];
    transactions: BackupTransaction[];
    transfers: BackupTransfer[];
    labels: BackupLabel[];
    transactionLabels: BackupTransactionLabel[];
    debtLabels?: BackupDebtLabel[];
  };
  metadata: {
    totalRecords: number;
    checksum: string;
    recordCounts: {
      accounts: number;
      categories: number;
      categoryBudgets: number;
      debts: number;
      transactions: number;
      transfers: number;
      labels: number;
      transactionLabels: number;
      debtLabels?: number;
    };
  };
}

// =============================================================================
// Individual Entity Types (JSON-safe, no BigInt)
// =============================================================================

export interface BackupAccount {
  id: string; // Original CUID
  name: string;
  account_type: string;
  initial_balance: number; // Converted from Decimal
  icon: string;
  color: string;
  is_active: boolean;
  is_included_in_total: boolean;
  order?: number; // Added in exportVersion 1.1.0
  created_at: string;
  updated_at: string;
}

export interface BackupCategory {
  id: string;
  parent_id?: string | null;
  name: string;
  type: string; // 'income' | 'expense' | 'both'
  nature: string; // 'WANT' | 'NEED' | 'MUST'
  icon: string;
  color?: string | null;
  is_active: boolean;
  analytic_flag?: string; // Added in exportVersion 1.1.0, used when type === 'both'
  created_at: string;
  updated_at: string;
}

export interface BackupCategoryBudget {
  id: string;
  category_id: string;
  basic_monthly_amount: number;
  extend_monthly_amount: number;
  basic_annual_amount: number;
  extend_annual_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BackupDebt {
  id: string;
  date: string;
  type: string; // 'lend' | 'borrow'
  account_id: string;
  counterparty: string;
  description?: string | null;
  status: string; // 'active' | 'settled' | 'cancelled'
  created_at: string;
  updated_at: string;
}

export interface BackupTransaction {
  id: string;
  account_id: string; // Reference to account
  category_id?: string | null; // Reference to category
  type: string; // 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'debt_in' | 'debt_out'
  amount: number;
  date: string; // ISO timestamp
  description?: string | null;
  payee?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  transfer_id?: string | null;
  debt_id?: string | null;
  is_draft?: boolean; // Added in exportVersion 1.1.0
  created_at: string;
  updated_at: string;
}

export interface BackupTransfer {
  id: string;
  date: string;
  from_account: string; // Reference to account
  to_account: string; // Reference to account
  amount: number;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BackupLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface BackupTransactionLabel {
  id: string;
  transaction_id: string;
  label_id: string;
}

export interface BackupDebtLabel {
  id: string;
  debt_id: string;
  label_id: string;
}

// =============================================================================
// API Response Types
// =============================================================================

// Note: ExportResponse is not defined here because the export route returns
// a raw backup JSON file download (Content-Disposition: attachment), not a
// typed JSON API response. The backupService.exportData() method uses
// responseType: 'blob' and does not rely on a typed response.

export interface BackupRecordCounts {
  accounts: number;
  categories: number;
  categoryBudgets: number;
  debts: number;
  transactions: number;
  transfers: number;
  labels: number;
  transactionLabels: number;
  debtLabels: number;
}

export interface ImportResponse {
  success: boolean;
  data?: {
    message: string;
    /** Records created plus records updated, per entity. */
    imported: BackupRecordCounts;
    /** Subset of `imported` that matched an existing record and was updated in place. */
    updated?: BackupRecordCounts;
    /** Records dropped because a referenced parent could not be resolved. */
    skipped?: BackupRecordCounts;
    warning?: string;
  };
  error?: string;
}

export interface ValidateResponse {
  valid: boolean;
  data?: BackupData;
  error?: string;
  details?: {
    fileName: string;
    fileSize: string;
    exportDate: string;
    totalRecords: number;
    user: {
      email: string;
    };
    version: string;
    compatible: boolean;
  };
}

// =============================================================================
// Import Options
// =============================================================================

export type ImportMode = 'replace' | 'merge';

export interface ImportOptions {
  mode: ImportMode;
  file: File;
}

// =============================================================================
// Progress/Status Types
// =============================================================================

export interface ImportProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  percentage: number;
  details?: {
    accounts?: number;
    categories?: number;
    transactions?: number;
    transfers?: number;
    labels?: number;
  };
}

export interface ExportProgress {
  step: number;
  totalSteps: number;
  currentStep: string;
  percentage: number;
}

// =============================================================================
// Error Types
// =============================================================================

export interface BackupError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type BackupErrorCode =
  | 'INVALID_FILE_FORMAT'
  | 'INCOMPATIBLE_VERSION'
  | 'CORRUPTED_FILE'
  | 'FILE_TOO_LARGE'
  | 'EXPORT_FAILED'
  | 'IMPORT_FAILED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED';
