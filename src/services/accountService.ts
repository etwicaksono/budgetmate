import { z } from 'zod';
import apiService from './api';
import type { TransactionRecord } from '../types/transaction';
import {
  AccountSchema,
  ApiResponseSchema,
  CreateAccountRequestSchema,
  PaginatedResponseSchema,
  SwapOrderRequestSchema,
  UpdateAccountRequestSchema,
  type Account,
  type CreateAccountRequest,
  type SwapOrderRequest,
  type UpdateAccountRequest,
} from '@/types/schemas';

export type ApiAccountResponse = Account;
export type { CreateAccountRequest, UpdateAccountRequest, SwapOrderRequest };

const accountListSchema = PaginatedResponseSchema(AccountSchema);
const accountResponseSchema = ApiResponseSchema(AccountSchema);
const emptyResponseSchema = ApiResponseSchema(z.null());

export interface AccountService {
  fetchAccounts(): Promise<Account[]>;
  fetchAccountById(id: string): Promise<Account>;
  createAccount(payload: CreateAccountRequest): Promise<Account>;
  updateAccount(id: string, payload: UpdateAccountRequest): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
  swapAccountOrder(payload: SwapOrderRequest): Promise<void>;
  fetchAccountTransactions(accountId: string, currentBalance: number): Promise<TransactionRecord[]>;
  getNextPersonalId(): number;
}

let nextPersonalId = 1;
const LOCAL_STORAGE_KEY = 'max_account_personal_id';

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
  if (cached > 0) {
    nextPersonalId = cached + 1;
  }
}

function generateMockTransactions(currentBalance: number): TransactionRecord[] {
  void currentBalance;
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

  for (let i = 0; i < 50; i += 1) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.floor(Math.random() * 500000) + 10000;
    const isExpense = Math.random() > 0.3;

    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    const time = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

    const dateString = date.toISOString().split('T')[0];

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
      amount,
      type: isExpense ? 'EXPENSE' : 'INCOME',
    });
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const accountService: AccountService = {
  async fetchAccounts() {
    const response = await apiService.get<Account[]>('/accounts', {}, { returnRaw: true });
    const validated = accountListSchema.parse(response);

    const maxPersonalId = validated.meta.max_personal_id ?? 0;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, maxPersonalId.toString());
    }
    nextPersonalId = Math.max(1, maxPersonalId + 1);

    return validated.data;
  },

  async fetchAccountById(id: string) {
    const response = await apiService.get<Account>(`/accounts/${encodeURIComponent(id)}`, {}, { returnRaw: true });
    const validated = accountResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Account not found');
    }
    return validated.data;
  },

  async createAccount(payload: CreateAccountRequest) {
    const validatedRequest = CreateAccountRequestSchema.parse(payload);
    const response = await apiService.post<Account>('/accounts', validatedRequest, { returnRaw: true });
    const validated = accountResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Failed to create account');
    }

    updatePersonalIdCache(validated.data.personal_id);
    return validated.data;
  },

  async updateAccount(id: string, payload: UpdateAccountRequest) {
    const validatedRequest = UpdateAccountRequestSchema.parse(payload);
    const response = await apiService.put<Account>(`/accounts/${encodeURIComponent(id)}`, validatedRequest, { returnRaw: true });
    const validated = accountResponseSchema.parse(response);
    if (!validated.data) {
      throw new Error('Failed to update account');
    }

    updatePersonalIdCache(validated.data.personal_id);
    return validated.data;
  },

  async deleteAccount(id: string) {
    const response = await apiService.delete<null>(`/accounts/${encodeURIComponent(id)}`, { returnRaw: true });
    emptyResponseSchema.parse(response);
  },

  async swapAccountOrder(payload: SwapOrderRequest) {
    const validatedRequest = SwapOrderRequestSchema.parse(payload);
    const response = await apiService.put<null>('/accounts/swap-order', validatedRequest, { returnRaw: true });
    emptyResponseSchema.parse(response);
  },

  async fetchAccountTransactions(accountId: string, currentBalance: number) {
    void accountId;
    await new Promise(resolve => setTimeout(resolve, 300));
    return generateMockTransactions(currentBalance);
  },

  getNextPersonalId() {
    loadCachedPersonalId();
    return nextPersonalId;
  },
};

export default accountService;