# Code Quality Issues - Fix Implementation Prompts

## Overview
This document contains ready-to-use prompts for fixing all identified code quality issues in the Finance Web Application. Each prompt is self-contained and can be executed independently.

---

## 🚨 PRIORITY 1: Remove Console Logs and Implement Logging Service

### Prompt 1: Create Logging Service
```
Create a professional logging service for the Finance Web Application with the following requirements:

1. Create src/utils/logger.ts with these features:
   - Support log levels: debug, info, warn, error
   - Only log to console in development mode
   - In production, queue logs for potential remote logging service
   - Include timestamp, level, and context in log entries
   - Implement log formatting for better readability
   - Add ability to disable specific log levels via environment variables

2. The logger should:
   - Use singleton pattern
   - Be type-safe with TypeScript
   - Support structured logging with metadata
   - Sanitize sensitive data (passwords, tokens) from logs
   - Support different transports (console, file, remote)

3. Create corresponding TypeScript types in src/types/logger.ts

Example usage should be:
logger.debug('User login attempt', { email: user.email });
logger.error('API call failed', { endpoint, error });
```

### Prompt 2: Replace Console Logs
```
Replace all console.log, console.error, console.warn statements in the following files with the new logging service:

Files to update:
- src/views/settings/Currencies.tsx (line 32)
- src/views/Register/Register.tsx (line 107)
- src/views/Login/Login.tsx (lines 81, 90, 111)
- src/views/Dashboard/Dashboard.tsx (lines 45, 94, 421)
- src/views/Accounts/Accounts.tsx (lines 326, 421, 551)
- src/views/Accounts/AccountDetail.tsx (lines 204, 252, 255, 269, 271, 283, 286, 296, 343)

Rules for replacement:
1. console.log → logger.debug (for development info)
2. console.warn → logger.warn (for warnings)
3. console.error → logger.error (for errors)
4. Remove sensitive data from logs (passwords, full tokens)
5. Add contextual information to each log
6. For user actions, use logger.info
7. For system errors, include stack trace

Example transformations:
// Before:
console.log('Login attempt with:', { email, password });
// After:
logger.info('User login attempt', { email, timestamp: new Date().toISOString() });

// Before:
console.error('Registration failed:', error);
// After:
logger.error('User registration failed', { 
  error: error.message, 
  stack: error.stack,
  endpoint: '/api/register' 
});
```

---

## 🔧 PRIORITY 2: Improve Error Handling

### Prompt 3: Standardize Error Handling
```
Implement standardized error handling across all service files:

1. Create src/utils/errors.ts with custom error classes:
   - ApiError (for API-related errors)
   - ValidationError (for input validation)
   - AuthenticationError (for auth issues)
   - NetworkError (for connection issues)
   - BusinessLogicError (for domain-specific errors)

2. Each error class should include:
   - Error code (for i18n)
   - User-friendly message
   - Technical details for logging
   - HTTP status code mapping
   - Retry capability flag

3. Update all try-catch blocks in services/ directory:
   - Replace generic catch with specific error handling
   - Map API errors to custom error classes
   - Include error recovery strategies
   - Add retry logic for transient failures

4. Create error boundary components:
   - Global error boundary in app/layout.tsx
   - Feature-specific boundaries for critical sections
   - Fallback UI components for error states

Example implementation:
try {
  const response = await api.post('/login', credentials);
  return response.data;
} catch (error) {
  if (error.response?.status === 401) {
    throw new AuthenticationError('Invalid credentials', { 
      code: 'AUTH_INVALID_CREDS',
      details: error.response.data 
    });
  } else if (error.code === 'ECONNREFUSED') {
    throw new NetworkError('Server unavailable', {
      code: 'NETWORK_UNAVAILABLE',
      retryable: true
    });
  }
  throw new ApiError('Login failed', { 
    originalError: error,
    code: 'API_UNKNOWN_ERROR' 
  });
}
```

### Prompt 4: Add Error Recovery
```
Implement error recovery mechanisms:

1. Create src/hooks/useErrorRecovery.ts:
   - Automatic retry logic with exponential backoff
   - Circuit breaker pattern for failing services
   - Fallback to cached data when available
   - Queue failed requests for later retry

2. Add error recovery UI components:
   - Retry buttons with loading states
   - Offline mode indicators
   - Error toast notifications with actions
   - Detailed error modals for technical users

3. Implement graceful degradation:
   - Show cached data with "stale" indicator
   - Disable features that depend on failed services
   - Provide alternative workflows when possible
```

---

