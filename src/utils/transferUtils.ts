/**
 * Transfer Transaction Utilities
 * 
 * Following DRY and KISS principles:
 * - Single source of truth for transfer logic
 * - Simple, focused functions
 * - Reusable across components
 */

export interface TransferAccountMapping {
  fromAccountId: string;
  toAccountId: string;
}

export interface TransferTransaction {
  id: string;
  type: string;
  account_id: string;
  category?: { id: string } | null;
  transfer_id?: string;
  from_account_id?: string;
  to_account_id?: string;
}

export interface Transfer {
  id: string;
  amount: number;
  from_account?: string;
  to_account?: string;
}

/**
 * Determines if a transaction is a transfer
 * Single source of truth for transfer detection
 */
export function isTransferTransaction(transaction: TransferTransaction): boolean {
  return transaction.type === 'transfer' ||
         transaction.type === 'transfer_in' ||
         transaction.type === 'transfer_out';
}

/**
 * Maps transfer transaction accounts correctly for modal display
 * Handles the complexity of transfer_out vs transfer_in account mapping
 */
export function mapTransferAccounts(transaction: TransferTransaction): TransferAccountMapping {
  if (!isTransferTransaction(transaction) || !transaction.transfer_id) {
    // Not a transfer, use current account as from, no to account
    return {
      fromAccountId: transaction.account_id,
      toAccountId: ''
    };
  }

  if (transaction.type === 'transfer_out') {
    // For transfer_out: account_id is source, to_account_id is destination
    return {
      fromAccountId: transaction.account_id,
      toAccountId: transaction.to_account_id || ''
    };
  }

  if (transaction.type === 'transfer_in') {
    // For transfer_in: account_id is destination, from_account_id is source
    return {
      fromAccountId: transaction.from_account_id || '',
      toAccountId: transaction.account_id
    };
  }

  // Fallback for other transfer types
  return {
    fromAccountId: transaction.from_account_id || transaction.account_id,
    toAccountId: transaction.to_account_id || ''
  };
}

/**
 * Determines the correct transaction type for modal display
 */
export function getModalTransactionType(transaction: TransferTransaction): 'income' | 'expense' | 'transfer' {
  if (isTransferTransaction(transaction)) {
    return 'transfer';
  }
  
  return transaction.type === 'income' ? 'income' : 'expense';
}
