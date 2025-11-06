import apiService from './api';

export interface ApiResponse<T> {
  success?: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: { message?: string };
  meta?: unknown;
}

export interface ApiTransactionResponse {
  id?: string;
  user_id?: string;
  date?: string;
  account_id?: string;
  category_id?: string;
  amount?: number;
  type?: string;
  note?: string | null;
  position?: Record<string, unknown> | null;
  transfer_id?: string | null;
  debt_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface CreateTransactionRequest {
  personal_id?: number;
  date: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: string;
  note?: string | null;
  position?: Record<string, unknown> | null;
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
  position?: Record<string, unknown> | null;
  transfer_id?: string | null;
  debt_id?: string | null;
}

export interface TransactionQueryParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  limit?: number;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' &&
  value !== null &&
  ('data' in (value as Record<string, unknown>) ||
   'message' in (value as Record<string, unknown>) ||
   'error' in (value as Record<string, unknown>));

export interface TransactionService {
  fetchTransactions(params?: TransactionQueryParams): Promise<ApiTransactionResponse[]>;
  fetchTransactionById(id: string): Promise<ApiTransactionResponse>;
  createTransaction(payload: CreateTransactionRequest): Promise<ApiTransactionResponse>;
  updateTransaction(id: string, payload: UpdateTransactionRequest): Promise<ApiTransactionResponse>;
  deleteTransaction(id: string): Promise<void>;
}

// Dummy transaction data generator
const generateDummyTransactions = (): ApiTransactionResponse[] => {
  const today = new Date();
  const transactions: ApiTransactionResponse[] = [];

  // Sample account IDs (should match your actual accounts)
  const accountIds = ['acc-1', 'acc-2', 'acc-3', 'acc-4'];

  // Sample category IDs with types
  const expenseCategories = [
    { id: 'cat-10', name: 'Food & Drinks' },
    { id: 'cat-11', name: 'Shopping' },
    { id: 'cat-12', name: 'Housing' },
    { id: 'cat-13', name: 'Transportation' },
    { id: 'cat-14', name: 'Vehicle' },
    { id: 'cat-15', name: 'Life & Entertainment' },
    { id: 'cat-16', name: 'Communication' },
    { id: 'cat-17', name: 'Financial' },
  ];

  const incomeCategories = [
    { id: 'cat-1-1', name: 'Income' },
    { id: 'cat-1-2', name: 'Gifts' },
    { id: 'cat-1-4', name: 'Dividends' },
    { id: 'cat-1-9', name: 'Wage, invoices' },
  ];

  const expenseDescriptions = [
    'Indomaret - Belanja bulanan',
    'Alfamart - Snacks',
    'Restoran Padang - Makan siang',
    'Bensin Pertamax',
    'Tokopedia - Elektronik',
    'Shopee - Fashion',
    'Listrik PLN',
    'Air PDAM',
    'Internet Indihome',
    'Grab - Transportasi',
    'GoJek - Ojek online',
    'Parkir mall',
    'Netflix subscription',
    'Spotify premium',
    'Kopi kenangan',
    'Bakso beranak',
    'Ayam geprek',
    'Service motor',
    'Cucian mobil',
    'Pulsa Telkomsel',
  ];

  const incomeDescriptions = [
    'Gaji bulan November',
    'Bonus kinerja',
    'Freelance project payment',
    'Dividend payment',
    'Transfer dari orang tua',
    'Hadiah ulang tahun',
    'Komisi penjualan',
    'THR',
  ];

  // Generate 50 transactions over the last 60 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    // Random hours and minutes
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(0);

    const isExpense = Math.random() > 0.3; // 70% expenses, 30% income
    const type = isExpense ? 'Expense' : 'Income';

    const category = isExpense
      ? expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      : incomeCategories[Math.floor(Math.random() * incomeCategories.length)];

    const description = isExpense
      ? expenseDescriptions[Math.floor(Math.random() * expenseDescriptions.length)]
      : incomeDescriptions[Math.floor(Math.random() * incomeDescriptions.length)];

    const amount = isExpense
      ? Math.floor(Math.random() * 500000) + 10000 // 10k - 510k for expenses
      : Math.floor(Math.random() * 10000000) + 1000000; // 1M - 11M for income

    transactions.push({
      id: `txn-${i + 1}`,
      user_id: 'user-1',
      date: date.toISOString(),
      account_id: accountIds[Math.floor(Math.random() * accountIds.length)],
      category_id: category.id,
      amount: amount,
      type: type,
      note: Math.random() > 0.7 ? `Note for ${description}` : null,
      position: null,
      transfer_id: null,
      debt_id: null,
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
    });
  }

  // Sort by date descending (most recent first)
  return transactions.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return dateB - dateA;
  });
};

export const transactionService: TransactionService = {
  async fetchTransactions(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/transactions', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   account_id: params.accountId ?? undefined,
    //   category_id: params.categoryId ?? undefined,
    //   type: params.type ?? undefined,
    //   limit: params.limit ?? undefined,
    // })) as ApiResponse<ApiTransactionResponse[]> | ApiTransactionResponse[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    let transactions = generateDummyTransactions();

    // Apply filters to dummy data (client-side filtering for now)
    if (params.startDate) {
      const startTime = new Date(params.startDate).getTime();
      transactions = transactions.filter(t => new Date(t.date || 0).getTime() >= startTime);
    }

    if (params.endDate) {
      const endTime = new Date(params.endDate).getTime();
      transactions = transactions.filter(t => new Date(t.date || 0).getTime() <= endTime);
    }

    if (params.accountId) {
      transactions = transactions.filter(t => t.account_id === params.accountId);
    }

    if (params.categoryId) {
      transactions = transactions.filter(t => t.category_id === params.categoryId);
    }

    if (params.type) {
      transactions = transactions.filter(t => t.type === params.type);
    }

    if (params.limit) {
      transactions = transactions.slice(0, params.limit);
    }

    // Simulate API response structure
    // if (isApiResponse<ApiTransactionResponse[]>(response)) {
    //   return response.data ?? transactions;
    // }

    return transactions;
  },

  async fetchTransactionById(id: string) {
    const response = (await apiService.get(`/transactions/${id}`)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to fetch transaction');
  },

  async createTransaction(payload: CreateTransactionRequest) {
    // Log the payload to check date format
    console.log('transactionService.createTransaction payload:', payload);
    console.log('Date being sent:', payload.date);
    
    const response = (await apiService.post('/transactions', payload)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to create transaction');
  },

  async updateTransaction(id: string, payload: UpdateTransactionRequest) {
    const response = (await apiService.put(`/transactions/${id}`, payload)) as
      ApiResponse<ApiTransactionResponse> | ApiTransactionResponse;

    if (isApiResponse<ApiTransactionResponse>(response) && response.data) {
      return response.data;
    }

    if ('id' in response && response.id) {
      return response as ApiTransactionResponse;
    }

    throw new Error('Failed to update transaction');
  },

  async deleteTransaction(id: string) {
    try {
      const response = (await apiService.delete(`/transactions/${id}`)) as ApiResponse<unknown>;

      if (response.error || (response.success === false)) {
        const errorMessage = response.error?.message || response.message || 'Failed to delete transaction';
        throw new Error(errorMessage);
      }

      return;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  },
};

export default transactionService;