## 🏗️ PRIORITY 3: Component Refactoring

### Prompt 5: Split Large Components
```
Refactor src/features/transactions/Transactions.tsx (1700+ lines) into smaller, manageable components:

1. Create the following file structure:
src/features/transactions/
├── Transactions.tsx (main container, max 200 lines)
├── components/
│   ├── TransactionList/
│   │   ├── index.tsx
│   │   ├── TransactionListItem.tsx
│   │   ├── TransactionListHeader.tsx
│   │   └── TransactionListEmpty.tsx
│   ├── TransactionFilters/
│   │   ├── index.tsx
│   │   ├── DateRangeFilter.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── AccountFilter.tsx
│   │   └── AmountRangeFilter.tsx
│   ├── TransactionForm/
│   │   ├── index.tsx
│   │   ├── TransactionFormFields.tsx
│   │   ├── TransactionFormValidation.tsx
│   │   └── TransactionFormSubmit.tsx
│   └── TransactionStats/
│       ├── index.tsx
│       ├── TransactionSummary.tsx
│       └── TransactionChart.tsx
├── hooks/
│   ├── useTransactions.ts (data fetching)
│   ├── useTransactionFilters.ts (filter state)
│   ├── useTransactionSort.ts (sorting logic)
│   ├── useTransactionPagination.ts (pagination)
│   └── useTransactionSelection.ts (multi-select)
├── utils/
│   ├── transactionHelpers.ts (pure functions)
│   ├── transactionValidation.ts (validation rules)
│   └── transactionFormatters.ts (display formatting)
└── types/
    └── index.ts (TypeScript interfaces)

2. Extract logic into custom hooks:
   - Move API calls to useTransactions hook
   - Extract filter logic to useTransactionFilters
   - Move sorting logic to useTransactionSort
   - Extract form handling to useTransactionForm

3. Apply single responsibility principle:
   - Each component should have one clear purpose
   - Props should be minimal and well-typed
   - Business logic separated from presentation
```

### Prompt 6: Implement Component Best Practices
```
Apply React best practices to all components:

1. Add proper TypeScript types:
   - Define Props interfaces for all components
   - Use discriminated unions for conditional props
   - Avoid 'any' type, use 'unknown' with type guards
   - Export shared types from types/index.ts

2. Optimize performance:
   - Wrap expensive components with React.memo
   - Use useMemo for expensive calculations
   - Use useCallback for event handlers passed as props
   - Implement virtual scrolling for long lists

3. Improve component composition:
   - Use compound components pattern for related UI
   - Implement render props for flexible rendering
   - Use composition over inheritance
   - Create HOCs for cross-cutting concerns

Example refactoring:
// Before: Mixed concerns, no types
function TransactionItem({ transaction, onEdit, onDelete }) {
  // 200+ lines of mixed logic
}

// After: Separated concerns, fully typed
interface TransactionItemProps {
  transaction: Transaction;
  onAction: (action: TransactionAction) => void;
  isSelected?: boolean;
  isReadOnly?: boolean;
}

const TransactionItem = React.memo<TransactionItemProps>(({ 
  transaction, 
  onAction, 
  isSelected = false,
  isReadOnly = false 
}) => {
  // Clean, focused component logic
});
```

---

## 📊 PRIORITY 4: State Management Improvements

### Prompt 7: Optimize Context Usage
```
Optimize React Context usage to prevent unnecessary re-renders:

1. Split large contexts into smaller, focused ones:
   - AuthContext (authentication only)
   - UserContext (user profile data)
   - UIContext (UI state like modals, theme)
   - DataContext (cached application data)

2. Implement context selectors pattern:
   - Create useContextSelector hook
   - Only re-render when selected values change
   - Use shallow comparison for objects

3. Move frequently changing state out of context:
   - Use local state for component-specific data
   - Use React Query for server state
   - Consider Zustand for complex client state

Example implementation:
// Create focused contexts
const TransactionFilterContext = createContext<FilterState>();
const TransactionDataContext = createContext<DataState>();

// Use selector pattern
const useTransactionFilter = <T,>(selector: (state: FilterState) => T) => {
  const state = useContext(TransactionFilterContext);
  return useMemo(() => selector(state), [state, selector]);
};

// Usage
const activeFilters = useTransactionFilter(state => state.activeFilters);
```

---

## 🎯 PRIORITY 5: Type Safety Enhancements

