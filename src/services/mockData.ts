/**
 * Centralized Mock Data Service
 * 
 * This file contains all dummy/mock data for development.
 * To switch to real API, change USE_MOCK_DATA to false.
 */

import type { Account } from './accountService';
import type { ExpenseByCategory, TrendData, CashFlow } from './analyticsService';
import type { BudgetStatus } from './budgetService';
import type { Transaction } from './transactionService';

// ============================================
// MOCK DATA CONFIGURATION
// ============================================
// Set to true to use mock data, false to use real API
export const USE_MOCK_DATA = false;

// Simulate network delay (in milliseconds)
const MOCK_DELAY = 800;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// MOCK ACCOUNTS
// ============================================
export const mockAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'Cash Wallet',
    account_type: 'cash',
    icon: 'FaWallet',
    color: '#16a34a',
    currency: 'IDR',
    initial_balance: 5000000,
    current_balance: 5237450,
    is_active: true,
    is_included_in_total: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-11-19T00:00:00Z',
  },
  {
    id: 'acc-2',
    name: 'Bank Account',
    account_type: 'checking',
    icon: 'FaUniversity',
    color: '#0891b2',
    currency: 'IDR',
    initial_balance: 15000000,
    current_balance: 14567890,
    is_active: true,
    is_included_in_total: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-11-19T00:00:00Z',
  },
  {
    id: 'acc-3',
    name: 'Savings Account',
    account_type: 'savings',
    icon: 'FaPiggyBank',
    color: '#ca8a04',
    currency: 'IDR',
    initial_balance: 25000000,
    current_balance: 26842350,
    is_active: true,
    is_included_in_total: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-11-19T00:00:00Z',
  },
];

// ============================================
// MOCK EXPENSES BY CATEGORY
// ============================================
export const mockExpensesByCategory: ExpenseByCategory[] = [
  {
    category_id: 'cat-1',
    category_name: 'Food & Dining',
    amount: 1057350,
    percentage: 32.5,
    color: '#FF6384',
    currency: 'IDR',
  },
  {
    category_id: 'cat-2',
    category_name: 'Shopping',
    amount: 2197050,
    percentage: 45.2,
    color: '#36A2EB',
    currency: 'IDR',
  },
  {
    category_id: 'cat-3',
    category_name: 'Transportation',
    amount: 253000,
    percentage: 12.8,
    color: '#FFCE56',
    currency: 'IDR',
  },
  {
    category_id: 'cat-4',
    category_name: 'Entertainment',
    amount: 645000,
    percentage: 9.5,
    color: '#4BC0C0',
    currency: 'IDR',
  },
];

