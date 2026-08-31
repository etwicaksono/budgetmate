import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { DebtType } from '@prisma/client';
import { Debt } from '@/services/debtService';

export type DebtModalType = 'debt' | 'repayment' | 'increase';
export type DebtMode = 'add' | 'edit';

export interface DebtContextValue {
  isOpen: boolean;
  modalType: DebtModalType;
  mode: DebtMode;
  initialData: Debt | null;
  editTransaction: import('@/services/transactionService').Transaction | null;
  defaultDebtType: DebtType;
  activeDebtTab: DebtType;
  setActiveDebtTab: (tab: DebtType) => void;
  openAddDebtModal: (defaultType?: DebtType) => void;
  openEditDebtModal: (debt: Debt) => void;
  openRepaymentModal: (debt: Debt, transaction?: import('@/services/transactionService').Transaction) => void;
  openIncreaseModal: (debt: Debt, transaction?: import('@/services/transactionService').Transaction) => void;
  closeModal: () => void;
  isDetailOpen: boolean;
  detailDebt: Debt | null;
  openDetailModal: (debt: Debt) => void;
  closeDetailModal: () => void;
  updateDetailDebt: (debt: Debt) => void;
}

const DebtContext = createContext<DebtContextValue | undefined>(undefined);

interface DebtProviderProps {
  children: ReactNode;
}

export const DebtProvider: React.FC<DebtProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<DebtModalType>('debt');
  const [mode, setMode] = useState<DebtMode>('add');
  const [initialData, setInitialData] = useState<Debt | null>(null);
  const [editTransaction, setEditTransaction] = useState<import('@/services/transactionService').Transaction | null>(null);
  const [defaultDebtType, setDefaultDebtType] = useState<DebtType>('lend' as DebtType);
  const [activeDebtTab, setActiveDebtTab] = useState<DebtType>('lend' as DebtType);

  const openAddDebtModal = useCallback((defaultType: DebtType = 'lend' as DebtType) => {
    setModalType('debt');
    setMode('add');
    setDefaultDebtType(defaultType);
    setInitialData(null);
    setEditTransaction(null);
    setIsOpen(true);
  }, []);

  const openEditDebtModal = useCallback((debt: Debt) => {
    setModalType('debt');
    setMode('edit');
    setInitialData(debt);
    setEditTransaction(null);
    setIsOpen(true);
  }, []);

  const openRepaymentModal = useCallback((debt: Debt, transaction: import('@/services/transactionService').Transaction | null = null) => {
    setModalType('repayment');
    setMode(transaction ? 'edit' : 'add');
    setInitialData(debt);
    setEditTransaction(transaction);
    setIsOpen(true);
  }, []);

  const openIncreaseModal = useCallback((debt: Debt, transaction: import('@/services/transactionService').Transaction | null = null) => {
    setModalType('increase');
    setMode(transaction ? 'edit' : 'add');
    setInitialData(debt);
    setEditTransaction(transaction);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear data after animation completes
    setTimeout(() => {
      setInitialData(null);
      setEditTransaction(null);
    }, 300);
  }, []);

  // Detail modal (can sit underneath the global modal, e.g. repayment opened
  // from the debt detail view). Lives in context so the always-mounted
  // GlobalDebtModal can track both layers for the mobile back button.
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);

  const openDetailModal = useCallback((debt: Debt) => {
    setDetailDebt(debt);
    setIsDetailOpen(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setIsDetailOpen(false);
    // Clear data after animation completes
    setTimeout(() => {
      setDetailDebt(null);
    }, 300);
  }, []);

  const updateDetailDebt = useCallback((debt: Debt) => {
    setDetailDebt(debt);
  }, []);

  const value: DebtContextValue = {
    isOpen,
    modalType,
    mode,
    initialData,
    editTransaction,
    defaultDebtType,
    activeDebtTab,
    setActiveDebtTab,
    openAddDebtModal,
    openEditDebtModal,
    openRepaymentModal,
    openIncreaseModal,
    closeModal,
    isDetailOpen,
    detailDebt,
    openDetailModal,
    closeDetailModal,
    updateDetailDebt,
  };

  return (
    <DebtContext.Provider value={value}>
      {children}
    </DebtContext.Provider>
  );
};

export const useDebt = (): DebtContextValue => {
  const context = useContext(DebtContext);
  if (!context) {
    throw new Error('useDebt must be used within DebtProvider');
  }
  return context;
};
