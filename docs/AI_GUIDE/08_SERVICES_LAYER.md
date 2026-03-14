# 08. Services Layer Implementation

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check service layer checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#service-layer)
4. 🧪 Write service tests as per [Document 14](./14_TESTING_REQUIREMENTS.md#frontend-component-tests)

## 🌐 API Service Layer Architecture

The service layer abstracts all API calls, handles token injection, and provides type-safe interfaces for the frontend.

## 📡 Base API Service

Create `src/services/api.ts`:

```typescript
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';

// Create axios instance
const apiClient = axios.create({
  baseURL: APP_CONFIG.api.baseUrl,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get encrypted token from localStorage
    const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
    
    if (encryptedToken) {
      // Decrypt token
      const token = await tokenCrypto.decryptToken(encryptedToken);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token
        const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
        
        if (encryptedRefreshToken) {
          const refreshToken = await tokenCrypto.decryptToken(encryptedRefreshToken);
          
          if (refreshToken) {
            // Call refresh endpoint
            const response = await axios.post(
              `${APP_CONFIG.api.baseUrl}/auth/refresh`,
              { refresh_token: refreshToken }
            );
            
            const { access_token, refresh_token: newRefreshToken } = response.data.data;
            
            // Encrypt and store new tokens
            const encryptedAccessToken = await tokenCrypto.encryptToken(access_token);
            const encryptedNewRefreshToken = await tokenCrypto.encryptToken(newRefreshToken);
            
            localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);
            localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, encryptedNewRefreshToken);
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Base API methods
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.get(url, config).then(response => response.data);
  },
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.post(url, data, config).then(response => response.data);
  },
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.put(url, data, config).then(response => response.data);
  },
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.delete(url, config).then(response => response.data);
  },
  
  // Special method for getting max personal IDs
  getMaxPersonalIds: async (): Promise<Record<string, number>> => {
    const response = await api.get<any>('/personal-ids/max');
    return response.data;
  }
};

// Export axios instance for special cases
export { apiClient };
```

## 🔐 Authentication Service

Create `src/services/authService.ts`:

```typescript
import { api } from './api';
import axios from 'axios';
import { APP_CONFIG } from '@/utils/constants';

export interface LoginRequest {
  email_or_username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      full_name?: string;
      timezone: string;
      currency: string;
    };
    access_token: string;
    refresh_token: string;
  };
  message?: string;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Don't use interceptor for login
    const response = await axios.post<AuthResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/login`,
      credentials
    );
    return response.data;
  }
  
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Don't use interceptor for register
    const response = await axios.post<AuthResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/register`,
      data
    );
    return response.data;
  }
  
  async logout(token?: string): Promise<void> {
    try {
      if (token) {
        await axios.post(
          `${APP_CONFIG.api.baseUrl}/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
    } catch (error) {
      // Logout anyway even if API call fails
      console.error('Logout API error:', error);
    }
  }
  
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await axios.post<RefreshResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/refresh`,
      { refresh_token: refreshToken }
    );
    return response.data;
  }
  
  async forgotPassword(email: string): Promise<any> {
    return api.post('/auth/forgot-password', { email });
  }
  
  async resetPassword(token: string, password: string): Promise<any> {
    return api.post('/auth/reset-password', { token, password });
  }
  
  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return api.post('/auth/change-password', { 
      current_password: currentPassword,
      new_password: newPassword 
    });
  }
}

export const authService = new AuthService();
```

## 💰 Account Service

Create `src/services/accountService.ts`:

