# 06. Context and State Management

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check context providers checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#context-providers)
4. 🧪 Write context tests as per [Document 14](./14_TESTING_REQUIREMENTS.md#frontend-component-tests)

## 🎯 React Context Implementation with Exact Hierarchy

### Critical Provider Order

The context providers MUST be nested in this exact order due to dependencies:

```
Level 1: ToastProvider (no dependencies)
    ↓
Level 2: AuthStateProvider (uses Toast)
    ↓  
Level 3: AuthProvider (uses AuthState and Toast)
    ↓
Level 4: TransactionModalProvider (uses Auth)
```

## 📢 Toast Context (Level 1)

Create `src/context/ToastContext.tsx`:

```tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  const showToast = useCallback((
    message: string,
    type: Toast['type'],
    duration: number = 3000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);
  
  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({
  toasts,
  removeToast
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'i',
    warning: '!'
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center space-x-2 rounded-lg p-4 text-white shadow-lg ${
            typeStyles[toast.type]
          } animate-slide-in`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white bg-opacity-30">
            {icons[toast.type]}
          </span>
          <p className="flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 hover:opacity-75"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

## 🔐 Auth State Context (Level 2)

Create `src/context/AuthStateContext.tsx`:

```tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthStateContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const AuthStateContext = createContext<AuthStateContextValue | undefined>(undefined);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  return (
    <AuthStateContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        loading,
        setLoading
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}
```

## 🔑 Auth Context (Level 3)

Create `src/context/AuthContext.tsx`:

```tsx
'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';
import { authService } from '@/services/authService';
import { useToast } from './ToastContext';
import { useAuthState } from './AuthStateContext';

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  timezone: string;
  currency: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  login: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAuthenticated, setIsAuthenticated, loading, setLoading } = useAuthState();
  const [user, setUser] = React.useState<User | null>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
        const userData = localStorage.getItem(APP_CONFIG.storageKeys.userData);
        
        if (encryptedToken && userData) {
          const token = await tokenCrypto.decryptToken(encryptedToken);
          
          if (token) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
          } else {
            // Token decryption failed or expired
            clearAuthData();
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [setIsAuthenticated, setLoading]);
  
  const clearAuthData = () => {
    localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.userData);
    tokenCrypto.clearKey();
    setIsAuthenticated(false);
    setUser(null);
  };
  
  const login = async (response: LoginResponse) => {
    try {
      // Encrypt and store tokens
      const encryptedAccessToken = await tokenCrypto.encryptToken(response.access_token);
      const encryptedRefreshToken = await tokenCrypto.encryptToken(response.refresh_token);
      
      localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);
      localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, encryptedRefreshToken);
      localStorage.setItem(APP_CONFIG.storageKeys.userData, JSON.stringify(response.user));
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      showToast('Login successful!', 'success');
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      showToast('Login failed. Please try again.', 'error');
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      // Call logout API (optional, as JWT is stateless)
      const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
      if (encryptedToken) {
        const token = await tokenCrypto.decryptToken(encryptedToken);
        if (token) {
          await authService.logout(token);
        }
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      clearAuthData();
      showToast('Logged out successfully', 'success');
      router.push('/login');
    }
  };
  
  const refreshToken = async (): Promise<boolean> => {
    try {
      const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
      if (!encryptedRefreshToken) return false;
      
      const refreshTokenValue = await tokenCrypto.decryptToken(encryptedRefreshToken);
      if (!refreshTokenValue) return false;
      
      const response = await authService.refreshToken(refreshTokenValue);
      
      // Store new tokens
      const encryptedAccessToken = await tokenCrypto.encryptToken(response.access_token);
      const encryptedNewRefreshToken = await tokenCrypto.encryptToken(response.refresh_token);
      
      localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);
      localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, encryptedNewRefreshToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthData();
      return false;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## 💳 Transaction Modal Context (Level 4)

Create `src/context/TransactionModalContext.tsx`:

```tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { accountService } from '@/services/accountService';
import { categoryService } from '@/services/categoryService';
import { transactionService } from '@/services/transactionService';
import { api } from '@/services/api';

interface TransactionFormValues {
  id?: string;
  personal_id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  date: string;
  account_id: string;
  to_account_id?: string;
  category_id?: string;
  description?: string;
  payee?: string;
  label_ids?: string[];
}

interface Account {
  id: string;
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  currency: string;
  current_balance: number;
}

interface Category {
  id: string;
  personal_id: number;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string;
  icon: string;
  color?: string;
}

interface TransactionModalContextValue {
  // Modal state
  isOpen: boolean;
  isEditMode: boolean;
  currentTransaction: TransactionFormValues | null;
  
  // Modal actions
  openTransactionModal: (defaults?: Partial<TransactionFormValues>) => void;
  closeTransactionModal: () => void;
  editTransaction: (transaction: TransactionFormValues) => void;
  
  // Data
  accounts: Account[];
  categories: Category[];
  accountIdToName: Record<string, string>;
  accountNameToId: Record<string, string>;
  categoryTree: any;
  
  // Actions
  saveTransaction: (data: TransactionFormValues) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const TransactionModalContext = createContext<TransactionModalContextValue | undefined>(undefined);

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionFormValues | null>(null);
  
  // Data state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountIdToName, setAccountIdToName] = useState<Record<string, string>>({});
  const [accountNameToId, setAccountNameToId] = useState<Record<string, string>>({});
  const [categoryTree, setCategoryTree] = useState<any>({});
  const [maxPersonalIds, setMaxPersonalIds] = useState<Record<string, number>>({});
  
  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const data = await accountService.fetchAccounts();
      setAccounts(data);
      
      // Create mappings
      const idToName: Record<string, string> = {};
      const nameToId: Record<string, string> = {};
      
      data.forEach(account => {
        idToName[account.id] = account.name;
        nameToId[account.name] = account.id;
      });
      
      setAccountIdToName(idToName);
      setAccountNameToId(nameToId);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      showToast('Failed to load accounts', 'error');
    }
  }, [showToast]);
  
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const [categoriesData, treeData] = await Promise.all([
        categoryService.fetchCategories(),
        categoryService.fetchCategoryTree()
      ]);
      
      setCategories(categoriesData);
      setCategoryTree(treeData);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      showToast('Failed to load categories', 'error');
    }
  }, [showToast]);
  
  // Fetch max personal IDs
  const fetchMaxPersonalIds = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await api.getMaxPersonalIds();
      setMaxPersonalIds(data);
    } catch (error) {
      console.error('Failed to fetch max personal IDs:', error);
    }
  }, [isAuthenticated]);
  
  // Load initial data
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchMaxPersonalIds()
      ]);
    }
  }, [isAuthenticated, authLoading, fetchAccounts, fetchCategories, fetchMaxPersonalIds]);
  
  // Open modal for new transaction
  const openTransactionModal = useCallback((defaults?: Partial<TransactionFormValues>) => {
    const newTransaction: TransactionFormValues = {
      personal_id: (maxPersonalIds.transactions || 0) + 1,
      type: defaults?.type || 'expense',
      amount: defaults?.amount || '',
      date: defaults?.date || new Date().toISOString().split('T')[0],
      account_id: defaults?.account_id || accounts[0]?.id || '',
      category_id: defaults?.category_id || '',
      description: defaults?.description || '',
      payee: defaults?.payee || '',
      label_ids: defaults?.label_ids || []
    };
    
    setCurrentTransaction(newTransaction);
    setIsEditMode(false);
    setIsOpen(true);
  }, [maxPersonalIds, accounts]);
  
  // Open modal for editing
  const editTransaction = useCallback((transaction: TransactionFormValues) => {
    setCurrentTransaction(transaction);
    setIsEditMode(true);
    setIsOpen(true);
  }, []);
  
  // Close modal
  const closeTransactionModal = useCallback(() => {
    setIsOpen(false);
    setCurrentTransaction(null);
    setIsEditMode(false);
  }, []);
  
  // Save transaction (create or update)
  const saveTransaction = useCallback(async (data: TransactionFormValues): Promise<boolean> => {
    try {
      if (isEditMode && data.id) {
        // Update existing transaction
        await transactionService.updateTransaction(data.id, data);
        showToast('Transaction updated successfully', 'success');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('transaction-updated', {
          detail: { transactionId: data.id, transaction: data }
        }));
      } else {
        // Create new transaction with retry logic
        let retries = 3;
        let personalId = data.personal_id;
        
        while (retries > 0) {
          try {
            const created = await transactionService.createTransaction({
              ...data,
              personal_id: personalId
            });
            
            showToast('Transaction created successfully', 'success');
            
            // Update max personal ID
            setMaxPersonalIds(prev => ({
              ...prev,
              transactions: Math.max(prev.transactions || 0, personalId)
            }));
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('transaction-created', {
              detail: { transaction: created }
            }));
            
            break;
          } catch (error: any) {
            if (error.response?.status === 409 && retries > 1) {
              // Personal ID conflict, fetch new max and retry
              const newMax = await api.getMaxPersonalIds();
              personalId = newMax.transactions + 1;
              retries--;
            } else {
              throw error;
            }
          }
        }
      }
      
      // Refresh data
      await refreshData();
      closeTransactionModal();
      return true;
    } catch (error) {
      console.error('Failed to save transaction:', error);
      showToast('Failed to save transaction', 'error');
      return false;
    }
  }, [isEditMode, showToast, closeTransactionModal]);
  
  // Delete transaction
  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await transactionService.deleteTransaction(id);
      showToast('Transaction deleted successfully', 'success');
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('transaction-deleted', {
        detail: { transactionId: id }
      }));
      
      await refreshData();
      return true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      showToast('Failed to delete transaction', 'error');
      return false;
    }
  }, [showToast]);
  
  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchAccounts(),
      fetchCategories(),
      fetchMaxPersonalIds()
    ]);
  }, [fetchAccounts, fetchCategories, fetchMaxPersonalIds]);
  
  return (
    <TransactionModalContext.Provider
      value={{
        isOpen,
        isEditMode,
        currentTransaction,
        openTransactionModal,
        closeTransactionModal,
        editTransaction,
        accounts,
        categories,
        accountIdToName,
        accountNameToId,
        categoryTree,
        saveTransaction,
        deleteTransaction,
        refreshData
      }}
    >
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error('useTransactionModal must be used within TransactionModalProvider');
  }
  return context;
}
```

## 🔧 App Constants

Create `src/utils/constants.ts`:

```typescript
export const APP_CONFIG = {
  storageKeys: {
    authToken: 'finance-app-auth-token',
    refreshToken: 'finance-app-refresh-token',
    userData: 'finance-app-user-data',
    quickTransactions: 'finance-app-quick-transactions',
    preferences: 'finance-app-preferences'
  },
  
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
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
    defaultLimit: 50,
    maxLimit: 100,
    transactionsPerPage: 50,
    accountsPerPage: 20
  },
  
  validation: {
    maxDescriptionLength: 500,
    maxAmountDigits: 15,
    minPasswordLength: 8,
    maxPasswordLength: 128
  },
  
  currency: {
    default: 'USD',
    decimals: 2
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
  TRANSFER: 'transfer'
} as const;

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  CASH: 'cash',
  INVESTMENT: 'investment',
  LOAN: 'loan'
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
```

## ⚠️ Critical Context Implementation Rules

### 1. Provider Order is MANDATORY
```tsx
// MUST be in this exact order
<ToastProvider>           // Level 1
  <AuthStateProvider>     // Level 2
    <AuthProvider>        // Level 3
      <TransactionModalProvider> // Level 4
