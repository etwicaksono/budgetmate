/**
 * Unified Transaction Record Interface
 * Used across analytics, accounts, and transaction components
 */
export interface TransactionRecord {
  id: string;
  date: string;
  time: string;
  categoryName: string;
  categoryIcon: string;
  categoryIconColor: string;
  accountName: string;
  description: string;
  payer: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
}

/**
 * Grouped transactions by date string
 */
export interface GroupedTransactions {
  [dateString: string]: TransactionRecord[];
}
