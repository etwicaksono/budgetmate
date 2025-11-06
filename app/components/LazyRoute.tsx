'use client';

import { lazy } from 'react';

/**
 * Pre-built lazy route components for common pages
 * These are code-split at the route level for optimal bundle size
 */
export const LazyDashboard = lazy(() => import('../../src/views/Dashboard/Dashboard'));
export const LazyAccounts = lazy(() => import('../../src/views/Accounts/Accounts'));
export const LazyReports = lazy(() => import('../../src/views/Reports/Reports'));
export const LazyAnalytics = lazy(() => import('../../src/views/Analytics/Analytics'));
export const LazySettings = lazy(() => import('../../src/views/settings/Settings'));
export const LazyBudgets = lazy(() => import('../../src/views/Budgets/Budgets'));
export const LazyTransactions = lazy(() => import('../../src/views/Transactions/Transactions'));