### Prompt 8: Implement Strict TypeScript
```
Enhance TypeScript configuration and fix type issues:

1. Update tsconfig.json with stricter settings:
   - "noImplicitAny": true
   - "strictNullChecks": true
   - "strictFunctionTypes": true
   - "noImplicitReturns": true
   - "noFallthroughCasesInSwitch": true
   - "noUnusedLocals": true
   - "noUnusedParameters": true

2. Create comprehensive type definitions:
   src/types/
   ├── api.types.ts (API request/response types)
   ├── domain.types.ts (business domain types)
   ├── ui.types.ts (UI component types)
   └── utils.types.ts (utility function types)

3. Replace all 'any' types:
   - Use unknown with proper type guards
   - Create specific interfaces for objects
   - Use generics for reusable types
   - Add JSDoc comments for complex types

4. Implement type guards:
   - Create isTransaction, isAccount, etc.
   - Use zod for runtime validation
   - Add type predicates for narrowing

Example:
// Type guard
export function isTransaction(value: unknown): value is Transaction {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'amount' in value &&
    'type' in value
  );
}

// Generic type for API responses
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
  errors?: ValidationError[];
}
```

---

## 🔄 PRIORITY 6: Consistent Patterns

### Prompt 9: Standardize Code Patterns
```
Establish and implement consistent patterns across the codebase:

1. File naming conventions:
   - Components: PascalCase (UserProfile.tsx)
   - Hooks: camelCase starting with 'use' (useUserData.ts)
   - Utils: camelCase (formatCurrency.ts)
   - Types: PascalCase with .types.ts (User.types.ts)
   - Constants: UPPER_SNAKE_CASE in constants.ts

2. Component structure pattern:
   // Standard component file structure
   // 1. Imports
   import React from 'react';
   import { useHook } from './hooks';
   import { ChildComponent } from './components';
   import type { ComponentProps } from './types';
   
   // 2. Types/Interfaces
   interface Props { /* ... */ }
   
   // 3. Constants
   const DEFAULT_VALUE = 10;
   
   // 4. Component
   export const Component: React.FC<Props> = ({ prop }) => {
     // 5. Hooks
     // 6. State
     // 7. Effects
     // 8. Handlers
     // 9. Render helpers
     // 10. Return JSX
   };
   
   // 11. Export
   export default Component;

3. Service method patterns:
   - Always return { data, error } tuple
   - Use async/await consistently
   - Include request cancellation
   - Add response transformation

4. Hook patterns:
   - Return consistent shape: { data, loading, error, refetch }
   - Include cleanup in useEffect
   - Memoize expensive operations
   - Document with JSDoc

5. Error message patterns:
   - User-facing: "Unable to save your changes. Please try again."
   - Technical: Include error code and details
   - Consistent format across app
```

---

## 📝 Implementation Checklist

### Phase 1: Logging (Day 1-2)
- [ ] Create logger service
- [ ] Replace all console statements
- [ ] Add environment-based log levels
- [ ] Test logging in development and production modes

### Phase 2: Error Handling (Day 3-4)
- [ ] Create custom error classes
- [ ] Update all try-catch blocks
- [ ] Add error boundaries
- [ ] Implement recovery mechanisms

### Phase 3: Component Refactoring (Day 5-7)
- [ ] Split Transactions.tsx
- [ ] Extract custom hooks
- [ ] Apply performance optimizations
- [ ] Add proper TypeScript types

### Phase 4: State Management (Day 8-9)
- [ ] Split contexts
- [ ] Implement selectors
- [ ] Optimize re-renders
- [ ] Add state persistence

### Phase 5: Type Safety (Day 10-11)
- [ ] Enable strict TypeScript
- [ ] Fix all type errors
- [ ] Add type guards
- [ ] Document complex types

### Phase 6: Pattern Standardization (Day 12)
- [ ] Apply naming conventions
- [ ] Standardize component structure
- [ ] Update service patterns
- [ ] Create developer guidelines

---

## 🎬 Execution Commands

```bash
# Run these commands to start fixing issues:

# 1. Install required dependencies
npm install winston pino zod

# 2. Run TypeScript compiler to find type issues
npx tsc --noEmit

# 3. Find all console.log occurrences
grep -r "console\." src/ --include="*.tsx" --include="*.ts"

# 4. Generate component dependency graph
npx madge --circular src/

# 5. Check for unused exports
npx ts-prune

# 6. Find large files that need splitting
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20
```

---

## 📚 Additional Resources

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Error Handling Best Practices](https://www.toptal.com/react/react-error-handling)
- [Component Patterns](https://www.patterns.dev/posts/react-patterns)

---

*Generated: November 3, 2025*  
*Ready for immediate implementation*
