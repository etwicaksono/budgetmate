# Split Large Components

## Objective
Refactor the 1700+ line Transactions.tsx into smaller, manageable, single-responsibility components.

## Implementation Prompt

```
Refactor src/features/transactions/Transactions.tsx into a modular structure:

CURRENT STATE:
- Single file with 1700+ lines
- Mixed responsibilities (data fetching, filtering, sorting, display, forms)
- Complex state management in one component
- Difficult to test and maintain

DESIRED STATE:
Create the following modular structure:

src/features/transactions/
├── Transactions.tsx (container, <200 lines)
├── components/
│   ├── TransactionList/
│   │   ├── index.tsx
│   │   ├── TransactionListItem.tsx
│   │   ├── TransactionListHeader.tsx
│   │   ├── TransactionListEmpty.tsx
│   │   └── TransactionListSkeleton.tsx
│   ├── TransactionFilters/
│   │   ├── index.tsx
│   │   ├── DateRangeFilter.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── AccountFilter.tsx
│   │   ├── AmountRangeFilter.tsx
│   │   └── TypeFilter.tsx
│   ├── TransactionForm/
│   │   ├── index.tsx
│   │   ├── TransactionFormFields.tsx
│   │   ├── TransactionFormValidation.tsx
│   │   └── QuickTransactionForm.tsx
│   ├── TransactionStats/
│   │   ├── index.tsx
│   │   ├── TransactionSummary.tsx
│   │   ├── TransactionChart.tsx
│   │   └── TransactionTrends.tsx
│   └── TransactionActions/
│       ├── index.tsx
│       ├── BulkActions.tsx
│       ├── ExportActions.tsx
│       └── SortControls.tsx
├── hooks/
│   ├── useTransactions.ts
│   ├── useTransactionFilters.ts
│   ├── useTransactionSort.ts
│   ├── useTransactionPagination.ts
│   ├── useTransactionSelection.ts
│   └── useTransactionForm.ts
├── utils/
│   ├── transactionHelpers.ts
│   ├── transactionFormatters.ts
│   ├── transactionValidators.ts
│   └── transactionCalculations.ts
├── types/
│   └── index.ts
└── constants/
    └── index.ts

REFACTORING STEPS:

1. Extract type definitions
2. Move business logic to custom hooks
3. Create small, focused components
4. Implement proper prop drilling prevention
5. Add proper memoization
6. Create unit tests for each module
```

## Component Breakdown

### Main Container (Transactions.tsx)
```typescript
// Maximum 200 lines
// Responsibilities:
- Layout orchestration
- Hook composition
- Provider setup
- Error boundary wrapper
```

### TransactionList Components
```typescript
// Each component < 100 lines
// Focused on display logic only
// Receive data via props
// Emit events upward
```

### Custom Hooks
```typescript
// useTransactions: Data fetching and caching
// useTransactionFilters: Filter state management
// useTransactionSort: Sorting logic
// useTransactionForm: Form state and validation
```

### Utility Functions
```typescript
// Pure functions only
// No side effects
// Fully tested
// Reusable across components
```

## Migration Strategy

1. **Phase 1**: Extract types and interfaces
2. **Phase 2**: Create utility functions
3. **Phase 3**: Build custom hooks
4. **Phase 4**: Create new component structure
5. **Phase 5**: Migrate logic piece by piece
6. **Phase 6**: Remove old component
7. **Phase 7**: Add tests

## Success Criteria
- [ ] No component exceeds 300 lines
- [ ] Each component has single responsibility
- [ ] All business logic in hooks or utils
- [ ] 80% test coverage achieved
- [ ] Performance improved (measured)
- [ ] Code is more maintainable
