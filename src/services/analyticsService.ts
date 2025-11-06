import apiService from './api';
import type { TransactionRecord } from '../types/transaction';

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: { message?: string } | null;
  errors?: Record<string, unknown> | null;
  meta?: unknown;
  status?: string;
  [key: string]: unknown;
}

export interface CategoryReport {
  id: string;
  name: string;
  icon: string;
  currentMonth: number;
  previousMonth: number;
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

export interface IncomeExpenseReport {
  currentMonthName: string;
  previousMonthName: string;
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncome: number;
  totalExpense: number;
  previousTotalIncome: number;
  previousTotalExpense: number;
}

export interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const objectValue = value as Record<string, unknown>;
  return (
    'data' in objectValue ||
    'message' in objectValue ||
    'error' in objectValue ||
    'errors' in objectValue ||
    'success' in objectValue
  );
};

// Dummy data generator
const generateDummyIncomeExpenseReport = (): IncomeExpenseReport => {
  // Income subcategories
  const incomeSubItems: CategoryReport[] = [
    { id: '1-1', name: 'Income', icon: 'FaWallet', currentMonth: 0.00, previousMonth: 0.00 },
    { id: '1-2', name: 'Gifts', icon: 'FaGift', currentMonth: 310864.00, previousMonth: 600375.00 },
    { id: '1-3', name: 'Refunds (tax, purchase)', icon: 'FaReceipt', currentMonth: 0.00, previousMonth: 0.00 },
    { id: '1-4', name: 'Dividends', icon: 'FaCoins', currentMonth: 4000000.00, previousMonth: 0.00 },
    { id: '1-5', name: 'Checks, coupons', icon: 'FaTicketAlt', currentMonth: 0.00, previousMonth: 0.00 },
    { id: '1-6', name: 'Lending, renting', icon: 'FaExchangeAlt', currentMonth: 960500.00, previousMonth: 6712000.00 },
    { id: '1-7', name: 'Sale', icon: 'FaTag', currentMonth: 0.00, previousMonth: 80215.00 },
    { id: '1-8', name: 'Interests', icon: 'FaChartLine', currentMonth: 741.41, previousMonth: 614.91 },
    { id: '1-9', name: 'Wage, invoices', icon: 'FaMoneyBillAlt', currentMonth: 13107047.00, previousMonth: 8129000.00 },
  ];

  const incomeTotal = incomeSubItems.reduce((sum, item) => sum + item.currentMonth, 0);
  const incomePreviousTotal = incomeSubItems.reduce((sum, item) => sum + item.previousMonth, 0);

  const incomeCategories: CategoryReport[] = [
    {
      id: '1',
      name: 'Income',
      icon: 'FaBriefcase',
      currentMonth: incomeTotal,
      previousMonth: incomePreviousTotal,
      hasSubItems: true,
      subItems: incomeSubItems
    },
  ];

  const expenseCategories: CategoryReport[] = [
    { 
      id: '10', 
      name: 'Food & Drinks', 
      icon: 'FaUtensils', 
      currentMonth: 1057350.00, 
      previousMonth: 1670450.00,
      hasSubItems: true,
      subItems: [
        { id: '10-1', name: 'Restaurants', icon: 'FaUtensils', currentMonth: 1057350.00, previousMonth: 1670450.00 }
      ]
    },
    { 
      id: '11', 
      name: 'Shopping', 
      icon: 'FaShoppingCart', 
      currentMonth: 2197050.00, 
      previousMonth: 7637983.00,
      hasSubItems: true,
      subItems: [
        { id: '11-1', name: 'Retail Shopping', icon: 'FaShoppingCart', currentMonth: 2197050.00, previousMonth: 7637983.00 }
      ]
    },
    { 
      id: '12', 
      name: 'Housing', 
      icon: 'FaHome', 
      currentMonth: 239990.00, 
      previousMonth: 120995.00,
      hasSubItems: true,
      subItems: [
        { id: '12-1', name: 'Rent', icon: 'FaHome', currentMonth: 239990.00, previousMonth: 120995.00 }
      ]
    },
    { 
      id: '13', 
      name: 'Transportation', 
      icon: 'FaCar', 
      currentMonth: 3000.00, 
      previousMonth: 0.00,
      hasSubItems: true,
      subItems: [
        { id: '13-1', name: 'Public Transport', icon: 'FaCar', currentMonth: 3000.00, previousMonth: 0.00 }
      ]
    },
    { 
      id: '14', 
      name: 'Vehicle', 
      icon: 'FaCar', 
      currentMonth: 250000.00, 
      previousMonth: 121000.00,
      hasSubItems: true,
      subItems: [
        { id: '14-1', name: 'Maintenance', icon: 'FaCar', currentMonth: 250000.00, previousMonth: 121000.00 }
      ]
    },
    { 
      id: '15', 
      name: 'Life & Entertainment', 
      icon: 'FaTheaterMasks', 
      currentMonth: 14245739.00, 
      previousMonth: 1623445.00,
      hasSubItems: true,
      subItems: [
        { id: '15-1', name: 'Entertainment', icon: 'FaTheaterMasks', currentMonth: 14245739.00, previousMonth: 1623445.00 }
      ]
    },
    { 
      id: '16', 
      name: 'Communication, Gadgets', 
      icon: 'FaMobileAlt', 
      currentMonth: 521008.00, 
      previousMonth: 448325.00,
      hasSubItems: true,
      subItems: [
        { id: '16-1', name: 'Phone Bill', icon: 'FaMobileAlt', currentMonth: 521008.00, previousMonth: 448325.00 }
      ]
    },
    { 
      id: '17', 
      name: 'Financial expenses', 
      icon: 'FaCreditCard', 
      currentMonth: 14582000.00, 
      previousMonth: 1119500.00,
      hasSubItems: true,
      subItems: [
        { id: '17-1', name: 'Bank Fees', icon: 'FaCreditCard', currentMonth: 14582000.00, previousMonth: 1119500.00 }
      ]
    },
    { 
      id: '18', 
      name: 'Investments', 
      icon: 'FaChartLine', 
      currentMonth: 0.00, 
      previousMonth: 0.00,
      hasSubItems: true,
      subItems: [
        { id: '18-1', name: 'Stock Purchase', icon: 'FaChartLine', currentMonth: 0.00, previousMonth: 0.00 }
      ]
    },
    { 
      id: '19', 
      name: 'Others', 
      icon: 'FaClipboard', 
      currentMonth: 38300.00, 
      previousMonth: 7000.00,
      hasSubItems: true,
      subItems: [
        { id: '19-1', name: 'Miscellaneous', icon: 'FaClipboard', currentMonth: 38300.00, previousMonth: 7000.00 }
      ]
    },
    { 
      id: '20', 
      name: 'Unknown', 
      icon: 'FaQuestionCircle', 
      currentMonth: 0.00, 
      previousMonth: 0.00,
      hasSubItems: true,
      subItems: [
        { id: '20-1', name: 'Uncategorized', icon: 'FaQuestionCircle', currentMonth: 0.00, previousMonth: 0.00 }
      ]
    },
  ];

  const totalIncome = incomeCategories.reduce((sum, cat) => sum + cat.currentMonth, 0);
  const totalExpense = expenseCategories.reduce((sum, cat) => sum + cat.currentMonth, 0);
  const previousTotalIncome = incomeCategories.reduce((sum, cat) => sum + cat.previousMonth, 0);
  const previousTotalExpense = expenseCategories.reduce((sum, cat) => sum + cat.previousMonth, 0);

  return {
    currentMonthName: 'September 2025',
    previousMonthName: 'August 2025',
    incomeCategories,
    expenseCategories,
    totalIncome,
    totalExpense,
    previousTotalIncome,
    previousTotalExpense,
  };
};

