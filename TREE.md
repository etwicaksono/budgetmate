# Directory Tree: .

- Generated at: 2025-11-08T18:44:41Z
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
│   ├── api/
│   │   ├── openapi/
│   │   │   └── [[...openapi]]/
│   │   │       └── route.ts
│   │   └── v1/
│   │       ├── accounts/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── swap-order/
│   │       │       └── route.ts
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts
│   │       │   ├── logout/
│   │       │   │   └── route.ts
│   │       │   ├── refresh/
│   │       │   │   └── route.ts
│   │       │   └── register/
│   │       │       └── route.ts
│   │       ├── categories/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   ├── swap-order/
│   │       │   │   └── route.ts
│   │       │   └── tree/
│   │       │       └── route.ts
│   │       ├── debts/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── groups/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── transactions/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── summary/
│   │       │       └── route.ts
│   │       └── transfers/
│   │           ├── [id]/
│   │           │   └── route.ts
│   │           └── route.ts
│   ├── api-docs/
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
├── data/
│   ├── default_accounts.json
│   └── default_categories.json
├── docs/
│   ├── add-jsdoc.md
│   ├── api-tags.md
│   ├── API_COMPLETE_REFERENCE.md
│   ├── CONTRIBUTING.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── IMPLEMENTATION_COMPLETE.md
│   ├── MIGRATION_GUIDE.md
│   ├── plan/
│   │   ├── done/
│   │   │   ├── 01-implement-error-boundaries.md
│   │   │   └── 02-split-large-components.md
│   │   ├── progress/
│   │   │   └── 03-performance-optimizations.md
│   │   ├── result/
│   │   │   ├── PERFORMANCE_FEATURES_COMPLETE.md
│   │   │   ├── PERFORMANCE_OPTIMIZATIONS.md
│   │   │   └── PROJECT_ANALYSIS.md
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
│   ├── README.md
│   ├── refactor-route-plan.md
│   ├── refactor-to-fullstack/
│   │   ├── API_IMPLEMENTATION_GUIDE.md
│   │   ├── CONFLICTS_ANALYSIS.md
│   │   ├── database.ts
│   │   ├── DATABASE_SCHEMA_GUIDE.md
│   │   ├── httpClient.ts
│   │   ├── READ_ME_FIRST.txt
│   │   ├── REFACTOR_PLAN.md
│   │   ├── reference/
│   │   │   ├── finance-api.sql
│   │   │   └── Implemented-api.md
│   │   ├── result/
│   │   │   ├── api-migration-guide.md
│   │   │   ├── phase1-auth-testing.md
│   │   │   ├── phase1-fix-token-handling.md
│   │   │   ├── phase2-account-testing.md
│   │   │   ├── phase3-category-testing.md
│   │   │   ├── phase4-group-implementation.md
│   │   │   ├── phase6-transfer-implementation.md
│   │   │   └── phase7-debt-implementation.md
│   │   ├── route.ts
│   │   ├── SCHEMA_UPDATE_SUMMARY.txt
│   │   └── transactionService.updated.ts
│   ├── TESTING_GUIDE.md
│   └── tracing/
│       └── categories-accounts-transaction-page-data-flow.md
├── generated/
├── lib/
├── Makefile
├── next-env.d.ts
├── next.config.js
├── package-lock.json
├── package.json
├── PERFORMANCE_VERIFICATION_REPORT.md
├── prisma/
│   └── schema.prisma
├── prisma.config.ts
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
├── schemas/
├── scripts/
│   └── check-jsdoc.mjs
├── src/
│   ├── components/
│   │   ├── AddAccountModal.tsx
│   │   ├── AmountRangeFilter.tsx
│   │   ├── BalanceTrendChart.tsx
│   │   ├── BudgetStatusList.tsx
│   │   ├── CashFlowChart.tsx
│   │   ├── CategoryPieChart.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Header.tsx
│   │   ├── IncomeExpenseBarChart.tsx
│   │   ├── InputClearButton.tsx
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
│   │   ├── useBulkActionHandler.ts
│   │   └── useErrorHandler.ts
│   ├── lib/
│   │   ├── api-response.ts
│   │   ├── auth.ts
│   │   └── db.ts
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
│   │   ├── api.ts
│   │   ├── react-color.d.ts
│   │   └── transaction.ts
│   ├── utils/
│   │   ├── accountUtils.ts
│   │   ├── crypto.ts
│   │   ├── dateFormatter.ts
│   │   ├── numericInput.ts
│   │   └── performance.ts
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
├── test-api.html
├── TREE.md
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── types/
│   └── api-responses.ts
└── vercel.json
```

- Directories: 88
- Files: 212
- Symlinks: 0
