/**
 * Database Types
 * 
 * TypeScript types that match your PostgreSQL schema exactly.
 * Generated from finance-api.sql
 */

// ==================== GOOGLE SHEETS INTEGRATION ====================

/**
 * Google Sheets cell position for bidirectional sync
 */
export interface GoogleSheetsCellPosition {
  a1: string;   // A1 notation with sheet name: "'SheetName'!A1"
  col: number;  // Column number (1-based: A=1, B=2, etc.)
  row: number;  // Row number (1-based)
}

/**
 * Google Sheets position mapping for database record
 * Maps each database field to its Google Sheets cell location
 * 
 * @example
 * {
 *   "id": { "a1": "'Liquid Assets'!B8", "col": 2, "row": 8 },
 *   "name": { "a1": "'Liquid Assets'!E8", "col": 5, "row": 8 }
 * }
 */
export interface GoogleSheetsPosition {
  [fieldName: string]: GoogleSheetsCellPosition;
}

// ==================== USER TYPES ====================

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password: string; // Don't return this in API responses!
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string | null;
}

// ==================== ACCOUNT TYPES ====================

export interface Account {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  active: boolean;
  usability: string; // "USABLE" etc.
  account_type: string; // "Cash", "Checking account", "General", etc.
  color: string;
  initial_amount: number | null;
  group_id: string | null;
  position: GoogleSheetsPosition | null; // Google Sheets sync mapping
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateAccountRequest {
  name: string;
  icon: string;
  account_type: string;
  color: string;
  initial_amount?: number | null;
  group_id?: string | null;
  usability?: string;
  active?: boolean;
  position?: GoogleSheetsPosition | null;
}

export interface UpdateAccountRequest {
  name?: string;
  icon?: string;
  account_type?: string;
  color?: string;
  initial_amount?: number | null;
  group_id?: string | null;
  usability?: string;
  active?: boolean;
  position?: GoogleSheetsPosition | null;
}

// ==================== CATEGORY TYPES ====================

export interface Category {
  id: string;
  personal_id: number;
  user_id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  nature: 'NEED' | 'WANT' | 'MUST';
  is_active: boolean;
  position: GoogleSheetsPosition | null; // Google Sheets sync mapping
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  color: string | null;
}

export interface CreateCategoryRequest {
  name: string;
  icon: string;
  nature: 'NEED' | 'WANT' | 'MUST';
  parent_id?: string | null;
  color?: string | null;
  is_active?: boolean;
  position?: GoogleSheetsPosition | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  nature?: 'NEED' | 'WANT' | 'MUST';
  parent_id?: string | null;
  color?: string | null;
  is_active?: boolean;
  position?: GoogleSheetsPosition | null;
}

// ==================== TRANSACTION TYPES ====================

export interface Transaction {
  id: string;
  user_id: string;
  personal_id: number;
  date: string; // Date as ISO string
  account_id: string;
  category_id: string;
  amount: number;
  type: string; // "INCOME" or "EXPENSE" based on your data
  note: string | null;
  position: GoogleSheetsPosition | null; // Google Sheets sync mapping (nullable)
  transfer_id: string | null;
  debt_id: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateTransactionRequest {
  date: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: string;
  note?: string | null;
  position?: GoogleSheetsPosition | null; // Optional
  transfer_id?: string | null;
  debt_id?: string | null;
}

export interface UpdateTransactionRequest {
  date?: string;
  account_id?: string;
  category_id?: string;
  amount?: number;
  type?: string;
  note?: string | null;
  position?: GoogleSheetsPosition | null;
  transfer_id?: string | null;
  debt_id?: string | null;
}

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== TRANSFER TYPES ====================

export interface Transfer {
  id: string;
  user_id: string;
  personal_id: number;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  note: string;
  position: GoogleSheetsPosition | null; // Google Sheets sync mapping
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateTransferRequest {
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  note: string;
  position?: GoogleSheetsPosition | null;
}

export interface UpdateTransferRequest {
  date?: string;
  from_account?: string;
  to_account?: string;
  amount?: number;
  note?: string;
  position?: GoogleSheetsPosition | null;
}

// ==================== DEBT TYPES ====================

export interface Debt {
  id: string;
  user_id: string;
  personal_id: number;
  account_id: string;
  name: string;
  type: string;
  position: GoogleSheetsPosition | null; // Google Sheets sync mapping
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateDebtRequest {
  account_id: string;
  name: string;
  type: string;
  position?: GoogleSheetsPosition | null;
}

export interface UpdateDebtRequest {
  account_id?: string;
  name?: string;
  type?: string;
  position?: GoogleSheetsPosition | null;
}

// ==================== GROUP TYPES ====================

export interface Group {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CreateGroupRequest {
  name: string;
}

export interface UpdateGroupRequest {
  name?: string;
}

// ==================== AUTH TYPES ====================

export interface LoginRequest {
  username: string; // Your schema uses username for login
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface RegisterRequest {
  name: string;
  email: string;
  username: string;
  password: string;
}
