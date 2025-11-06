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
    const response = (await apiService.get('/accounts')) as ApiResponse<ApiAccountResponse[]> | ApiAccountResponse[];

    let accounts: ApiAccountResponse[] = [];

    if (isApiResponse<ApiAccountResponse[]>(response) && Array.isArray(response.data)) {
      accounts = response.data ?? [];
    } else if (Array.isArray(response)) {
      accounts = response;
    }

    // Calculate the next personal_id based on the accounts retrieved
    if (accounts.length > 0) {
      const maxPersonalId = Math.max(...accounts.map(acc => acc.personal_id ?? 0));
      nextPersonalId = maxPersonalId + 1;
    } else {
      nextPersonalId = 1;
    }

    return accounts;
  },

  async fetchAccountById(id: string) {
    const response = (await apiService.get(`/accounts/${id}`)) as ApiResponse<ApiAccountResponse> | ApiAccountResponse;

    if (isApiResponse<ApiAccountResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiAccountResponse;
    }

    throw new Error('Failed to fetch account');
  },

  async createAccount(payload: CreateAccountRequest) {
    const response = (await apiService.post('/accounts', payload)) as ApiResponse<ApiAccountResponse> | ApiAccountResponse;

    if (isApiResponse<ApiAccountResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiAccountResponse;
    }

    throw new Error('Failed to create account');
  },

  async updateAccount(id: string, payload: UpdateAccountRequest) {
    const response = (await apiService.put(`/accounts/${id}`, payload)) as ApiResponse<ApiAccountResponse> | ApiAccountResponse;

    if (isApiResponse<ApiAccountResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiAccountResponse;
    }

    throw new Error('Failed to update account');
  },

  async deleteAccount(id: string) {
    try {
      const response = (await apiService.delete(`/accounts/${id}`)) as ApiResponse<unknown>;

      // Check if the response indicates an error
      if (response.error || (response.success === false)) {
        const errorMessage = response.error?.message || response.message || 'Failed to delete account';
        throw new Error(errorMessage);
      }

      // If response has success field and it's true, or no error field, consider it successful
      return;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  async swapAccountOrder(payload: SwapOrderRequest) {
    const response = (await apiService.put('/accounts/swap-order', payload)) as ApiResponse<unknown>;

    if (!response.success && response.error) {
      throw new Error(response.error.message || 'Failed to swap account order');
    }
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