```typescript
import { api } from './api';

export interface Account {
  id: string;
  personal_id: number;
  name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan';
  icon: string;
  color: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  interest_rate?: number;
  is_active: boolean;
  is_included_in_total: boolean;
  group_id?: string;
  group?: {
    name: string;
    icon: string;
    color: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  account_type: string;
  icon: string;
  color: string;
  currency?: string;
  initial_balance?: number;
  group_id?: string;
  is_active?: boolean;
  is_included_in_total?: boolean;
}

export interface AccountsResponse {
  success: boolean;
  data: Account[];
  meta?: {
    total: number;
    total_balance?: number;
  };
}

class AccountService {
  async fetchAccounts(params?: {
    is_active?: boolean;
    group_id?: string;
    include_balance?: boolean;
  }): Promise<Account[]> {
    const response = await api.get<AccountsResponse>('/accounts', { params });
    return response.data;
  }
  
  async fetchAccountById(id: string): Promise<Account> {
    const response = await api.get<{ success: boolean; data: Account }>(`/accounts/${id}`);
    return response.data;
  }
  
  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const response = await api.post<{ success: boolean; data: Account }>('/accounts', data);
    return response.data;
  }
  
  async updateAccount(id: string, data: Partial<CreateAccountRequest>): Promise<Account> {
    const response = await api.put<{ success: boolean; data: Account }>(`/accounts/${id}`, data);
    return response.data;
  }
  
  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`);
  }
  
  async swapAccountOrder(orderMap: Array<{ id: string; personal_id: number }>): Promise<void> {
    await api.put('/accounts/swap-order', { order_map: orderMap });
  }
  
  async getAccountBalance(id: string): Promise<number> {
    const account = await this.fetchAccountById(id);
    return account.current_balance;
  }
  
  async getNetWorth(): Promise<number> {
    const accounts = await this.fetchAccounts({ is_active: true, include_balance: true });
    return accounts
      .filter(a => a.is_included_in_total)
      .reduce((sum, a) => sum + a.current_balance, 0);
  }
}

export const accountService = new AccountService();
```

## 📝 Transaction Service

Create `src/services/transactionService.ts`:

```typescript
import { api } from './api';

export interface Transaction {
  id: string;
  personal_id: number;
  date: string;
  account_id: string;
  account?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  category_id: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  };
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  currency: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  personal_id: number;
  date: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  currency?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  label_ids?: string[];
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense';
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  label_ids?: string[];
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net_amount: number;
  transaction_count: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    total: number;
    count: number;
  }>;
}

class TransactionService {
  async fetchTransactions(filters?: TransactionFilters): Promise<{
    transactions: Transaction[];
    meta: TransactionsResponse['meta'];
  }> {
    const params = filters ? {
      ...filters,
      label_ids: filters.label_ids?.join(',')
    } : undefined;
    
    const response = await api.get<TransactionsResponse>('/transactions', { params });
    return {
      transactions: response.data,
      meta: response.meta
    };
  }
  
  async fetchTransactionById(id: string): Promise<Transaction> {
    const response = await api.get<{ success: boolean; data: Transaction }>(
      `/transactions/${id}`
    );
    return response.data;
  }
  
  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await api.post<{ success: boolean; data: Transaction }>(
      '/transactions',
      data
    );
    return response.data;
  }
  
  async updateTransaction(id: string, data: Partial<CreateTransactionRequest>): Promise<Transaction> {
    const response = await api.put<{ success: boolean; data: Transaction }>(
      `/transactions/${id}`,
      data
    );
    return response.data;
  }
  
  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  }
  
  async fetchTransactionSummary(filters?: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
  }): Promise<TransactionSummary> {
    const response = await api.get<{ success: boolean; data: TransactionSummary }>(
      '/transactions/summary',
      { params: filters }
    );
    return response.data;
  }
  
  async bulkCreateTransactions(transactions: CreateTransactionRequest[]): Promise<Transaction[]> {
    const response = await api.post<{ success: boolean; data: Transaction[] }>(
      '/transactions/bulk',
      { transactions }
    );
    return response.data;
  }
  
  async importTransactions(file: File, accountId: string, format: 'csv' | 'ofx' | 'qif'): Promise<{
    imported: number;
    failed: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);
    formData.append('format', format);
    
    const response = await api.post('/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
  }
}

