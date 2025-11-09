import { z } from 'zod';
import apiService from './api';
// TODO: Align transaction service utilities with simplified workflows.
import {
  ApiResponseSchema,
  CreateTransactionRequestSchema,
  PaginatedResponseSchema,
  TransactionFiltersSchema,
  TransactionSchema,
  UpdateTransactionRequestSchema,
  type Transaction,
  type CreateTransactionRequest,
  type UpdateTransactionRequest,
} from '@/types/schemas';

export type ApiTransactionResponse = Transaction;
export type { CreateTransactionRequest, UpdateTransactionRequest };

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
  offset?: number;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
}

export interface TransactionService {
  fetchTransactions(params?: TransactionQueryParams): Promise<ApiTransactionResponse[]>;
  fetchTransactionById(id: string): Promise<ApiTransactionResponse>;
  createTransaction(payload: CreateTransactionRequest): Promise<ApiTransactionResponse>;
  updateTransaction(id: string, payload: UpdateTransactionRequest): Promise<ApiTransactionResponse>;
  deleteTransaction(id: string): Promise<void>;
  getNextPersonalId(): number;
}

const transactionListSchema = PaginatedResponseSchema(TransactionSchema);
const transactionResponseSchema = ApiResponseSchema(TransactionSchema);
const emptyResponseSchema = ApiResponseSchema(z.null());

const querySchema = TransactionFiltersSchema.extend({
  account_ids: z.string().optional(),
  account_names: z.string().optional(),
  category_ids: z.string().optional(),
  category_names: z.string().optional(),
  sort: z.string().optional(),
});

const joinList = (values?: string[]): string | undefined =>
  Array.isArray(values) && values.length > 0 ? values.join(',') : undefined;

const generateDummyTransactions = (): ApiTransactionResponse[] => {
  const today = new Date();
  const accountIds = ['acc-1', 'acc-2', 'acc-3', 'acc-4'];
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

  const transactions: ApiTransactionResponse[] = [];

  for (let i = 0; i < 50; i += 1) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    date.setSeconds(0);

    const isExpense = Math.random() > 0.3;
    const category = isExpense
      ? expenseCategories[Math.floor(Math.random() * expenseCategories.length)]
      : incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
    const description = isExpense
      ? expenseDescriptions[Math.floor(Math.random() * expenseDescriptions.length)]
      : incomeDescriptions[Math.floor(Math.random() * incomeDescriptions.length)];
    const amount = isExpense
      ? Math.floor(Math.random() * 500000) + 10000
      : Math.floor(Math.random() * 10000000) + 1000000;

    transactions.push({
      id: `txn-${i + 1}`,
      user_id: 'user-1',
      date,
      account_id: accountIds[Math.floor(Math.random() * accountIds.length)],
      category_id: category.id,
      amount,
      type: isExpense ? 'EXPENSE' : 'INCOME',
      note: Math.random() > 0.7 ? `Note for ${description}` : null,
      position: null,
      transfer_id: null,
      debt_id: null,
      created_at: new Date(date),
      updated_at: new Date(date),
      personal_id: i + 1,
    });
  }

  return transactions.sort((a, b) => {
    const dateA = new Date(a.date ?? 0).getTime();
    const dateB = new Date(b.date ?? 0).getTime();
    return dateB - dateA;
  });
};

let nextPersonalId = 1;

const LOCAL_STORAGE_KEY = 'max_transaction_personal_id';

function updatePersonalIdCache(personalId: number | null | undefined): void {
  if (typeof window === 'undefined' || personalId == null) {
    return;
  }
  const cached = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '0');
  const maxId = Math.max(cached, personalId);
  localStorage.setItem(LOCAL_STORAGE_KEY, maxId.toString());
  nextPersonalId = maxId + 1;
}

function loadCachedPersonalId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const cached = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '0');
  if (!Number.isNaN(cached) && cached > 0) {
    nextPersonalId = cached + 1;
  }
}

function buildQuery(params: TransactionQueryParams): Record<string, string | number | boolean> {
  const base: Record<string, string | number | boolean> = {};

  if (params.startDate) base.start_date = params.startDate;
  if (params.endDate) base.end_date = params.endDate;
  if (params.accountId) base.account_id = params.accountId;
  const accountIdsValue = joinList(params.accountIds);
  if (accountIdsValue) base.account_ids = accountIdsValue;
  const accountNamesValue = joinList(params.accountNames);
  if (accountNamesValue) base.account_names = accountNamesValue;
  if (params.categoryId) base.category_id = params.categoryId;
  const categoryIdsValue = joinList(params.categoryIds);
  if (categoryIdsValue) base.category_ids = categoryIdsValue;
  const categoryNamesValue = joinList(params.categoryNames);
  if (categoryNamesValue) base.category_names = categoryNamesValue;
  if (params.type) base.type = params.type;
  if (typeof params.limit === 'number') base.limit = params.limit;
  if (typeof params.offset === 'number') base.offset = params.offset;
  if (params.search) base.keyword = params.search;
  if (typeof params.minAmount === 'number') base.min_amount = params.minAmount;
  if (typeof params.maxAmount === 'number') base.max_amount = params.maxAmount;
  if (params.sort) base.sort = params.sort;

  querySchema.parse(base);

  return base;
}

export const transactionService: TransactionService = {
  async fetchTransactions(params = {}) {
    const query = buildQuery(params);
    const response = await apiService.get<Transaction[]>('/transactions', query, {
      returnRaw: true,
    });
    const validated = transactionListSchema.parse(response);

    const personalIds = validated.data
      .map(txn => Number(txn.personal_id ?? 0))
      .filter(id => !Number.isNaN(id));
    if (personalIds.length > 0) {
      updatePersonalIdCache(Math.max(...personalIds));
    }

    return validated.data;
  },

  async fetchTransactionById(id) {
    const response = await apiService.get<Transaction>(`/transactions/${encodeURIComponent(id)}`, {}, {
      returnRaw: true,
    });
    const validated = transactionResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Transaction not found');
    }
    return validated.data;
  },

  async createTransaction(payload) {
    const request = CreateTransactionRequestSchema.parse({
      ...payload,
      personal_id: payload.personal_id ?? this.getNextPersonalId(),
    });
    const response = await apiService.post<Transaction>('/transactions', request, {
      returnRaw: true,
    });
    const validated = transactionResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Failed to create transaction');
    }

    updatePersonalIdCache(validated.data.personal_id);
    return validated.data;
  },

  async updateTransaction(id, payload) {
    const request = UpdateTransactionRequestSchema.parse(payload);
    const response = await apiService.put<Transaction>(
      `/transactions/${encodeURIComponent(id)}`,
      request,
      { returnRaw: true }
    );
    const validated = transactionResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Failed to update transaction');
    }

    updatePersonalIdCache(validated.data.personal_id);
    return validated.data;
  },

  async deleteTransaction(id) {
    const response = await apiService.delete<null>(
      `/transactions/${encodeURIComponent(id)}`,
      { returnRaw: true }
    );
    emptyResponseSchema.parse(response);
  },

  getNextPersonalId() {
    loadCachedPersonalId();
    const value = nextPersonalId;
    nextPersonalId += 1;
    return value;
  },
};

export default transactionService;
