/**
 * Custom hook for account modal management
 * Following DRY principle - single source of truth for modal logic
 * Following SRP - separates modal state management from UI components
 */

import { useState, useCallback } from 'react';
import { accountService, Account } from '@/services/accountService';

export interface AccountFormData {
  name: string;
  account_type: string;
  icon: string;
  color: string;
  initial_balance: string; // String for formatted input compatibility
  currency: string;
  is_active: boolean;
  is_included_in_total: boolean;
}

interface UseAccountModalResult {
  showModal: boolean;
  modalMode: 'add' | 'edit';
  editingAccount: Account | null;
  openAddModal: () => void;
  openEditModal: (account: Account) => void;
  closeModal: () => void;
  saveAccount: (formData: AccountFormData) => Promise<void>;
  initialData: AccountFormData | undefined;
}

export function useAccountModal(onSuccess?: () => Promise<void>): UseAccountModalResult {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Open modal in add mode
  const openAddModal = useCallback(() => {
    setModalMode('add');
    setEditingAccount(null);
    setShowModal(true);
  }, []);

  // Open modal in edit mode
  const openEditModal = useCallback((account: Account) => {
    setModalMode('edit');
    setEditingAccount(account);
    setShowModal(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingAccount(null);
  }, []);

  // Save account (create or update)
  const saveAccount = useCallback(async (formData: AccountFormData) => {
    try {
      if (modalMode === 'add') {
        const createdAccount = await accountService.createAccount({
          personal_id: 0, // Will be set by backend
          name: formData.name,
          account_type: formData.account_type,
          icon: formData.icon,
          color: formData.color,
          initial_balance: parseFloat(formData.initial_balance) || 0,
          currency: formData.currency,
          is_active: formData.is_active,
          is_included_in_total: formData.is_included_in_total,
        });

        // Dispatch event for other components to listen
        console.log('[useAccountModal] Dispatching event: account-created');
        window.dispatchEvent(new CustomEvent('account-created', {
          detail: { account: createdAccount }
        }));
      } else if (editingAccount) {
        const updatedAccount = await accountService.updateAccount(editingAccount.id, {
          name: formData.name,
          account_type: formData.account_type,
          icon: formData.icon,
          color: formData.color,
          initial_balance: parseFloat(formData.initial_balance) || 0,
          currency: formData.currency,
          is_active: formData.is_active,
          is_included_in_total: formData.is_included_in_total,
        });

        // Dispatch event for other components to listen
        console.log('[useAccountModal] Dispatching event: account-updated');
        window.dispatchEvent(new CustomEvent('account-updated', {
          detail: { accountId: editingAccount.id, account: updatedAccount }
        }));
      }

      // Call success callback to refresh accounts
      if (onSuccess) {
        await onSuccess();
      }

      closeModal();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save account');
    }
  }, [modalMode, editingAccount, onSuccess, closeModal]);

  // Prepare initial data for the form
  const initialData: AccountFormData | undefined = editingAccount
    ? {
        name: editingAccount.name,
        account_type: editingAccount.account_type,
        icon: editingAccount.icon,
        color: editingAccount.color,
        initial_balance: String(editingAccount.initial_balance),
        currency: editingAccount.currency,
        is_active: editingAccount.is_active,
        is_included_in_total: editingAccount.is_included_in_total,
      }
    : undefined;

  return {
    showModal,
    modalMode,
    editingAccount,
    openAddModal,
    openEditModal,
    closeModal,
    saveAccount,
    initialData,
  };
}