export const transactionService = new TransactionService();
```

## 🏷️ Category Service

Create `src/services/categoryService.ts`:

```typescript
import { api } from './api';

export interface Category {
  id: string;
  personal_id: number;
  user_id: string;
  parent_id?: string;
  name: string;
  type: 'income' | 'expense';
  nature: 'WANT' | 'NEED' | 'MUST';
  icon: string;
  color?: string;
  is_system: boolean;
  is_active: boolean;
  children?: Category[];
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  personal_id: number;
  name: string;
  type: 'income' | 'expense';
  nature?: 'WANT' | 'NEED' | 'MUST';
  icon: string;
  color?: string;
  parent_id?: string;
  is_active?: boolean;
}

export interface CategoryTree {
  income: Category[];
  expense: Category[];
}

class CategoryService {
  async fetchCategories(filters?: {
    type?: 'income' | 'expense';
    is_active?: boolean;
    parent_id?: string;
    keyword?: string;
  }): Promise<Category[]> {
    const response = await api.get<{ success: boolean; data: Category[] }>(
      '/categories',
      { params: filters }
    );
    return response.data;
  }
  
  async fetchCategoryTree(): Promise<CategoryTree> {
    const response = await api.get<{ success: boolean; data: CategoryTree }>(
      '/categories/tree'
    );
    return response.data;
  }
  
  async fetchCategoryById(id: string): Promise<Category> {
    const response = await api.get<{ success: boolean; data: Category }>(
      `/categories/${id}`
    );
    return response.data;
  }
  
  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await api.post<{ success: boolean; data: Category }>(
      '/categories',
      data
    );
    return response.data;
  }
  
  async updateCategory(id: string, data: Partial<CreateCategoryRequest>): Promise<Category> {
    const response = await api.put<{ success: boolean; data: Category }>(
      `/categories/${id}`,
      data
    );
    return response.data;
  }
  
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  }
  
  async swapCategoryOrder(categoryIds: string[]): Promise<void> {
    await api.post('/categories/swap-order', { category_ids: categoryIds });
  }
  
  async ensureCategoryExists(name: string, type: 'income' | 'expense'): Promise<Category | null> {
    try {
      // Search for existing category
      const categories = await this.fetchCategories({
        keyword: name,
        type: type
      });
      
      const exact = categories.find(c => 
        c.name.toLowerCase() === name.toLowerCase()
      );
      
      if (exact) return exact;
      
      // Create new category if not found
      const maxIds = await api.getMaxPersonalIds();
      const newCategory = await this.createCategory({
        personal_id: (maxIds.categories || 0) + 1,
        name: name,
        type: type,
        icon: 'FaTag',
        color: '#6b7280',
        is_active: true
      });
      
      return newCategory;
    } catch (error) {
      console.error('Failed to ensure category exists:', error);
      return null;
    }
  }
}

export const categoryService = new CategoryService();
```

## 💸 Transfer Service

Create `src/services/transferService.ts`:

```typescript
import { api } from './api';

export interface Transfer {
  id: string;
  personal_id: number;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  to_amount?: number;
  description?: string;
  currency: string;
  to_currency?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransferRequest {
  personal_id: number;
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  to_amount?: number;
  description?: string;
  currency?: string;
  to_currency?: string;
}

class TransferService {
  async fetchTransfers(filters?: {
    start_date?: string;
    end_date?: string;
    from_account?: string;
    to_account?: string;
  }): Promise<Transfer[]> {
    const response = await api.get<{ success: boolean; data: Transfer[] }>(
      '/transfers',
      { params: filters }
    );
    return response.data;
  }
  
  async createTransfer(data: CreateTransferRequest): Promise<Transfer> {
    const response = await api.post<{ success: boolean; data: Transfer }>(
      '/transfers',
      data
    );
    return response.data;
  }
  
