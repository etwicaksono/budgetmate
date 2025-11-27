# Directory Tree: .

- Generated at: 2025-11-18T19:34:00Z
- Max depth: unlimited
- Follow symlinks: false
- Use .gitignore: true
- Exclude hidden: true

```text
finance-app/
├── app/
│   ├── (auth)/
│   │   ├── forgot-password/
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── accounts/
│   │   │   └── [id]/
│   │   ├── analytics/
│   │   ├── budgets/
│   │   ├── categories/
│   │   ├── settings/
│   │   └── transactions/
│   │       └── [id]/
│   ├── api/
│   │   └── v1/
│   │       ├── accounts/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── swap-order/
│   │       ├── analytics/
│   │       │   ├── cashflow/
│   │       │   ├── expenses-by-category/
│   │       │   ├── summary/
│   │       │   └── trends/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts
│   │       │   ├── logout/
│   │       │   │   └── route.ts
│   │       │   ├── refresh/
│   │       │   │   └── route.ts
│   │       │   └── register/
│   │       │       └── route.ts
│   │       ├── budgets/
│   │       │   ├── [id]/
│   │       │   └── status/
│   │       ├── categories/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   ├── swap-order/
│   │       │   └── tree/
│   │       │       └── route.ts
│   │       ├── groups/
│   │       │   └── [id]/
│   │       ├── labels/
│   │       │   └── [id]/
│   │       ├── personal-ids/
│   │       │   └── max/
│   │       │       └── route.ts
│   │       ├── transactions/
│   │       │   ├── [id]/
│   │       │   │   └── route.ts
│   │       │   ├── route.ts
│   │       │   └── summary/
│   │       └── transfers/
│   │           ├── [id]/
│   │           │   └── route.ts
│   │           └── route.ts
│   ├── dashboard/
│   │   ├── accounts/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   ├── categories/
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── transactions/
│   │   │   └── page.tsx
│   │   └── transfers/
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── eslint.config.mjs
├── next.config.js
├── package-lock.json
├── package.json
├── postcss.config.js
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── fonts/
│   ├── icons/
│   └── images/
├── README.md
├── REFACTORING.md
├── SETUP.md
├── src/
│   ├── components/
│   │   ├── charts/
│   │   ├── common/
│   │   │   ├── Card.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── FilterSelect.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── Pagination.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── features/
│   │   ├── Header.tsx
│   │   ├── layout/
│   │   ├── ProtectedRoute.tsx
│   │   ├── Sidebar.tsx
│   │   └── TransactionModal.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── AuthStateContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── TransactionModalContext.tsx
│   ├── data/
│   │   ├── default_accounts.json
│   │   └── default_categories.json
│   ├── hooks/
│   │   ├── useAccounts.ts
│   │   ├── useCategories.ts
│   │   └── useTransactions.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── errors.ts
│   │   │   ├── pagination.ts
│   │   │   └── response.ts
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   ├── middleware.ts
│   │   │   └── password.ts
│   │   ├── db/
│   │   │   └── prisma.ts
│   │   └── validation/
│   │       ├── auth.ts
│   │       ├── category.ts
│   │       ├── transaction.ts
│   │       └── transfer.ts
│   ├── services/
│   │   ├── accountService.ts
│   │   ├── analyticsService.ts
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── categoryService.ts
│   │   ├── transactionService.ts
│   │   └── transferService.ts
│   ├── styles/
│   ├── types/
│   └── utils/
│       ├── cn.ts
│       ├── constants.ts
│       ├── crypto.ts
│       └── formatters.ts
├── tailwind.config.ts
├── tests/
│   ├── e2e/
│   ├── integration/
│   │   ├── api/
│   │   └── db/
│   └── unit/
│       ├── hooks/
│       ├── services/
│       └── utils/
└── tsconfig.json
```

- Directories: 88
- Files: 81
- Symlinks: 0