export interface BalanceDataPoint {
  date: string;
  balance: number;
}

export interface AccountBalance {
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
}

export interface BalanceTrendData {
  balanceData: BalanceDataPoint[];
  accounts: AccountBalance[];
  totalBalance: number;
  percentChange: number;
}

export interface ExpenseByCategory {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface IncomeExpenseTrend {
  name: string;
  income: number;
  expense: number;
  [key: string]: string | number;
}

export interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface AnalyticsService {
  fetchIncomeExpenseReport(params?: AnalyticsQueryParams): Promise<IncomeExpenseReport>;
  fetchCategoryTransactions(categoryId: string, monthType: 'current' | 'previous'): Promise<TransactionRecord[]>;
  fetchBalanceTrend(params?: AnalyticsQueryParams): Promise<BalanceTrendData>;
  fetchExpensesByCategory(params?: AnalyticsQueryParams): Promise<ExpenseByCategory[]>;
  fetchIncomeExpenseTrend(params?: AnalyticsQueryParams): Promise<IncomeExpenseTrend[]>;
  fetchRecentTransactions(limit?: number): Promise<DashboardTransaction[]>;
}

// Dummy balance trend data generator
const generateDummyBalanceTrend = (): BalanceTrendData => {
  const balanceData: BalanceDataPoint[] = [
    { date: '9/1/2025', balance: 2300000 },
    { date: '9/3/2025', balance: 2200000 },
    { date: '9/5/2025', balance: 2150000 },
    { date: '9/7/2025', balance: 2100000 },
    { date: '9/9/2025', balance: 1700000 },
    { date: '9/11/2025', balance: 1650000 },
    { date: '9/14/2025', balance: 2000000 },
    { date: '9/17/2025', balance: 1850000 },
    { date: '9/20/2025', balance: 1300000 },
    { date: '9/23/2025', balance: 1250000 },
    { date: '9/26/2025', balance: 1200000 },
    { date: '9/30/2025', balance: 1926225.42 },
  ];

  const accounts: AccountBalance[] = [
    { name: 'Cash Eko', type: 'Cash', balance: 2816756.00, icon: 'FaMoneyBillWave', color: '#00C49F' },
    { name: 'Saldo Pulsa', type: 'General', balance: 80947.00, icon: 'FaMobileAlt', color: '#0088FE' },
    { name: 'CIMB Syariah', type: 'Current account', balance: 2813245.42, icon: 'FaUniversity', color: '#FF6B6B' },
    { name: 'OVO Eko', type: 'General', balance: 0.00, icon: 'FaCreditCard', color: '#FFA500' },
    { name: 'Shopee Pay Eko', type: 'General', balance: 0.00, icon: 'FaShoppingCart', color: '#FF8042' },
    { name: 'Saldo Tokped', type: 'General', balance: 0.00, icon: 'FaShoppingBag', color: '#FFBB28' },
    { name: 'Gopay', type: 'General', balance: 0.00, icon: 'FaCar', color: '#00D9FF' },
    { name: 'DANA', type: 'General', balance: 127741.00, icon: 'FaCoins', color: '#00B4DB' },
    { name: 'BCA', type: 'Current account', balance: 0.00, icon: 'FaLandmark', color: '#0066CC' },
    { name: 'Cash Dewi', type: 'Cash', balance: -7800.00, icon: 'FaMoneyBillWave', color: '#FF1744' },
    { name: 'Mandiri', type: 'Current account', balance: -4170894.00, icon: 'FaUniversity', color: '#FFD700' },
    { name: 'BRI Dewi', type: 'Current account', balance: 96361.00, icon: 'FaLandmark', color: '#1976D2' },
    { name: 'OVO Dewi', type: 'General', balance: 10655.00, icon: 'FaCreditCard', color: '#8E44AD' },
    { name: 'Shopee Pay Dewi', type: 'General', balance: 44214.00, icon: 'FaShoppingCart', color: '#E67E22' },
    { name: 'Uang Dewi', type: 'Cash', balance: 0.00, icon: 'FaMoneyBillWave', color: '#95A5A6' },
    { name: 'Celengan', type: 'Cash', balance: 115000.00, icon: 'FaPiggyBank', color: '#27AE60' },
  ];

  const totalBalance = balanceData[balanceData.length - 1].balance;
  const percentChange = -58;

  return {
    balanceData,
    accounts,
    totalBalance,
    percentChange,
  };
};

// Dummy transaction data generator
const generateDummyTransactions = (categoryId: string, monthType: 'current' | 'previous'): TransactionRecord[] => {
  const categoryMap: Record<string, { name: string; icon: string; iconColor: string; type: 'INCOME' | 'EXPENSE' }> = {
    '10': { name: 'Food & Drinks', icon: 'FaUtensils', iconColor: '#FF6B6B', type: 'EXPENSE' },
    '10-1': { name: 'Restaurants', icon: 'FaUtensils', iconColor: '#FF6B6B', type: 'EXPENSE' },
    '11': { name: 'Shopping', icon: 'FaShoppingCart', iconColor: '#4ECDC4', type: 'EXPENSE' },
    '11-1': { name: 'Retail Shopping', icon: 'FaShoppingCart', iconColor: '#4ECDC4', type: 'EXPENSE' },
    '1': { name: 'Income', icon: 'FaBriefcase', iconColor: '#95E1D3', type: 'INCOME' },
    '1-1': { name: 'Income', icon: 'FaWallet', iconColor: '#95E1D3', type: 'INCOME' },
    '1-2': { name: 'Gifts', icon: 'FaGift', iconColor: '#F38181', type: 'INCOME' },
  };

  const category = categoryMap[categoryId] || { name: 'Unknown', icon: 'FaWallet', iconColor: '#6c757d', type: 'EXPENSE' };
  const baseDate = monthType === 'current' ? '2025-09' : '2025-08';

  const transactions: TransactionRecord[] = [
    {
      id: `${categoryId}-1`,
      date: `${baseDate}-17`,
      time: '11:23 PM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: 'Star Mart Le mineral 3l => 8.5k Permen => 400 Pembukaan minyak zaitun mamim => 100',
      payer: '',
      amount: 9000.00,
      type: category.type,
    },
    {
      id: `${categoryId}-2`,
      date: `${baseDate}-16`,
      time: '11:17 PM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: 'Nasi padang => 12k',
      payer: '',
      amount: 12000.00,
      type: category.type,
    },
    {
      id: `${categoryId}-3`,
      date: `${baseDate}-13`,
      time: '12:31 AM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: 'jamur shimeji putih => 10k tape => 6k sawi putih => 5k nasi kuning => 6k nasi ayam pok-pok => 7k rebung =>...',
      payer: '',
      amount: 42000.00,
      type: category.type,
    },
    {
      id: `${categoryId}-4`,
      date: `${baseDate}-10`,
      time: '12:31 AM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: '1.25 kg telur omega => 33k 3 biji Es lilin => 2k Sayur Jipang => 5k',
      payer: '',
      amount: 40000.00,
      type: category.type,
    },
    {
      id: `${categoryId}-5`,
      date: `${baseDate}-09`,
      time: '12:25 AM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: '2 Bakso beranak => 10k Tambah pentol 3 => 3k',
      payer: '',
      amount: 23000.00,
      type: category.type,
    },
    {
      id: `${categoryId}-6`,
      date: `${baseDate}-07`,
      time: '12:21 AM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Dewi',
      description: 'Star Mart 3 Saori saus tiram 21gr => 15.750 3 sasa santan kelapa 65gr => 14.250 ABC Kecap asin 133ml =>...',
      payer: '',
      amount: 45500.00,
      type: category.type,
    },
    {
      id: `${categoryId}-7`,
      date: `${baseDate}-06`,
      time: '11:59 PM',
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIconColor: category.iconColor,
      accountName: 'Cash Eko',
      description: 'Ayam + telur bulat 3 + nasi => 20k',
      payer: '',
      amount: 20000.00,
      type: category.type,
    },
  ];

  return transactions;
};

// Dummy expenses by category data generator
const generateDummyExpensesByCategory = (): ExpenseByCategory[] => {
  return [
    { name: 'Food & Drinks', value: 1057350.00 },
    { name: 'Shopping', value: 2197050.00 },
    { name: 'Housing', value: 239990.00 },
    { name: 'Transportation', value: 3000.00 },
    { name: 'Life & Entertainment', value: 14245739.00 },
    { name: 'Communication', value: 521008.00 },
    { name: 'Financial', value: 14582000.00 },
    { name: 'Others', value: 38300.00 },
  ];
};

// Dummy income vs expense trend data generator
const generateDummyIncomeExpenseTrend = (): IncomeExpenseTrend[] => {
  return [
    { name: 'Jan', income: 12000000, expense: 8500000 },
    { name: 'Feb', income: 15500000, expense: 11200000 },
    { name: 'Mar', income: 14200000, expense: 9800000 },
    { name: 'Apr', income: 16000000, expense: 12500000 },
    { name: 'May', income: 13800000, expense: 10300000 },
    { name: 'Jun', income: 15200000, expense: 11700000 },
  ];
};

// Dummy recent transactions generator
const generateDummyRecentTransactions = (limit: number = 10): DashboardTransaction[] => {
  const transactions: DashboardTransaction[] = [
    {
      id: 'txn-1',
      description: 'Indomaret - Belanja bulanan',
      amount: 350000,
      date: '2025-11-04',
      category: 'Shopping',
      type: 'EXPENSE',
    },
    {
      id: 'txn-2',
      description: 'Gaji bulan November',
      amount: 15000000,
      date: '2025-11-01',
      category: 'Salary',
      type: 'INCOME',
    },
    {
      id: 'txn-3',
      description: 'Bensin Pertamax',
      amount: 150000,
      date: '2025-11-03',
      category: 'Transportation',
      type: 'EXPENSE',
    },
    {
      id: 'txn-4',
      description: 'Shopee - Elektronik',
      amount: 750000,
      date: '2025-11-02',
      category: 'Shopping',
      type: 'EXPENSE',
    },
    {
      id: 'txn-5',
      description: 'Freelance project payment',
      amount: 5000000,
      date: '2025-11-02',
      category: 'Income',
      type: 'INCOME',
    },
    {
      id: 'txn-6',
      description: 'Restoran Padang',
      amount: 85000,
      date: '2025-11-01',
      category: 'Food & Drinks',
      type: 'EXPENSE',
    },
    {
      id: 'txn-7',
      description: 'Netflix subscription',
      amount: 186000,
      date: '2025-10-31',
      category: 'Entertainment',
      type: 'EXPENSE',
    },
    {
      id: 'txn-8',
      description: 'Listrik PLN',
      amount: 450000,
      date: '2025-10-30',
      category: 'Housing',
      type: 'EXPENSE',
    },
    {
      id: 'txn-9',
      description: 'Dividend payment',
      amount: 2500000,
      date: '2025-10-29',
      category: 'Investment',
      type: 'INCOME',
    },
    {
      id: 'txn-10',
      description: 'Grab - Transportasi',
      amount: 45000,
      date: '2025-10-28',
      category: 'Transportation',
      type: 'EXPENSE',
    },
  ];

  return transactions.slice(0, limit);
};

export const analyticsService: AnalyticsService = {
  async fetchIncomeExpenseReport(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/analytics/income-expense', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   account_id: params.accountId ?? undefined,
    // })) as ApiResponse<IncomeExpenseReport> | IncomeExpenseReport;

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const dummyData = generateDummyIncomeExpenseReport();

    // Simulate API response structure
    // if (isApiResponse<IncomeExpenseReport>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },

  async fetchCategoryTransactions(categoryId: string, monthType: 'current' | 'previous') {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get(`/analytics/categories/${categoryId}/transactions`, {
    //   month_type: monthType,
    // })) as ApiResponse<CategoryTransaction[]> | CategoryTransaction[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return generateDummyTransactions(categoryId, monthType);
  },

  async fetchBalanceTrend(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/analytics/balance-trend', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   account_id: params.accountId ?? undefined,
    // })) as ApiResponse<BalanceTrendData> | BalanceTrendData;

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 400));

    const dummyData = generateDummyBalanceTrend();

    // Simulate API response structure
    // if (isApiResponse<BalanceTrendData>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },

  async fetchExpensesByCategory(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/analytics/expenses-by-category', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   account_id: params.accountId ?? undefined,
    // })) as ApiResponse<ExpenseByCategory[]> | ExpenseByCategory[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const dummyData = generateDummyExpensesByCategory();

    // Simulate API response structure
    // if (isApiResponse<ExpenseByCategory[]>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },

  async fetchIncomeExpenseTrend(params = {}) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/analytics/income-expense-trend', {
    //   start_date: params.startDate ?? undefined,
    //   end_date: params.endDate ?? undefined,
    //   account_id: params.accountId ?? undefined,
    // })) as ApiResponse<IncomeExpenseTrend[]> | IncomeExpenseTrend[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const dummyData = generateDummyIncomeExpenseTrend();

    // Simulate API response structure
    // if (isApiResponse<IncomeExpenseTrend[]>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },

  async fetchRecentTransactions(limit = 10) {
    // TODO: Replace with actual API call when backend is ready
    // const response = (await apiService.get('/analytics/recent-transactions', {
    //   limit,
    // })) as ApiResponse<DashboardTransaction[]> | DashboardTransaction[];

    // For now, return dummy data with simulated network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const dummyData = generateDummyRecentTransactions(limit);

    // Simulate API response structure
    // if (isApiResponse<DashboardTransaction[]>(response)) {
    //   return response.data ?? dummyData;
    // }

    return dummyData;
  },
};

export default analyticsService;
