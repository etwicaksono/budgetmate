/**
 * Utility functions for formatting data
 * Following DRY principle - centralized formatting logic
 */

import { currencyFormatService } from '@/services/currencyFormatService';

/**
 * Format currency amount with sign based on transaction type
 */
export function formatAmount(amount: number, type: 'income' | 'expense', currency: string = 'USD'): string {
  return currencyFormatService.formatWithSign(amount, currency, type);
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format date to input value (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date = new Date()): string {
  const parts = date.toISOString().split('T');
  return parts[0] || '';
}

/**
 * Format currency for display (without sign)
 * Now powered by currencyFormatService with proper symbol and formatting
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return currencyFormatService.formatCurrency(amount, currency);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(num: number, currency: string = 'USD'): string {
  return currencyFormatService.formatCompact(num, currency);
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
}
