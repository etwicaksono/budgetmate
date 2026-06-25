# Directory Tree: .

- Generated at: 2026-06-24T22:50:10Z
- Max depth: unlimited
- Follow symlinks: false
- Use .gitignore: true
- Exclude hidden: false
- Exclude (any): .git

```text
finance-web/
├── .env.example
├── .gitignore
├── .next/
├── .prettierignore
├── .prettierrc
├── app/
│   ├── (app)/
│   │   ├── accounts/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   ├── Accounts.css
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   ├── _components/
│   │   │   │   └── AnalyticsFilterSidebar.tsx
│   │   │   └── page.tsx
│   │   ├── budgets/
│   │   │   ├── _components/
│   │   │   │   ├── budget-table/
│   │   │   │   │   ├── columns.tsx
│   │   │   │   │   ├── formatters.tsx
│   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── useBudgetGridData.ts
│   │   │   │   │   │   ├── useBudgetPersistence.ts
│   │   │   │   │   │   ├── useBudgetSearch.ts
│   │   │   │   │   │   └── useBudgetSelection.ts
│   │   │   │   │   └── types.ts
│   │   │   │   ├── BudgetAccountFilter.tsx
│   │   │   │   ├── BudgetFilterSidebar.tsx
│   │   │   │   ├── BudgetTableMode.tsx
│   │   │   │   └── BudgetToolbar.tsx
│   │   │   ├── page.tsx
│   │   │   └── types.ts
│   │   ├── dashboard/
│   │   │   ├── Dashboard.css
│   │   │   └── page.tsx
│   │   ├── debts/
│   │   │   ├── Debts.css
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── sections/
│   │   │   │   ├── AutomaticRulesSection.tsx
│   │   │   │   ├── BackupSection.tsx
│   │   │   │   ├── BillingSection.tsx
│   │   │   │   ├── Categories.css
│   │   │   │   ├── CategoriesSection.tsx
│   │   │   │   ├── GeneralSection.tsx
│   │   │   │   ├── HelpSection.tsx
│   │   │   │   ├── index.ts
│   │   │   │   ├── LabelsSection.tsx
│   │   │   │   ├── PrivacySection.tsx
│   │   │   │   └── TemplatesSection.tsx
│   │   │   └── Settings.css
│   │   ├── transactions/
│   │   │   ├── _components/
│   │   │   │   └── TransactionFilterSidebar.tsx
│   │   │   └── page.tsx
│   │   └── transfers/
│   │       └── page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   ├── Login.css
│   │   │   └── page.tsx
│   │   └── register/
│   │       ├── page.tsx
│   │       └── Register.css
│   ├── api/
│   │   ├── ai/
│   │   │   ├── config/
│   │   │   │   └── route.ts
│   │   │   └── sessions/
│   │   │       ├── [id]/
│   │   │       │   ├── messages/
│   │   │       │   │   └── route.ts
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   └── v1/
│   │       ├── accounts/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── swap-order/
│   │       │       └── route.ts
│   │       ├── analytics/
│   │       │   ├── advanced-charts/
│   │       │   │   └── route.ts
│   │       │   ├── balance-trend/
│   │       │   │   └── route.ts
│   │       │   ├── cashflow/
│   │       │   │   └── route.ts
│   │       │   ├── expenses-by-category/
│   │       │   │   └── route.ts
│   │       │   ├── income-expense-report/
│   │       │   │   └── route.ts
│   │       │   ├── income-vs-expenses/
│   │       │   │   └── route.ts
│   │       │   └── trends/
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
│   │       ├── backup/
│   │       │   ├── export/
│   │       │   │   └── route.ts
│   │       │   └── import/
│   │       │       └── route.ts
│   │       ├── budgets/
│   │       │   ├── [category_id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── status/
│   │       │       └── route.ts
│   │       ├── categories/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── tree/
│   │       │       └── route.ts
│   │       ├── debts/
│   │       │   ├── [id]/
│   │       │   │   ├── increase/
│   │       │   │   │   ├── [transactionId]/
│   │       │   │   │   │   └── route.ts
│   │       │   │   │   └── route.ts
│   │       │   │   ├── repayments/
│   │       │   │   │   └── route.ts
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── labels/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── saved-filters/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── reorder/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── transactions/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── bulk/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── transfers/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       └── user/
│   │           └── settings/
│   │               └── route.ts
│   ├── api-docs/
│   │   └── [[...scalar]]/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── docs/
│   ├── AI_GUIDE/
│   │   ├── 00_README.md
│   │   ├── 00A_UI_UX_REFERENCE.md
│   │   ├── 00B_CODE_PRINCIPLES.md
│   │   ├── 00C_QUICK_START_SUMMARY.md
│   │   ├── 01_PROJECT_STRUCTURE.md
│   │   ├── 01A_STRICT_CONFIGS.md
│   │   ├── 02_DATABASE_SCHEMA.md
│   │   ├── 03_AUTHENTICATION_SYSTEM.md
│   │   ├── 04_API_IMPLEMENTATION.md
│   │   ├── 05_FRONTEND_FOUNDATION.md
│   │   ├── 05A_FRONTEND_UI_OVERRIDE.md
│   │   ├── 06_CONTEXT_STATE_MANAGEMENT.md
│   │   ├── 07_DEFAULT_DATA_SEEDING.md
│   │   ├── 08_SERVICES_LAYER.md
│   │   ├── 09_CRITICAL_RULES.md
│   │   ├── 10_IMPLEMENTATION_CHECKLIST.md
│   │   ├── 10_IMPLEMENTATION_CHECKLIST_UPDATE_SUMMARY.md
│   │   ├── 11_BACKUP_RESTORE_FEATURE.md
│   │   ├── 12_THEME_SYSTEM.md
│   │   ├── 12A_THEME_API_ENDPOINTS.md
│   │   ├── 13_GOOGLE_SHEETS_INTEGRATION.md
│   │   ├── 13A_GOOGLE_SHEETS_FRONTEND_SERVICE.md
│   │   ├── 14_TESTING_REQUIREMENTS.md
│   │   ├── 15_GOOGLE_DRIVE_ATTACHMENTS.md
│   │   ├── 15A_GOOGLE_ECOSYSTEM_INTEGRATION.md
│   │   ├── LINK_VALIDATION_REPORT.md
│   │   └── LINK_VALIDATION_REPORT_V2.md
│   ├── DONE/
│   │   ├── 2025-11-22_ACCOUNT_CURRENCY_UPDATE_FIX.md
│   │   ├── 2025-11-22_ACCOUNT_UPDATE_CURRENCY_BUG_ANALYSIS.md
│   │   ├── 2025-11-22_ACCOUNTMODAL_CURRENCY_ANALYSIS.md
│   │   ├── 2025-11-22_API_ROUTES_ID_PARAMETER_FIX.md
│   │   ├── 2025-11-22_BALANCE_CALCULATION_ANALYSIS.md
│   │   ├── 2025-11-22_BALANCE_MIGRATION_PLAN.md
│   │   ├── 2025-11-22_BUGS_FOUND_DURING_TESTING.md
│   │   ├── 2025-11-22_CLEAN_COMMIT_PLAN.md
│   │   ├── 2025-11-22_COMPLETE_FIX_SUMMARY.md
│   │   ├── 2025-11-22_CURRENCY_ENHANCEMENT_PLAN.md
│   │   ├── 2025-11-22_INITIAL_BALANCE_BUG_ANALYSIS.md
│   │   ├── 2025-11-22_MIGRATION_GUIDE.md
│   │   ├── 2025-11-22_MIGRATION_INSTRUCTIONS.md
│   │   ├── 2025-11-22_REFACTORING.md
│   │   ├── 2025-11-22_SESSION_COMPLETE_SUMMARY.md
│   │   ├── 2025-11-22_TESTING_PLAN.md
│   │   ├── 2025-11-22_TESTING_SESSION_RESULTS.md
│   │   ├── 2025-11-22_TRANSACTIONMODAL_CURRENCY_ANALYSIS.md
│   │   ├── 2025-11-22_TRANSACTIONMODAL_CURRENCY_FIX.md
│   │   ├── 2025-11-23_BALANCE_MIGRATION_COMPLETE.md
│   │   ├── 2025-11-23_BALANCE_MIGRATION_PHASE_2_COMPLETE.md
│   │   ├── 2025-11-23_CURRENCY_IMPLEMENTATION_COMPLETE.md
│   │   ├── 2025-11-23_DASHBOARD_DISPLAY_BUG_FIX.md
│   │   ├── 2025-11-23_RECORDSLIST_TRANSFER_FIX.md
│   │   ├── 2025-11-23_SESSION_SUMMARY.md
│   │   ├── 2025-11-23_TRANSACTION_AMOUNT_SIGN_FIX.md
│   │   ├── 2025-11-23_TRANSACTION_UPDATE_FIX_SUMMARY.md
│   │   ├── 2025-11-23_TRANSFER_EDIT_COMPLETE.md
│   │   ├── 2025-11-23_TRANSFER_OPTIMIZATION_SUMMARY.md
│   │   ├── 2025-11-23_TRANSFER_UPDATE_FEATURE.md
│   │   ├── 2025-11-24_CURRENCY_FORMAT_UPDATE.md
│   │   ├── 2025-11-24_DASHBOARD_REFRESH_TESTING.md
│   │   ├── 2025-11-24_MCP_DATABASE_VALIDATION.md
│   │   ├── 2025-11-24_MCP_TESTING_SUMMARY.md
│   │   ├── 2025-11-24_MIGRATION_COMPLETED.md
│   │   ├── 2025-11-24_MIGRATION_STEPS.md
│   │   ├── 2025-11-24_TIMEZONE_MIGRATION_PLAN.md
│   │   ├── 2025-11-24_TIMEZONE_VALIDATION.md
│   │   ├── 2026-02-26_DEBTS_UI_DESIGN.md
│   │   ├── 2026-02-26_DEVELOPMENT_PLAN.md
│   │   ├── 2026-02-26_GLOBAL_TRANSACTION_MODAL.md
│   │   ├── 2026-02-26_PERSONAL_ID_REMOVAL_PLAN.md
│   │   ├── 2026-03-01_DEBTS_MANAGEMENT_PLAN.md
│   │   ├── 2026-03-13_SAVED_FILTERS_ENHANCEMENT.md
│   │   ├── cleanup-unused-db-tables-columns.md
│   │   └── remove-multiple-currency/
│   │       ├── phase-1-schema-migration.md
│   │       ├── phase-2-services-api.md
│   │       ├── phase-3-utils-hooks.md
│   │       ├── phase-4-ui-components.md
│   │       └── phase-5-cleanup.md
│   ├── ENV_FILES_GUIDE.md
│   ├── MAKEFILE_GUIDE.md
│   ├── SEED_GUIDE.md
│   ├── SETUP.md
│   └── TODO/
│       └── big-refactor/
│           ├── 00-INDEX.md
│           ├── 01-api-routes.md
│           ├── 02-services.md
│           ├── 03-hooks.md
│           ├── 04-components.md
│           ├── 05-pages.md
│           ├── 06-lib-utils-types-contexts.md
│           └── 07-schema-config.md
├── eslint-err.txt
├── eslint.config.mjs
├── generate-icons.js
├── lib/
├── LICENSE
├── Makefile
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── prisma/
│   ├── create_balance_index.sql
│   ├── fix-transaction-amounts.sql
│   ├── migrations/
│   │   ├── 20251121201137_init_with_cuid/
│   │   │   └── migration.sql
│   │   ├── 20251122214352_add_balance_calculation_index/
│   │   │   └── migration.sql
│   │   ├── 20251124230515_add_timezone_support/
│   │   │   └── migration.sql
│   │   ├── 20260103055647_add_google_sheets_sync/
│   │   │   └── migration.sql
│   │   ├── 20260103205658_add_code_field_for_simplified_sync/
│   │   │   └── migration.sql
│   │   ├── 20260203190828_add_credit_debt_models/
│   │   │   └── migration.sql
│   │   ├── 20260223220545_remove_personal_id/
│   │   │   └── migration.sql
│   │   ├── 20260225180454_add_debts_table/
│   │   │   └── migration.sql
│   │   ├── 20260307044231_optimize_accounts_get_index/
│   │   │   └── migration.sql
│   │   ├── 20260307044544_optimize_transactions_balance_query/
│   │   │   └── migration.sql
│   │   ├── 20260307051215_optimize_categories_get_index/
│   │   │   └── migration.sql
│   │   ├── 20260307060243_optimize_transactions_get_index/
│   │   │   └── migration.sql
│   │   ├── 20260428000000_add_analytic_flag/
│   │   │   └── migration.sql
│   │   ├── 20260428000002_add_missing_feature_tables/
│   │   │   └── migration.sql
│   │   ├── 20260506045000_add_context_to_saved_filter/
│   │   │   └── migration.sql
│   │   ├── 20260517000000_add_search_trgm_indexes/
│   │   │   └── migration.sql
│   │   ├── 20260604000000_add_has_ai_access/
│   │   │   └── migration.sql
│   │   ├── 20260604000001_add_ai_chat_tables/
│   │   │   └── migration.sql
│   │   ├── 20260608000000_add_transaction_is_draft/
│   │   │   └── migration.sql
│   │   ├── 20260624040000_remove_multi_currency_fields/
│   │   │   └── migration.sql
│   │   ├── 20260624080000_drop_unused_tables_and_columns/
│   │   │   └── migration.sql
│   │   ├── 20260624090000_drop_sync_feature/
│   │   │   └── migration.sql
│   │   ├── 20260624110000_drop_code_columns/
│   │   │   └── migration.sql
│   │   ├── 20260624120000_add_enums_fix_relations/
│   │   │   └── migration.sql
│   │   ├── 20260625030000_add_budget_to_saved_filter_context/
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── prisma.config.ts
├── public/
│   ├── favicon.ico
│   ├── images/
│   │   ├── app-preview.webp
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── logo-image-only.svg
│   ├── manifest.json
│   └── sw.js
├── README.md
├── reference/
├── scripts/
│   ├── fix-transaction-amounts.ts
│   └── gen-icons.ps1
├── src/
│   ├── components/
│   │   ├── accounts/
│   │   │   ├── AccountForm.tsx
│   │   │   ├── AccountModal.css
│   │   │   └── AccountModal.tsx
│   │   ├── AmountRangeFilter.tsx
│   │   ├── analytics/
│   │   │   ├── AdvancedChartsReport.tsx
│   │   │   ├── AIChatPanel.tsx
│   │   │   ├── AnalyticsSortDropdown.tsx
│   │   │   ├── AnalyticsToolbar.tsx
│   │   │   ├── BalanceTrendReport.tsx
│   │   │   ├── CashFlowReport.tsx
│   │   │   ├── CategoryTransactionsModal.tsx
│   │   │   └── IncomesExpensesReport.tsx
│   │   ├── AppLayout.css
│   │   ├── AppLayout.tsx
│   │   ├── budgets/
│   │   │   ├── BudgetConfigModal.tsx
│   │   │   └── BudgetProgressBar.tsx
│   │   ├── category/
│   │   │   ├── CategoryForm.tsx
│   │   │   ├── CategoryModal.css
│   │   │   ├── CategoryModal.tsx
│   │   │   ├── CategorySelect.tsx
│   │   │   ├── CategorySelectOption.tsx
│   │   │   ├── CategoryTreeView.tsx
│   │   │   ├── ColorPicker.tsx
│   │   │   ├── IconPicker.tsx
│   │   │   └── index.ts
│   │   ├── common/
│   │   │   ├── ClearButton.tsx
│   │   │   ├── CurrencyPicker.css
│   │   │   ├── EmptyState.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── SortDropdown.tsx
│   │   ├── dashboard/
│   │   │   ├── AccountCard.tsx
│   │   │   ├── WidgetCard.tsx
│   │   │   └── widgets/
│   │   │       ├── BalanceTrendWidget.tsx
│   │   │       ├── BudgetStatusWidget.tsx
│   │   │       ├── ExpensesByCategoryWidget.tsx
│   │   │       ├── IncomeVsExpensesWidget.tsx
│   │   │       ├── index.ts
│   │   │       ├── NetWorthWidget.css
│   │   │       └── NetWorthWidget.tsx
│   │   ├── debt/
│   │   │   ├── DebtCard.tsx
│   │   │   ├── DebtDetailModal.tsx
│   │   │   ├── DebtIncreaseModal.tsx
│   │   │   ├── DebtModal.tsx
│   │   │   ├── DebtSkeleton.tsx
│   │   │   ├── DebtTabPane.tsx
│   │   │   ├── DebtTypeToggle.tsx
│   │   │   ├── GlobalDebtModal.tsx
│   │   │   ├── index.ts
│   │   │   └── RepaymentModal.tsx
│   │   ├── FilterSidebar/
│   │   │   ├── AccountDropdown.tsx
│   │   │   ├── AccountDropdownItem.tsx
│   │   │   ├── CategoryDropdown.css
│   │   │   ├── CategoryDropdown.tsx
│   │   │   ├── CategoryDropdownItem.tsx
│   │   │   ├── FilterHeader.tsx
│   │   │   ├── FilterInputs.tsx
│   │   │   ├── FilterSidebar.css
│   │   │   ├── FilterSidebar.tsx
│   │   │   ├── FilterSidebar.types.ts
│   │   │   ├── FilterSidebar.utils.ts
│   │   │   ├── index.ts
│   │   │   ├── SavedFiltersManager.tsx
│   │   │   └── SortDropdown.tsx
│   │   ├── forms/
│   │   │   ├── index.ts
│   │   │   └── PasswordInput.tsx
│   │   ├── Header.css
│   │   ├── Header.tsx
│   │   ├── label/
│   │   │   ├── index.ts
│   │   │   └── LabelModal.tsx
│   │   ├── Loading.tsx
│   │   ├── modals/
│   │   │   ├── ErrorModal.tsx
│   │   │   ├── index.ts
│   │   │   └── SuccessModal.tsx
│   │   ├── period/
│   │   │   ├── MonthYearSelector.tsx
│   │   │   ├── PeriodNavigation.tsx
│   │   │   ├── periodNavigationContext.tsx
│   │   │   ├── PeriodRangeSelector.tsx
│   │   │   └── periodRangeUtils.ts
│   │   ├── ProtectedRoute.tsx
│   │   ├── Records/
│   │   │   ├── EditableRecordsList.tsx
│   │   │   ├── index.ts
│   │   │   ├── Records.css
│   │   │   ├── RecordsHeader.tsx
│   │   │   ├── RecordsList.tsx
│   │   │   └── RecordsSkeleton.tsx
│   │   ├── transaction/
│   │   │   ├── AccountSelect.tsx
│   │   │   ├── AmountInput.tsx
│   │   │   ├── index.ts
│   │   │   ├── LabelMultiSelect.tsx
│   │   │   ├── TransactionCategorySelect.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── TransactionModal.tsx
│   │   │   └── TransactionTypeToggle.tsx
│   │   ├── transactions/
│   │   │   └── GlobalTransactionModal.tsx
│   │   └── widgets/
│   │       ├── BalanceTrendChart.tsx
│   │       ├── BudgetStatusList.tsx
│   │       ├── CategoryPieChart.tsx
│   │       ├── IncomeExpenseBarChart.tsx
│   │       ├── index.ts
│   │       └── TransactionsList.tsx
│   ├── config/
│   │   └── locales.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── AuthStateContext.tsx
│   │   ├── DebtContext.tsx
│   │   ├── index.ts
│   │   ├── LocaleContext.tsx
│   │   ├── ToastContext.tsx
│   │   ├── TransactionContext.tsx
│   │   └── TransactionModalContext.tsx
│   ├── data/
│   │   ├── default_accounts.json
│   │   └── default_categories.json
│   ├── features/
│   │   ├── accounts/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── analytics/
│   │   │   ├── index.ts
│   │   │   └── services/
│   │   ├── auth/
│   │   │   ├── hooks/
│   │   │   │   └── index.ts
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   │   └── authService.ts
│   │   │   └── types/
│   │   │       └── auth.types.ts
│   │   ├── backup/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── budgets/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── categories/
│   │   │   ├── hooks/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── debts/
│   │   │   ├── hooks/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── labels/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   ├── transactions/
│   │   │   ├── hooks/
│   │   │   ├── index.ts
│   │   │   ├── services/
│   │   │   └── types/
│   │   └── transfers/
│   │       ├── index.ts
│   │       ├── services/
│   │       └── types/
│   ├── hooks/
│   │   ├── useAccountModal.ts
│   │   ├── useCategories.ts
│   │   ├── useFilterData.ts
│   │   ├── useFilteredCategories.ts
│   │   ├── useFormattedCurrency.ts
│   │   ├── useIncomeExpenseData.ts
│   │   ├── useLogin.ts
│   │   ├── useNetWorth.ts
│   │   ├── useRegister.ts
│   │   ├── useSavedFilters.ts
│   │   ├── useTransactionActions.ts
│   │   ├── useTransactionData.ts
│   │   └── useTransactionForm.ts
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── factory.ts
│   │   │   ├── formatters.ts
│   │   │   ├── providers/
│   │   │   │   ├── gemini.ts
│   │   │   │   └── swiftrouter.ts
│   │   │   ├── tools.ts
│   │   │   └── types.ts
│   │   ├── api/
│   │   │   ├── params.ts
│   │   │   ├── prisma-errors.ts
│   │   │   └── response.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   ├── middleware.ts
│   │   │   └── password.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   ├── eventBus.ts
│   │   ├── openapi/
│   │   │   ├── registry.ts
│   │   │   └── schemas/
│   │   │       ├── accounts.ts
│   │   │       ├── analytics.ts
│   │   │       ├── auth.ts
│   │   │       ├── backup.ts
│   │   │       ├── budgets.ts
│   │   │       ├── categories.ts
│   │   │       ├── debts.ts
│   │   │       ├── index.ts
│   │   │       ├── labels.ts
│   │   │       ├── savedFilters.ts
│   │   │       ├── settings.ts
│   │   │       ├── transactions.ts
│   │   │       └── transfers.ts
│   │   ├── timezone.ts
│   │   └── validation/
│   │       ├── auth.ts
│   │       ├── backupSchemas.ts
│   │       ├── category.ts
│   │       ├── debt.ts
│   │       ├── transaction.ts
│   │       └── transfer.ts
│   ├── mocks/
│   │   └── localStorageService.ts
│   ├── services/
│   │   ├── accountService.ts
│   │   ├── analyticsService.ts
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── backupService.ts
│   │   ├── balanceService.ts
│   │   ├── budgetService.ts
│   │   ├── categoryService.ts
│   │   ├── currencyFormatService.ts
│   │   ├── debtService.ts
│   │   ├── labelService.ts
│   │   ├── savedFilterService.ts
│   │   ├── transactionService.ts
│   │   └── transferService.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── backup.types.ts
│   │   ├── filter.types.ts
│   │   └── index.ts
│   └── utils/
│       ├── constants.ts
│       ├── crypto.ts
│       ├── formatters.ts
│       ├── iconResolver.tsx
│       ├── iconUtils.ts
│       ├── index.ts
│       ├── timezone.ts
│       └── transferUtils.ts
├── tailwind.config.ts
├── TREE.md
├── ts_errors.txt
└── tsconfig.json
```

- Directories: 181
- Files: 437
- Symlinks: 0
