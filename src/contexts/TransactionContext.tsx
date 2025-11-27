'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TransactionFormData {
  id?: string;
  date: string;
  account_id: string;
  category_id: string;
  amount: number | string;
  type: 'income' | 'expense' | 'transfer';
  description?: string;
  payee?: string;
  payment_method?: string;
  label_ids?: string[];
  // Transfer-specific fields
  to_account_id?: string;
  to_amount?: number | string;
}

interface TransactionContextValue {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialData: Partial<TransactionFormData> | undefined;
  openAddModal: (prefilledData?: Partial<TransactionFormData>) => void;
  openEditModal: (transactionData: TransactionFormData) => void;
  closeModal: () => void;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

interface TransactionProviderProps {
  children: ReactNode;
}

export const TransactionProvider: React.FC<TransactionProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [initialData, setInitialData] = useState<Partial<TransactionFormData> | undefined>(undefined);

  const openAddModal = useCallback((prefilledData?: Partial<TransactionFormData>) => {
    setMode('add');
    setInitialData(prefilledData);
    setIsOpen(true);
  }, []);

  const openEditModal = useCallback((transactionData: TransactionFormData) => {
    setMode('edit');
    setInitialData(transactionData);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear data after animation completes
    setTimeout(() => {
      setInitialData(undefined);
    }, 300);
  }, []);

  const value: TransactionContextValue = {
    isOpen,
    mode,
    initialData,
    openAddModal,
    openEditModal,
    closeModal,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = (): TransactionContextValue => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within TransactionProvider');
  }
  return context;
};