  async updateTransfer(id: string, data: Partial<CreateTransferRequest>): Promise<Transfer> {
    const response = await api.put<{ success: boolean; data: Transfer }>(
      `/transfers/${id}`,
      data
    );
    return response.data;
  }
  
  async deleteTransfer(id: string): Promise<void> {
    await api.delete(`/transfers/${id}`);
  }
}

export const transferService = new TransferService();
```

## 📊 Analytics Service

Create `src/services/analyticsService.ts`:

```typescript
import { api } from './api';

export interface AnalyticsSummary {
  total_income: number;
  total_expenses: number;
  net_income: number;
  savings_rate: number;
  top_categories: Array<{
    category_id: string;
    category_name: string;
    total: number;
    percentage: number;
  }>;
  account_balances: Array<{
    account_id: string;
    account_name: string;
    balance: number;
  }>;
}

export interface TrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface CashFlow {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

export interface ExpenseByCategory {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  color: string;
}

class AnalyticsService {
  async fetchSummary(params?: {
    period?: 'month' | 'quarter' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<AnalyticsSummary> {
    const response = await api.get<{ success: boolean; data: AnalyticsSummary }>(
      '/analytics/summary',
      { params }
    );
    return response.data;
  }
  
  async fetchTrends(params: {
    metric: 'income' | 'expense' | 'net' | 'balance';
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    group_by?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TrendData> {
    const response = await api.get<{ success: boolean; data: TrendData }>(
      '/analytics/trends',
      { params }
    );
    return response.data;
  }
  
  async fetchCashFlow(params?: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
  }): Promise<CashFlow[]> {
    const response = await api.get<{ success: boolean; data: CashFlow[] }>(
      '/analytics/cashflow',
      { params }
    );
    return response.data;
  }
  
  async fetchExpensesByCategory(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<ExpenseByCategory[]> {
    const response = await api.get<{ success: boolean; data: ExpenseByCategory[] }>(
      '/analytics/expenses-by-category',
      { params }
    );
    return response.data;
  }
  
  async fetchNetWorthHistory(): Promise<TrendData> {
    const response = await api.get<{ success: boolean; data: TrendData }>(
      '/analytics/net-worth'
    );
    return response.data;
  }
  
  async fetchCategoryBreakdown(categoryId: string, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total: number;
    transactions: number;
    average: number;
    trend: TrendData;
  }> {
    const response = await api.get(
      `/analytics/category-breakdown/${categoryId}`,
      { params }
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
```

## ⚠️ Service Layer Best Practices

### 1. Always Handle Errors
```typescript
try {
  const data = await service.fetchData();
} catch (error) {
  console.error('Service error:', error);
  // Show user-friendly error
  showToast('Failed to load data', 'error');
}
```

### 2. Transform Response Data
```typescript
// Transform backend response to frontend format
const transformedData = response.data.map(item => ({
  ...item,
  displayName: item.name.toUpperCase(),
  formattedAmount: formatCurrency(item.amount)
}));
```

### 3. Use Type Guards
```typescript
function isValidTransaction(data: any): data is Transaction {
  return data && 
    typeof data.id === 'string' &&
    typeof data.amount === 'number';
}
```

### 4. Cache Frequently Used Data
```typescript
// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

## ✅ Services Layer Checklist

- [ ] Base API client with interceptors
- [ ] Token injection in requests
- [ ] Token refresh on 401
- [ ] Auth service without interceptors
- [ ] Account service with all CRUD
- [ ] Transaction service with filters
- [ ] Category service with tree
- [ ] Transfer service
- [ ] Analytics service
- [ ] Error handling in all services
- [ ] Type definitions for all responses
- [ ] Response data transformation

## 🎯 Next Steps

1. Test API interceptors with expired tokens
2. Implement caching for frequently accessed data
3. Add request retry logic for network failures
4. Create service hooks for React Query
5. Add request/response logging in development