// ============================================
// MOCK TRANSACTIONS
// ============================================
// Mock categories for transactions (with parent-child structure and FA icon names)
export const mockCategories = [
  // Income (no children)
  { id: 'cat-income-1', name: 'Salary', icon: 'FaDollarSign', color: '#10b981', type: 'income', parent_id: null },
  { id: 'cat-income-2', name: 'Freelance', icon: 'FaBriefcase', color: '#10b981', type: 'income', parent_id: null },
  
  // Food & Drinks (parent)
  { id: 'cat-food', name: 'Food & Drinks', icon: 'FaUtensils', color: '#f59e0b', type: 'expense', parent_id: null },
  { id: 'cat-food-1', name: 'Groceries', icon: 'FaShoppingCart', color: '#f59e0b', type: 'expense', parent_id: 'cat-food' },
  { id: 'cat-food-2', name: 'Restaurant, fast-food', icon: 'FaConciergeBell', color: '#f59e0b', type: 'expense', parent_id: 'cat-food' },
  { id: 'cat-food-3', name: 'Bar, cafe', icon: 'FaCoffee', color: '#f59e0b', type: 'expense', parent_id: 'cat-food' },
  
  // Shopping (parent)
  { id: 'cat-shop', name: 'Shopping', icon: 'FaShoppingBag', color: '#ec4899', type: 'expense', parent_id: null },
  { id: 'cat-shop-1', name: 'Clothes & shoes', icon: 'FaTshirt', color: '#ec4899', type: 'expense', parent_id: 'cat-shop' },
  { id: 'cat-shop-2', name: 'Electronics, accessories', icon: 'FaLaptop', color: '#ec4899', type: 'expense', parent_id: 'cat-shop' },
  
  // Transportation (parent)
  { id: 'cat-trans', name: 'Transportation', icon: 'FaBus', color: '#6366f1', type: 'expense', parent_id: null },
  { id: 'cat-trans-1', name: 'Public transport', icon: 'FaTrain', color: '#6366f1', type: 'expense', parent_id: 'cat-trans' },
  { id: 'cat-trans-2', name: 'Taxi', icon: 'FaTaxi', color: '#6366f1', type: 'expense', parent_id: 'cat-trans' },
  
  // Entertainment (parent)
  { id: 'cat-ent', name: 'Entertainment', icon: 'FaFilm', color: '#a855f7', type: 'expense', parent_id: null },
  { id: 'cat-ent-1', name: 'Culture, sport events', icon: 'FaTicketAlt', color: '#a855f7', type: 'expense', parent_id: 'cat-ent' },
  { id: 'cat-ent-2', name: 'Hobbies', icon: 'FaPalette', color: '#a855f7', type: 'expense', parent_id: 'cat-ent' },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'trans-1',
    date: '2024-11-19',
    account_id: 'acc-1',
    account: {
      id: 'acc-1',
      name: 'Cash Wallet',
      icon: 'FaWallet',
      color: '#16a34a',
    },
    category_id: 'cat-food-2',
    category: {
      id: 'cat-food-2',
      name: 'Restaurant, fast-food',
      icon: 'FaConciergeBell',
      color: '#f59e0b',
      type: 'expense',
    },
    amount: 125000,
    type: 'expense',
    description: 'Lunch at restaurant',
    currency: 'IDR',
    created_at: '2024-11-19T12:30:00Z',
    updated_at: '2024-11-19T12:30:00Z',
  },
  {
    id: 'trans-2',
    date: '2024-11-18',
    account_id: 'acc-2',
    account: {
      id: 'acc-2',
      name: 'Bank Account',
      icon: 'FaUniversity',
      color: '#0891b2',
    },
    category_id: 'cat-income-1',
    category: {
      id: 'cat-income-1',
      name: 'Salary',
      icon: 'FaDollarSign',
      color: '#10b981',
      type: 'income',
    },
    amount: 15000000,
    type: 'income',
    description: 'Monthly salary',
    currency: 'IDR',
    created_at: '2024-11-18T08:00:00Z',
    updated_at: '2024-11-18T08:00:00Z',
  },
  {
    id: 'trans-3',
    date: '2024-11-17',
    account_id: 'acc-1',
    account: {
      id: 'acc-1',
      name: 'Cash Wallet',
      icon: 'FaWallet',
      color: '#16a34a',
    },
    category_id: 'cat-trans-2',
    category: {
      id: 'cat-trans-2',
      name: 'Taxi',
      icon: 'FaTaxi',
      color: '#6366f1',
      type: 'expense',
    },
    amount: 50000,
    type: 'expense',
    description: 'Gas/fuel',
    currency: 'IDR',
    created_at: '2024-11-17T16:45:00Z',
    updated_at: '2024-11-17T16:45:00Z',
  },
  {
    id: 'trans-4',
    date: '2024-11-16',
    account_id: 'acc-2',
    account: {
      id: 'acc-2',
      name: 'Bank Account',
      icon: 'FaUniversity',
      color: '#0891b2',
    },
    category_id: 'cat-food-1',
    category: {
      id: 'cat-food-1',
      name: 'Groceries',
      icon: 'FaShoppingCart',
      color: '#f59e0b',
      type: 'expense',
    },
    amount: 750000,
    type: 'expense',
    description: 'Grocery shopping',
    currency: 'IDR',
    created_at: '2024-11-16T10:20:00Z',
    updated_at: '2024-11-16T10:20:00Z',
  },
  {
    id: 'trans-5',
    date: '2024-11-15',
    account_id: 'acc-1',
    account: {
      id: 'acc-1',
      name: 'Cash Wallet',
      icon: 'FaWallet',
      color: '#16a34a',
    },
    category_id: 'cat-food-2',
    category: {
      id: 'cat-food-2',
      name: 'Restaurant, fast-food',
      icon: 'FaConciergeBell',
      color: '#f59e0b',
      type: 'expense',
    },
    amount: 85000,
    type: 'expense',
    description: 'Coffee and snacks',
    currency: 'IDR',
    created_at: '2024-11-15T14:30:00Z',
    updated_at: '2024-11-15T14:30:00Z',
  },
];

