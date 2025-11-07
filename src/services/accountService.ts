import apiService from './api';
import type { TransactionRecord } from '../types/transaction';

export interface ApiResponse<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: { message?: string };
  meta?: unknown;
}

export type Usability = 'USABLE' | 'PROTECTED';

export interface ApiAccountResponse {
  id?: string;
  user_id?: string;
  personal_id?: number;
  name?: string;
  icon?: string | null;
  color?: string | null;
  active?: boolean;
  usability?: Usability | string | null;
  account_type?: string | null;
  initial_amount?: number | null;
  position?: number | null;
  group_id?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  // Allow extra fields without breaking
  [key: string]: unknown;
}

export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  account_type: string;
  initial_amount: number;
  usability: Usability;
  group_id: string | null;
}

export interface UpdateAccountRequest {
  name: string;
  icon: string;
  color: string;
  active: boolean;
  account_type: string;
  initial_amount: number;
  usability: Usability;
  group_id: string | null;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' && value !== null && ('data' in (value as Record<string, unknown>) || 'message' in (value as Record<string, unknown>) || 'error' in (value as Record<string, unknown>));

export interface OrderMapItem {
  id: string;
  personal_id: number;
}

export interface SwapOrderRequest {
  order_map: OrderMapItem[];
}

export interface AccountService {
  fetchAccounts(): Promise<ApiAccountResponse[]>;
  fetchAccountById(id: string): Promise<ApiAccountResponse>;
  createAccount(payload: CreateAccountRequest): Promise<ApiAccountResponse>;
  updateAccount(id: string, payload: UpdateAccountRequest): Promise<ApiAccountResponse>;
  deleteAccount(id: string): Promise<void>;
  swapAccountOrder(payload: SwapOrderRequest): Promise<void>;
  fetchAccountTransactions(accountId: string, currentBalance: number): Promise<TransactionRecord[]>;
  getNextPersonalId(): number;
}

// Store the next personal_id
let nextPersonalId = 1;

// Generate mock transaction records
const generateMockTransactions = (currentBalance: number): TransactionRecord[] => {
  const categories = [
    { name: 'Loans, interests', icon: 'FaHandshake', iconColor: '#F97316', payer: 'Ibuk Fatim' },
    { name: 'Missing', icon: 'FaQuestionCircle', iconColor: '#6B7280', payer: '' },
    { name: 'Life events', icon: 'FaLeaf', iconColor: '#10B981', payer: '' },
    { name: 'Charity, gifts', icon: 'FaGift', iconColor: '#EC4899', payer: '' },
    { name: 'Fuel', icon: 'FaGasPump', iconColor: '#8B5CF6', payer: '' },
    { name: 'Food & Dining', icon: 'FaUtensils', iconColor: '#EF4444', payer: '' },
    { name: 'Transport', icon: 'FaTaxi', iconColor: '#3B82F6', payer: '' },
  ];

  const descriptions = [
    'Payment to friend',
    'Monthly subscription',
    'Shopping',
    'Transfer to savings',
    'Salary deposit',
    'Refund',
    'Invoice payment',
  ];

  const accounts = ['Cash Eko', 'Cash Dewi', 'CIMB Syariah', 'BCA', 'Mandiri'];

  const transactions: TransactionRecord[] = [];
  const today = new Date();

  // Generate transactions for the last 30 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.floor(Math.random() * 500000) + 10000;
    const isExpense = Math.random() > 0.3; // 70% expenses, 30% income

    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const time = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    transactions.push({
      id: `trans-${i}`,
      date: dateString,
      time,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: accounts[Math.floor(Math.random() * accounts.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      payer: category.payer,
      amount: amount,
      type: isExpense ? 'EXPENSE' : 'INCOME',
    });
  }

  // Sort by date descending (most recent first)
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const accountService: AccountService = {
  async fetchAccounts() {
    // API service automatically unwraps the response
    // Returns the data directly: Array<ApiAccountResponse>
    const accounts = (await apiService.get('/accounts')) as ApiAccountResponse[];

    // The API also returns meta with max_personal_id, but since response is unwrapped,
    // we need to calculate it from the accounts or use localStorage cache
    if (typeof localStorage !== 'undefined') {
      const cachedMaxId = localStorage.getItem('max_account_personal_id');
      if (cachedMaxId) {
        nextPersonalId = parseInt(cachedMaxId) + 1;
      }
    }

    // Update cache based on current accounts
    if (accounts.length > 0) {
      const maxPersonalId = Math.max(...accounts.map(acc => acc.personal_id ?? 0));
      nextPersonalId = maxPersonalId + 1;
      
      // Cache for future use
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('max_account_personal_id', maxPersonalId.toString());
      }
    } else {
      nextPersonalId = 1;
    }

    return accounts;
  },

  async fetchAccountById(id: string) {
    // API service automatically unwraps the response
    // Returns the data directly: ApiAccountResponse
    const account = (await apiService.get(`/accounts/${id}`)) as ApiAccountResponse;
    return account;
  },

  async createAccount(payload: CreateAccountRequest) {
    // API service automatically unwraps the response
    // Returns the data directly: ApiAccountResponse
    const account = (await apiService.post('/accounts', payload)) as ApiAccountResponse;
    
    // Update cache after successful creation
    if (typeof localStorage !== 'undefined' && account.personal_id) {
      const currentMax = parseInt(localStorage.getItem('max_account_personal_id') || '0');
      if (account.personal_id > currentMax) {
        localStorage.setItem('max_account_personal_id', account.personal_id.toString());
        nextPersonalId = account.personal_id + 1;
      }
    }
    
    return account;
  },

  async updateAccount(id: string, payload: UpdateAccountRequest) {
    // API service automatically unwraps the response
    // Returns the data directly: ApiAccountResponse
    const account = (await apiService.put(`/accounts/${id}`, payload)) as ApiAccountResponse;
    return account;
  },

  async deleteAccount(id: string) {
    // API service automatically unwraps the response and throws on error
    // Returns null for successful deletion
    await apiService.delete(`/accounts/${id}`);
  },

  async swapAccountOrder(payload: SwapOrderRequest) {
    // API service automatically unwraps the response and throws on error
    await apiService.put('/accounts/swap-order', payload);
  },

  async fetchAccountTransactions(accountId: string, currentBalance: number) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get(`/accounts/${accountId}/transactions`)) as ApiResponse<TransactionRecord[]> | TransactionRecord[];

    // For now, return mock data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return generateMockTransactions(currentBalance);
  },

  getNextPersonalId() {
    return nextPersonalId;
  },
};

export default accountService;