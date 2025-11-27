'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { accountService } from '@/services/accountService';
import { categoryService } from '@/services/categoryService';
import { transactionService, CreateTransactionRequest } from '@/services/transactionService';
import { api } from '@/services/api';

interface TransactionFormValues {
  id?: string;
  personal_id: number;
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  date: string;
  account_id: string;
  to_account_id?: string;
  category_id: string;
  description: string;
  payee: string;
  label_ids: string[];
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
  type: 'income' | 'expense' | 'both';
  parent_id?: string | null;
  icon: string;
  color?: string | null;
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
  categoryTree: unknown;
  
  // Actions
  saveTransaction: (data: TransactionFormValues) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const TransactionModalContext = createContext<TransactionModalContextValue | undefined>(undefined);

export function TransactionModalProvider({ children }: { children: ReactNode }): React.ReactElement {
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
  const [categoryTree, setCategoryTree] = useState<unknown>({});
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
      
      setCategories(categoriesData.data);
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
    const firstAccount = accounts[0];
    const firstAccountId = firstAccount ? firstAccount.id : '';
    
    // Build transaction with defaults or initial values
    const type = defaults?.type || 'expense';
    const amount = defaults?.amount || '';
    const date = (defaults?.date || new Date().toISOString().split('T')[0]) as string;
    const account_id = defaults?.account_id || firstAccountId;
    const category_id = defaults?.category_id || '';
    const description = defaults?.description || '';
    const payee = defaults?.payee || '';
    const label_ids = defaults?.label_ids || [];
    
    const newTransaction: TransactionFormValues = {
      personal_id: (maxPersonalIds['transactions'] || 0) + 1,
      type,
      amount,
      date,
      account_id,
      category_id,
      description,
      payee,
      label_ids
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
      // Convert date string (YYYY-MM-DD) to ISO datetime string
      const dateISO = data.date.includes('T') ? data.date : `${data.date}T00:00:00.000Z`;
      
      if (isEditMode && data.id) {
        // Update existing transaction
        const updateData: Partial<CreateTransactionRequest> = {
          personal_id: data.personal_id,
          date: dateISO,
          account_id: data.account_id,
          category_id: data.category_id || '',
          amount: parseFloat(data.amount),
          type: data.type as 'income' | 'expense'
        };
        
        if (data.description) updateData.description = data.description;
        if (data.payee) updateData.payee = data.payee;
        if (data.label_ids && data.label_ids.length > 0) updateData.label_ids = data.label_ids;
        
        await transactionService.updateTransaction(data.id, updateData);
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
            const createData: CreateTransactionRequest = {
              personal_id: personalId,
              date: dateISO,
              account_id: data.account_id,
              category_id: data.category_id || '',
              amount: parseFloat(data.amount),
              type: data.type as 'income' | 'expense'
            };
            
            if (data.description) createData.description = data.description;
            if (data.payee) createData.payee = data.payee;
            if (data.label_ids && data.label_ids.length > 0) createData.label_ids = data.label_ids;
            
            const created = await transactionService.createTransaction(createData);
            
            showToast('Transaction created successfully', 'success');
            
            // Update max personal ID
            setMaxPersonalIds(prev => ({
              ...prev,
              transactions: Math.max(prev['transactions'] || 0, personalId)
            }));
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('transaction-created', {
              detail: { transaction: created }
            }));
            
            break;
          } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'response' in error) {
              const responseError = error as { response?: { status?: number } };
              if (responseError.response?.status === 409 && retries > 1) {
                // Personal ID conflict, fetch new max and retry
                const newMax = await api.getMaxPersonalIds();
                personalId = (newMax['transactions'] || 0) + 1;
                retries--;
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
        }
      }
      
      // Refresh data
      await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchMaxPersonalIds()
      ]);
      closeTransactionModal();
      return true;
    } catch (error) {
      console.error('Failed to save transaction:', error);
      showToast('Failed to save transaction', 'error');
      return false;
    }
  }, [isEditMode, showToast, closeTransactionModal, fetchAccounts, fetchCategories, fetchMaxPersonalIds]);
  
  // Delete transaction
  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    try {
      await transactionService.deleteTransaction(id);
      showToast('Transaction deleted successfully', 'success');
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('transaction-deleted', {
        detail: { transactionId: id }
      }));
      
      await Promise.all([
        fetchAccounts(),
        fetchCategories(),
        fetchMaxPersonalIds()
      ]);
      return true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      showToast('Failed to delete transaction', 'error');
      return false;
    }
  }, [showToast, fetchAccounts, fetchCategories, fetchMaxPersonalIds]);
  
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

export function useTransactionModal(): TransactionModalContextValue {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error('useTransactionModal must be used within TransactionModalProvider');
  }
  return context;
}
