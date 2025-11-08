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
  date_time?: string | null;
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
  accountIds?: string[];
  accountNames?: string[];
  categoryId?: string;
  categoryIds?: string[];
  categoryNames?: string[];
  type?: string;
  limit?: number;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
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
  getNextPersonalId(): number;
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

// Store the next personal_id
let nextPersonalId = 1;

export const transactionService: TransactionService = {
  async fetchTransactions(params = {}) {
    // API service automatically unwraps the response
    // Returns the data directly: Array<ApiTransactionResponse>
    const transactions = (await apiService.get('/transactions', {
      start_date: params.startDate ?? undefined,
      end_date: params.endDate ?? undefined,
      account_id: params.accountId ?? undefined,
      account_ids:
        Array.isArray(params.accountIds) && params.accountIds.length > 0
          ? params.accountIds.join(',')
          : undefined,
      account_names:
        Array.isArray(params.accountNames) && params.accountNames.length > 0
          ? params.accountNames.join(',')
          : undefined,
      category_id: params.categoryId ?? undefined,
      category_ids:
        Array.isArray(params.categoryIds) && params.categoryIds.length > 0
          ? params.categoryIds.join(',')
          : undefined,
      category_names:
        Array.isArray(params.categoryNames) && params.categoryNames.length > 0
          ? params.categoryNames.join(',')
          : undefined,
      type: params.type ?? undefined,
      limit: params.limit ?? undefined,
      search: params.search ?? undefined,
      min_amount:
        typeof params.minAmount === 'number' ? params.minAmount : undefined,
      max_amount:
        typeof params.maxAmount === 'number' ? params.maxAmount : undefined,
      sort: params.sort ?? undefined,
      keyword: params.search ?? undefined,
    })) as ApiTransactionResponse[];

    // Update cache for personal_id
    if (typeof localStorage !== 'undefined' && transactions.length > 0) {
      const personalIds = transactions.map(txn => Number(txn.personal_id ?? 0)).filter(id => !isNaN(id));
      const maxPersonalId = personalIds.length > 0 ? Math.max(...personalIds) : 0;
      nextPersonalId = maxPersonalId + 1;
      localStorage.setItem('max_transaction_personal_id', maxPersonalId.toString());
    } else {
      nextPersonalId = 1;
    }

    return Array.isArray(transactions) ? transactions : [];
  },

  async fetchTransactionById(id: string) {
    // API service automatically unwraps the response
    const transaction = (await apiService.get(`/transactions/${id}`)) as ApiTransactionResponse;
    return transaction;
  },

  async createTransaction(payload: CreateTransactionRequest) {
    // If personal_id not provided, get next one from cache
    if (!payload.personal_id) {
      payload.personal_id = this.getNextPersonalId();
    }

    // API service automatically unwraps the response
    const transaction = (await apiService.post('/transactions', payload)) as ApiTransactionResponse;
    
    // Update cache after creation
    if (transaction.personal_id) {
      nextPersonalId = Math.max(nextPersonalId, Number(transaction.personal_id) + 1);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('max_transaction_personal_id', String(transaction.personal_id));
      }
    }
    
    return transaction;
  },

  async updateTransaction(id: string, payload: UpdateTransactionRequest) {
    // API service automatically unwraps the response
    const transaction = (await apiService.put(`/transactions/${id}`, payload)) as ApiTransactionResponse;
    return transaction;
  },

  async deleteTransaction(id: string) {
    // API service automatically unwraps the response and throws on error
    await apiService.delete(`/transactions/${id}`);
  },

  getNextPersonalId(): number {
    // Try to get from localStorage first
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('max_transaction_personal_id');
      if (cached) {
        const maxId = parseInt(cached, 10);
        if (!isNaN(maxId)) {
          nextPersonalId = maxId + 1;
        }
      }
    }
    
    const result = nextPersonalId;
    nextPersonalId += 1;
    return result;
  },
};

export default transactionService;
