import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Debt } from '@/services/debtService';

export type DebtModalType = 'debt' | 'repayment' | 'increase';
export type DebtMode = 'add' | 'edit';

export interface DebtContextValue {
  isOpen: boolean;
  modalType: DebtModalType;
  mode: DebtMode;
  initialData: Debt | null;
  // TODO: type this properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editTransaction: any | null;
  defaultDebtType: 'lend' | 'borrow';
  activeDebtTab: 'lend' | 'borrow';
  setActiveDebtTab: (tab: 'lend' | 'borrow') => void;
  openAddDebtModal: (defaultType?: 'lend' | 'borrow') => void;
  openEditDebtModal: (debt: Debt) => void;
  // TODO: type transaction properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openRepaymentModal: (debt: Debt, transaction?: any) => void;
  // TODO: type transaction properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openIncreaseModal: (debt: Debt, transaction?: any) => void;
  closeModal: () => void;
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
  // TODO: type this properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editTransaction, setEditTransaction] = useState<any | null>(null);
  const [defaultDebtType, setDefaultDebtType] = useState<'lend' | 'borrow'>('lend');
  const [activeDebtTab, setActiveDebtTab] = useState<'lend' | 'borrow'>('lend');

  const openAddDebtModal = useCallback((defaultType: 'lend' | 'borrow' = 'lend') => {
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

  // TODO: type transaction properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openRepaymentModal = useCallback((debt: Debt, transaction: any = null) => {
    setModalType('repayment');
    setMode(transaction ? 'edit' : 'add');
    setInitialData(debt);
    setEditTransaction(transaction);
    setIsOpen(true);
  }, []);

  // TODO: type transaction properly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openIncreaseModal = useCallback((debt: Debt, transaction: any = null) => {
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