// ============================================
// MOCK BUDGET STATUS
// ============================================
export const mockBudgetStatus: BudgetStatus[] = [
  {
    id: 'budget-1',
    category: 'Food & Dining',
    spent: 1057350,
    total: 2000000,
    percentage: 53,
    status: 'warning',
  },
  {
    id: 'budget-2',
    category: 'Shopping',
    spent: 2197050,
    total: 3000000,
    percentage: 73,
    status: 'warning',
  },
  {
    id: 'budget-3',
    category: 'Transportation',
    spent: 253000,
    total: 1000000,
    percentage: 25,
    status: 'success',
  },
  {
    id: 'budget-4',
    category: 'Entertainment',
    spent: 1424574,
    total: 1500000,
    percentage: 95,
    status: 'danger',
  },
];

// ============================================
// MOCK BALANCE TREND
// ============================================
export const mockBalanceTrend: TrendData = {
  labels: ['Nov 1', 'Nov 5', 'Nov 10', 'Nov 15', 'Nov 19'],
  datasets: [
    {
      label: 'Balance',
      data: [42000000, 43500000, 44200000, 45800000, 46647690],
      color: '#2563eb',
    },
  ],
};

// ============================================
// MOCK INCOME VS EXPENSE TREND
// ============================================
export const mockIncomeExpenseTrend: TrendData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Income',
      data: [15000000, 15000000, 15500000, 15000000, 16000000, 15000000],
      color: '#10B981',
    },
    {
      label: 'Expense',
      data: [8500000, 9200000, 8900000, 9800000, 9000000, 8750000],
      color: '#EF4444',
    },
  ],
};

// ============================================
// MOCK SERVICE FUNCTIONS
// ============================================

export const mockDataService = {
  // Accounts
  async fetchAccounts(): Promise<Account[]> {
    await delay(MOCK_DELAY);
    return mockAccounts;
  },

  async fetchAccountById(id: string): Promise<Account> {
    await delay(MOCK_DELAY);
    const account = mockAccounts.find(a => a.id === id);
    if (!account) throw new Error('Account not found');
    return account;
  },

  // Analytics
  async fetchExpensesByCategory(): Promise<ExpenseByCategory[]> {
    await delay(MOCK_DELAY);
    return mockExpensesByCategory;
  },

  async fetchTrends(): Promise<TrendData> {
    await delay(MOCK_DELAY);
    return mockBalanceTrend;
  },

  async fetchCashFlow(): Promise<CashFlow[]> {
    await delay(MOCK_DELAY);
    return [];
  },

  // Transactions
  async fetchTransactions(filters?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<Transaction[]> {
    await delay(MOCK_DELAY);
    // Apply limit if specified
    if (filters?.limit) {
      return mockTransactions.slice(0, filters.limit);
    }
    return mockTransactions;
  },

  async fetchTransactionById(id: string): Promise<Transaction> {
    await delay(MOCK_DELAY);
    const transaction = mockTransactions.find(t => t.id === id);
    if (!transaction) throw new Error('Transaction not found');
    return transaction;
  },

  // Budgets
  async fetchBudgetStatus(): Promise<BudgetStatus[]> {
    await delay(MOCK_DELAY);
    return mockBudgetStatus;
  },

  // Categories
  async fetchCategories(): Promise<typeof mockCategories> {
    await delay(MOCK_DELAY);
    return mockCategories;
  },
};
