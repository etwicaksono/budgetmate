import type { TransactionRecord, TransactionStats } from '../types';

/**
 * Calculate total income from transactions
 */
export const calculateTotalIncome = (transactions: TransactionRecord[]): number => {
  return transactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
};

/**
 * Calculate total expenses from transactions
 */
export const calculateTotalExpense = (transactions: TransactionRecord[]): number => {
  return transactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
};

/**
 * Calculate total transfers from transactions
 */
export const calculateTotalTransfer = (transactions: TransactionRecord[]): number => {
  return transactions
    .filter(t => t.type === 'Transfer')
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
};

/**
 * Calculate net amount (income - expenses)
 */
export const calculateNetAmount = (totalIncome: number, totalExpense: number): number => {
  return totalIncome - totalExpense;
};

/**
 * Calculate average transaction amount
 */
export const calculateAverageTransaction = (transactions: TransactionRecord[]): number => {
  if (transactions.length === 0) {return 0;}
  const total = transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  return total / transactions.length;
};

/**
 * Calculate category breakdown
 */
export const calculateCategoryBreakdown = (
  transactions: TransactionRecord[]
): Record<string, number> => {
  const breakdown: Record<string, number> = {};

  transactions.forEach(transaction => {
    const category = transaction.category || 'Uncategorized';
    breakdown[category] = (breakdown[category] || 0) + Math.abs(Number(transaction.amount));
  });

  return breakdown;
};

/**
 * Calculate all transaction statistics
 */
export const calculateTransactionStats = (transactions: TransactionRecord[]): TransactionStats => {
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpense = calculateTotalExpense(transactions);
  const totalTransfer = calculateTotalTransfer(transactions);
  const netAmount = calculateNetAmount(totalIncome, totalExpense);
  const averageTransaction = calculateAverageTransaction(transactions);
  const categoryBreakdown = calculateCategoryBreakdown(transactions);
  
  return {
    totalIncome,
    totalExpense,
    totalTransfer,
    netAmount,
    transactionCount: transactions.length,
    averageTransaction,
    categoryBreakdown,
  };
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get transaction type sign (+ for income, - for expense, ↔ for transfer)
 */
export const getTransactionSign = (type: string): string => {
  switch (type) {
    case 'Income':
      return '+';
    case 'Expense':
      return '-';
    case 'Transfer':
      return '↔';
    default:
      return '';
  }
};

/**
 * Get transaction amount with proper sign
 */
export const getSignedAmount = (amount: number, type: string): number => {
  if (type === 'Income') {return Math.abs(amount);}
  if (type === 'Expense') {return -Math.abs(amount);}
  return amount;
};

/**
 * Calculate percentage of total
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) {return 0;}
  return (value / total) * 100;
};

/**
 * Get top categories by spending
 */
export const getTopCategories = (
  categoryBreakdown: Record<string, number>,
  limit = 5
): Array<{ category: string; amount: number }> => {
  return Object.entries(categoryBreakdown)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

/**
 * Calculate daily average spending
 */
export const calculateDailyAverage = (
  transactions: TransactionRecord[],
  daysInPeriod: number
): number => {
  if (daysInPeriod === 0) {return 0;}
  const totalExpense = calculateTotalExpense(transactions);
  return totalExpense / daysInPeriod;
};

/**
 * Group transactions by date
 */
export const groupTransactionsByDate = (
  transactions: TransactionRecord[]
): Record<string, TransactionRecord[]> => {
  const grouped: Record<string, TransactionRecord[]> = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date).toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(transaction);
  });
  
  return grouped;
};

/**
 * Calculate running balance
 */
export const calculateRunningBalance = (
  transactions: TransactionRecord[],
  initialBalance = 0
): Array<{ date: string; balance: number }> => {
  let balance = initialBalance;
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedTransactions.map(transaction => {
    balance += getSignedAmount(Number(transaction.amount), transaction.type);
    return {
      date: transaction.date,
      balance,
    };
  });
};
