import { useState, useCallback } from 'react';
import type { Transaction } from '@/services/transactionService';

export interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  date: string;
  account_id: string;
  category_id: string;
  to_account_id: string;
  description: string;
  payee: string;
  payment_method: string;
  payment_status: string;
  label_ids: string[];
  is_draft: boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface TransactionFormHookResult {
  formData: TransactionFormData;
  errors: ValidationErrors;
  updateField: <K extends keyof TransactionFormData>(field: K, value: TransactionFormData[K]) => void;
  setFormData: (data: Partial<TransactionFormData>) => void;
  validateForm: () => boolean;
  resetForm: () => void;
  initializeFromTransaction: (transaction: Transaction | null) => void;
}

const getDefaultFormData = (): TransactionFormData => {
  // Get current local time in datetime-local format (YYYY-MM-DDTHH:mm)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  
  return {
    type: 'expense',
    amount: '',
    date: localDateTime,
    account_id: '',
    category_id: '',
    to_account_id: '',
    description: '',
    payee: '',
    payment_method: 'Cash',
    payment_status: 'Cleared',
    label_ids: [],
    is_draft: false,
  };
};

export function useTransactionForm(): TransactionFormHookResult {
  const [formData, setFormDataState] = useState<TransactionFormData>(getDefaultFormData());
  const [errors, setErrors] = useState<ValidationErrors>({});

  const updateField = useCallback(<K extends keyof TransactionFormData>(
    field: K,
    value: TransactionFormData[K]
  ) => {
    setFormDataState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFormData = useCallback((data: Partial<TransactionFormData>) => {
    setFormDataState((prev) => ({ ...prev, ...data }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    const amountValue = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amountValue) || amountValue <= 0) {
      newErrors['amount'] = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors['date'] = 'Date is required';
    }

    if (!formData.account_id) {
      newErrors['account'] = 'Account is required';
    }

    if (formData.type === 'transfer') {
      if (!formData.to_account_id) {
        newErrors['toAccount'] = 'Destination account is required';
      }
      if (formData.account_id === formData.to_account_id) {
        newErrors['toAccount'] = 'Destination must be different from source';
      }
    } else {
      if (!formData.category_id) {
        newErrors['category'] = 'Category is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const resetForm = useCallback(() => {
    setFormDataState(getDefaultFormData());
    setErrors({});
  }, []);

  const initializeFromTransaction = useCallback((transaction: Transaction | null) => {
    if (!transaction) {
      resetForm();
      return;
    }

    // Convert UTC datetime from backend to local datetime for input
    const convertUTCToLocal = (utcDateString: string): string => {
      const date = new Date(utcDateString);  // Parse UTC string
      if (isNaN(date.getTime())) {
        console.warn('Invalid transaction date in useTransactionForm, falling back to current date:', utcDateString);
        return getDefaultFormData().date;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const transactionWithLabelIds = transaction as Transaction & {
      label_ids?: string[];
      to_account_id?: string;
      is_draft?: boolean;
    };
    
    // Extract label IDs - try label_ids first (from edit modal), then labels array (from API)
    const labelIds = transactionWithLabelIds.label_ids || 
                     transaction.labels?.map(label => label.id).filter((id): id is string => !!id) || 
                     [];
    
    setFormDataState({
      type: transactionWithLabelIds.type === 'transfer' || transactionWithLabelIds.type === 'transfer_in' || transactionWithLabelIds.type === 'transfer_out' 
        ? 'transfer' 
        : transaction.type === 'income' ? 'income' : 'expense',
      amount: Math.abs(transaction.amount).toString(),
      date: convertUTCToLocal(transaction.date),
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      to_account_id: transactionWithLabelIds.to_account_id || '',
      description: transaction.description || '',
      payee: transaction.payee || '',
      payment_method: transaction.payment_method || 'Cash',
      payment_status: transaction.payment_status || 'Cleared',
      label_ids: labelIds,
      is_draft: transactionWithLabelIds.is_draft || transaction.is_draft || false,
    });
    setErrors({});
  }, [resetForm]);

  return {
    formData,
    errors,
    updateField,
    setFormData,
    validateForm,
    resetForm,
    initializeFromTransaction,
  };
}
