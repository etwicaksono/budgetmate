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
  to_amount?: number | null;
  currency: string;
  to_currency?: string | null;
  from_account?: string;
  to_account?: string;
}

export interface TransferDestination {
  amount: number;
  currency: string;
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

// ==================== CURRENCY CONVERSION UTILITIES ====================

/**
 * Checks if a transfer involves currency conversion
 * Returns true if currencies differ, false if they're the same
 */
export function isMultiCurrencyTransfer(transfer: Transfer): boolean {
  return !!transfer.to_currency && transfer.to_currency !== transfer.currency;
}

/**
 * Checks if a transfer is same-currency (no conversion needed)
 * Inverse of isMultiCurrencyTransfer for better readability in some contexts
 */
export function isSameCurrencyTransfer(transfer: Transfer): boolean {
  return !transfer.to_currency || transfer.to_currency === transfer.currency;
}

/**
 * Gets the effective destination amount and currency
 * Returns to_amount/to_currency if set, otherwise defaults to source amount/currency
 * 
 * This is the single source of truth for computing destination values
 * when to_amount or to_currency might be NULL
 */
export function getTransferDestination(transfer: Transfer): TransferDestination {
  return {
    amount: transfer.to_amount ?? transfer.amount,
    currency: transfer.to_currency ?? transfer.currency
  };
}

/**
 * Determines if to_amount and to_currency should be stored as NULL
 * (optimization for same-currency transfers)
 * 
 * @param fromCurrency - Source account currency
 * @param toCurrency - Destination account currency
 * @param toAmount - Proposed destination amount
 * @param amount - Source amount
 * @returns true if values should be NULL, false if they should be stored
 */
export function shouldUseNullForDestination(
  fromCurrency: string,
  toCurrency: string | undefined | null,
  toAmount: number | undefined | null,
  amount: number
): boolean {
  // If currencies are different, always store destination values
  if (toCurrency && toCurrency !== fromCurrency) {
    return false;
  }
  
  // If amounts are different, always store destination values
  if (toAmount && toAmount !== amount) {
    return false;
  }
  
  // Same currency and same amount (or not provided) = use NULL
  return true;
}

/**
 * Validates that same-currency transfers have matching amounts
 * 
 * @throws Error if validation fails
 */
export function validateSameCurrencyTransfer(
  fromCurrency: string,
  toCurrency: string | undefined | null,
  amount: number,
  toAmount: number | undefined | null
): void {
  const effectiveToCurrency = toCurrency || fromCurrency;
  
  if (fromCurrency === effectiveToCurrency) {
    const effectiveToAmount = toAmount ?? amount;
    if (effectiveToAmount !== amount) {
      throw new Error(
        `Same currency transfers must have matching amounts. ` +
        `Source: ${amount} ${fromCurrency}, Destination: ${effectiveToAmount} ${effectiveToCurrency}`
      );
    }
  }
}

/**
 * Validates that multi-currency transfers have all required fields
 * 
 * @throws Error if validation fails
 */
export function validateMultiCurrencyTransfer(
  fromCurrency: string,
  toCurrency: string | undefined | null,
  toAmount: number | undefined | null
): void {
  if (toCurrency && toCurrency !== fromCurrency) {
    if (!toAmount) {
      throw new Error(
        `Multi-currency transfers require to_amount. ` +
        `Converting from ${fromCurrency} to ${toCurrency} but to_amount is missing.`
      );
    }
    if (toAmount <= 0) {
      throw new Error(`to_amount must be positive for multi-currency transfers`);
    }
  }
}