```

### 2. Always Check Authentication
```tsx
// In dependent contexts
if (isAuthenticated && !authLoading) {
  // Fetch data
}
```

### 3. Handle Token Encryption
```tsx
// ALWAYS encrypt before storage
const encrypted = await tokenCrypto.encryptToken(token);
localStorage.setItem(key, encrypted);

// ALWAYS decrypt when reading
const encrypted = localStorage.getItem(key);
const token = await tokenCrypto.decryptToken(encrypted);
```

### 4. Dispatch Custom Events
```tsx
// For cross-component communication
window.dispatchEvent(new CustomEvent('transaction-created', {
  detail: { transaction }
}));
```

### 5. Implement Retry Logic
```tsx
// For personal_id conflicts
while (retries > 0) {
  try {
    // Create with personal_id
  } catch (error) {
    if (error.response?.status === 409) {
      // Fetch new max and retry
    }
  }
}
```

## ✅ Context Implementation Checklist

- [ ] Toast context with notification system
- [ ] Auth state context for authentication state
- [ ] Auth context with login/logout/refresh
- [ ] Transaction modal context with CRUD operations
- [ ] Provider hierarchy correctly ordered
- [ ] Token encryption/decryption implemented
- [ ] Custom event dispatching
- [ ] Retry logic for personal_id conflicts
- [ ] Error handling with toast notifications
- [ ] Data refresh mechanisms

## 🎯 Next Steps

1. Create service layer from [08_SERVICES_LAYER.md](./08_SERVICES_LAYER.md)
2. Implement default data seeding from [07_DEFAULT_DATA_SEEDING.md](./07_DEFAULT_DATA_SEEDING.md)
3. Build transaction modal component
4. Create dashboard pages
5. Test context interactions
