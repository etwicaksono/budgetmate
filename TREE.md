# Directory Tree: .

- Generated at: 2025-11-06T01:03:44Z
- Max depth: unlimited
- Follow symlinks: false
- Use .gitignore: true
- Exclude hidden: true

```text
finance-web/
├── app/
│   ├── accounts/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── analytics/
│   │   └── page.tsx
│   ├── budgets/
│   │   └── page.tsx
│   ├── components/
│   │   ├── LazyRoute.tsx
│   │   └── ProtectedShell.tsx
│   ├── error.tsx
│   ├── layout.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── offline/
│   │   └── page.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── reports/
│   │   └── page.tsx
│   ├── RequireAuth.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── transactions/
│       └── page.tsx
├── CLAUDE.md
├── docs/
│   ├── PERFORMANCE_FEATURES_COMPLETE.md
│   ├── PERFORMANCE_OPTIMIZATIONS.md
│   ├── plan/
│   │   ├── done/
│   │   │   ├── 01-implement-error-boundaries.md
│   │   │   └── 02-split-large-components.md
│   │   ├── progress/
│   │   │   └── 03-performance-optimizations.md
│   │   └── todo/
│   │       ├── 04-security-enhancements.md
│   │       ├── 05-bundle-size-reduction.md
│   │       ├── 06-api-documentation.md
│   │       ├── 07-implement-lazy-loading.md
│   │       ├── 08-input-validation.md
│   │       ├── 09-caching-strategy.md
│   │       ├── 10-cicd-pipeline.md
│   │       ├── 11-quick-wins.md
│   │       ├── ANALYSIS_SUMMARY.md
│   │       ├── fix-code-quality-issues.md
│   │       └── fix-dependencies-concerns.md
│   └── PROJECT_ANALYSIS.md
├── Makefile
├── next-env.d.ts
├── next.config.js
├── package-lock.json
├── package.json
├── PERFORMANCE_VERIFICATION_REPORT.md
├── public/
│   ├── icon-192.png
│   ├── images/
│   │   ├── app-preview.webp
│   │   └── logo-image-only.svg
│   ├── manifest.json
│   └── sw.js
├── README.md
├── reference/
│   └── finance-api.yaml
├── src/
│   ├── components/
│   │   ├── AddAccountModal.tsx
│   │   ├── AmountRangeFilter.tsx
│   │   ├── AsyncErrorBoundary.tsx
│   │   ├── BalanceTrendChart.tsx
│   │   ├── BudgetStatusList.tsx
│   │   ├── CashFlowChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FeatureErrorBoundary.tsx
│   │   ├── Header.tsx
│   │   ├── IncomeExpenseBarChart.tsx
│   │   ├── InputClearButton.tsx
│   │   ├── Logo.tsx
│   │   ├── Pagination.tsx
│   │   ├── PeriodNavigation.tsx
│   │   ├── periodNavigationContext.tsx
│   │   ├── PeriodRangeSelector.tsx
│   │   ├── periodRangeUtils.ts
│   │   ├── RecentTransactionsList.tsx
│   │   ├── Records/
│   │   │   ├── index.ts
│   │   │   ├── RecordsHeader.tsx
│   │   │   └── RecordsList.tsx
│   │   ├── ServiceWorkerRegistration.tsx
│   │   ├── ToastAlert.tsx
│   │   ├── TransactionList/
│   │   │   ├── index.ts
│   │   │   └── TransactionList.tsx
│   │   ├── WebVitalsReporter.tsx
│   │   ├── Widget/
│   │   │   ├── BalanceTrendWidget.tsx
│   │   │   └── README.md
│   │   └── WidgetCards.tsx
│   ├── config/
│   │   └── index.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── AuthStateContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── TransactionModalContext.tsx
│   ├── hooks/
│   │   ├── useDebouncedSearch.ts
│   │   ├── useErrorHandler.ts
│   │   ├── usePagination.ts
│   │   └── useThrottle.ts
│   ├── services/
│   │   ├── accountService.ts
│   │   ├── analyticsService.ts
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── budgetService.ts
│   │   ├── categoryService.ts
│   │   ├── index.tsx
│   │   └── transactionService.ts
│   ├── styles/
│   │   ├── App.css
│   │   └── main.css
│   ├── types/
│   │   ├── react-color.d.ts
│   │   └── transaction.ts
│   ├── utils/
│   │   ├── accountUtils.ts
│   │   ├── crypto.ts
│   │   ├── dataPrefetcher.ts
│   │   ├── dateFormatter.ts
│   │   ├── logger.ts
│   │   ├── numericInput.ts
│   │   ├── performance.ts
│   │   └── requestBatcher.ts
│   └── views/
│       ├── Accounts/
│       │   ├── AccountDetail.tsx
│       │   └── Accounts.tsx
│       ├── Analytics/
│       │   ├── Analytics.tsx
│       │   └── components/
│       │       ├── AdvancedCharts.tsx
│       │       ├── AnalyticsSidebar.tsx
│       │       ├── BalanceTrend.tsx
│       │       ├── CashFlow.tsx
│       │       ├── CategoryTransactionsModal.tsx
│       │       ├── IncomesExpensesReport.tsx
│       │       └── index.ts
│       ├── Budgets/
│       │   └── Budgets.tsx
│       ├── Dashboard/
│       │   └── Dashboard.tsx
│       ├── Login/
│       │   ├── Login.css
│       │   └── Login.tsx
│       ├── Register/
│       │   ├── Register.css
│       │   └── Register.tsx
│       ├── Reports/
│       │   └── Reports.tsx
│       ├── settings/
│       │   ├── Categories.css
│       │   ├── Categories.tsx
│       │   ├── Currencies.css
│       │   ├── Currencies.tsx
│       │   ├── Settings.css
│       │   ├── Settings.tsx
│       │   ├── Templates.css
│       │   └── Templates.tsx
│       └── Transactions/
│           ├── CategoryDropdown.tsx
│           ├── ChildCategorySelect.tsx
│           ├── components/
│           │   ├── DesktopFilterSidebar.tsx
│           │   ├── MobileFilterOffcanvas.tsx
│           │   └── TransactionList/
│           │       ├── index.tsx
│           │       ├── TransactionListEmpty.tsx
│           │       ├── TransactionListHeader.tsx
│           │       ├── TransactionListItem.tsx
│           │       ├── TransactionListSkeleton.tsx
│           │       └── VirtualTransactionList.tsx
│           ├── constants/
│           │   └── index.ts
│           ├── hooks/
│           │   ├── useFilterData.ts
│           │   ├── useTransactionFilters.ts
│           │   └── useTransactions.ts
│           ├── index.ts
│           ├── QuickTransactionModal.tsx
│           ├── SingleCategoryDropdown.tsx
│           ├── TransactionModal.tsx
│           ├── Transactions.tsx
│           ├── types/
│           │   └── index.ts
│           ├── useCategoryData.tsx
│           ├── useQuickTransactions.ts
│           └── utils/
│               ├── transactionCalculations.ts
│               └── transactionHelpers.ts
├── TREE.md
├── tsconfig.json
├── tsconfig.tsbuildinfo
└── vercel.json
```

- Directories: 50
- Files: 160
- Symlinks: 0
