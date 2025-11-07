/**
 * Core API Types - Full-Stack Refactor
 * These types define the structure for all API requests and responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
    [key: string]: any;
  } | null;
  errors?: any;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email_or_username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expired_at: string;
  refreshable_until: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Account Types
// ============================================================================

export interface Account {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  type: string;
  icon: string;
  color: string;
  balance: number;
  note: string | null;
  group_id: string | null;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  balance?: number;
  note?: string | null;
  group_id?: string | null;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: string;
  icon?: string;
  color?: string;
  balance?: number;
  note?: string | null;
  group_id?: string | null;
}

export interface SwapOrderRequest {
  order_map: Array<{
    id: string;
    personal_id: number;
  }>;
}

// ============================================================================
// Category Types
// ============================================================================

export interface Category {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  nature: 'NEED' | 'WANT' | 'MUST';
  parent_id: string | null;
  note: string | null;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
}

export interface CreateCategoryRequest {
  personal_id: number;
  name: string;
  icon?: string;
  color?: string;
  nature?: 'NEED' | 'WANT' | 'MUST';
  parent_id?: string | null;
  note?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
  nature?: 'NEED' | 'WANT' | 'MUST';
  parent_id?: string | null;
  note?: string | null;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  id: string;
  user_id: string;
  personal_id: number;
  account_id: string;
  category_id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  note: string | null;
  transfer_id: string | null;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  personal_id: number;
  account_id: string;
  category_id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
  note?: string | null;
}

export interface UpdateTransactionRequest {
  account_id?: string;
  category_id?: string;
  type?: 'INCOME' | 'EXPENSE';
  amount?: number;
  date?: string;
  note?: string | null;
}

export interface TransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: 'INCOME' | 'EXPENSE';
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    total: number;
  }>;
  by_account: Array<{
    account_id: string;
    account_name: string;
    total: number;
  }>;
}

// ============================================================================
// Transfer Types
// ============================================================================

export interface Transfer {
  id: string;
  user_id: string;
  personal_id: number;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  note: string | null;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequest {
  personal_id: number;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  note?: string | null;
}

export interface UpdateTransferRequest {
  from_account_id?: string;
  to_account_id?: string;
  amount?: number;
  date?: string;
  note?: string | null;
}

// ============================================================================
// Group Types
// ============================================================================

export interface Group {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGroupRequest {
  personal_id: number;
  name: string;
  icon?: string;
  color?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  icon?: string;
  color?: string;
}

// ============================================================================
// Debt Types
// ============================================================================

export interface Debt {
  id: string;
  user_id: string;
  personal_id: number;
  type: 'LENT' | 'BORROWED';
  counterparty: string;
  amount: number;
  date: string;
  due_date: string | null;
  status: 'PENDING' | 'PAID';
  note: string | null;
  transaction_id: string | null;
  position: any | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDebtRequest {
  personal_id: number;
  type: 'LENT' | 'BORROWED';
  counterparty: string;
  amount: number;
  date: string;
  due_date?: string | null;
  note?: string | null;
  transaction_id?: string | null;
}

export interface UpdateDebtRequest {
  type?: 'LENT' | 'BORROWED';
  counterparty?: string;
  amount?: number;
  date?: string;
  due_date?: string | null;
  status?: 'PENDING' | 'PAID';
  note?: string | null;
  transaction_id?: string | null;
}
