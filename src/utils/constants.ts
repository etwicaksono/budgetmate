export const APP_CONFIG = {
  storageKeys: {
    authToken: 'finance-app-auth-token',
    refreshToken: 'finance-app-refresh-token',
    userData: 'finance-app-user-data',
    quickTransactions: 'finance-app-quick-transactions',
    preferences: 'finance-app-preferences'
  },

  api: {
    baseUrl: process.env['NEXT_PUBLIC_API_URL'] || '/api/v1',
    timeout: 30000,
    retryAttempts: 3
  },

  ui: {
    toastDuration: 3000,
    modalAnimationDuration: 200,
    debounceDelay: 300,
    infiniteScrollThreshold: 100
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    transactionsPerPage: 20,
    accountsPerPage: 20,
    categoriesPerPage: 50,
    transfersPerPage: 20,
    debtsPerPage: 20
  },

  validation: {
    maxDescriptionLength: 500,
    maxAmountDigits: 15,
    minPasswordLength: 8,
    maxPasswordLength: 128
  },

  dateFormat: {
    default: 'YYYY-MM-DD',
    display: 'MMM DD, YYYY',
    datetime: 'YYYY-MM-DD HH:mm:ss'
  }
};

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  DEBT_IN: 'debt_in',
  DEBT_OUT: 'debt_out',
} as const;

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  CASH: 'cash',
  INVESTMENT: 'investment',
  LOAN: 'loan'
} as const;

export const DEBT_TYPES = {
  LEND: 'lend',
  BORROW: 'borrow'
} as const;

export const DEBT_STATUSES = {
  ACTIVE: 'active',
  SETTLED: 'settled',
} as const;

export const CATEGORY_NATURES = {
  WANT: 'WANT',
  NEED: 'NEED',
  MUST: 'MUST'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'Cash',
  CREDIT_CARD: 'Credit Card',
  DEBIT_CARD: 'Debit Card',
  BANK_TRANSFER: 'Bank Transfer',
  DIGITAL_WALLET: 'Digital Wallet',
  CHECK: 'Check',
  OTHER: 'Other'
} as const;

export const PAYMENT_STATUS = {
  CLEARED: 'Cleared',
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  CANCELLED: 'Cancelled'
} as const;

export const SORT_OPTIONS = {
  DATE_DESC: { field: 'date', order: 'desc', label: 'Date (Newest)' },
  DATE_ASC: { field: 'date', order: 'asc', label: 'Date (Oldest)' },
  AMOUNT_DESC: { field: 'amount', order: 'desc', label: 'Amount (High to Low)' },
  AMOUNT_ASC: { field: 'amount', order: 'asc', label: 'Amount (Low to High)' }
} as const;

export const COLORS = {
  income: {
    text: 'text-green-600',
    bg: 'bg-green-600',
    bgLight: 'bg-green-50',
    border: 'border-green-600',
    hover: 'hover:bg-green-700'
  },
  expense: {
    text: 'text-red-600',
    bg: 'bg-red-600',
    bgLight: 'bg-red-50',
    border: 'border-red-600',
    hover: 'hover:bg-red-700'
  },
  primary: {
    text: 'text-blue-600',
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-600',
    hover: 'hover:bg-blue-700'
  },
  neutral: {
    text: 'text-gray-700',
    bg: 'bg-gray-600',
    bgLight: 'bg-gray-50',
    border: 'border-gray-300',
    hover: 'hover:bg-gray-50'
  },
  debt: {
    text: 'text-purple-600',
    bg: 'bg-purple-600',
    bgLight: 'bg-purple-50',
    border: 'border-purple-600',
    hover: 'hover:bg-purple-700'
  }
} as const;
