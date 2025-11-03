# Dependencies Concerns - Fix Implementation Prompts

## Overview
This document contains ready-to-use prompts for fixing all dependency-related issues in the Finance Web Application. Each section includes installation commands, configuration files, and implementation examples.

---

## 🧪 PRIORITY 1: Testing Infrastructure

### Prompt 1: Install and Configure Jest with React Testing Library
```
Set up comprehensive testing infrastructure for the Finance Web Application:

1. Install testing dependencies:
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest jest-environment-jsdom @testing-library/react-hooks msw whatwg-fetch

2. Create jest.config.js in the root directory:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/index.{js,ts}',
  ],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/out/', '/build/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-icons|@dnd-kit)/)',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

3. Create jest.setup.js:
```javascript
import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000/api'
process.env.NEXT_PUBLIC_APP_NAME = 'Test Finance App'

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
```

4. Create test utilities (src/test-utils/index.tsx):
```typescript
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/context/AuthContext'

interface AllProvidersProps {
  children: React.ReactNode
}

function AllProviders({ children }: AllProvidersProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'
```

5. Update package.json scripts:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```
```

### Prompt 2: Create Initial Test Suite
```
Create comprehensive test files for critical components and services:

1. Create test for API service (src/services/__tests__/api.test.ts):
```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { apiClient, handleApiError } from '../api'

const server = setupServer(
  rest.get('/api/test', (req, res, ctx) => {
    return res(ctx.json({ data: 'test' }))
  }),
  rest.post('/api/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Server error' }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('API Service', () => {
  describe('apiClient', () => {
    it('should make successful GET request', async () => {
      const response = await apiClient.get('/test')
      expect(response.data).toEqual({ data: 'test' })
    })

    it('should handle API errors', async () => {
      await expect(apiClient.post('/error')).rejects.toThrow()
    })
  })

  describe('handleApiError', () => {
    it('should format error messages correctly', () => {
      const error = { response: { data: { message: 'Error' } } }
      const result = handleApiError(error)
      expect(result).toContain('Error')
    })
  })
})
```

2. Create test for Auth Context (src/context/__tests__/AuthContext.test.tsx):
```typescript
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import * as authService from '@/services/authService'

jest.mock('@/services/authService')

describe('AuthContext', () => {
  it('should handle login successfully', async () => {
    const mockLogin = jest.spyOn(authService, 'login').mockResolvedValue({
      data: { access_token: 'token', user: { id: 1, email: 'test@test.com' } }
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    await act(async () => {
      await result.current.login({ email: 'test@test.com', password: 'password' })
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual({ id: 1, email: 'test@test.com' })
    })
  })

  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
```

3. Create component test example (src/components/__tests__/Button.test.tsx):
```typescript
import { render, screen, fireEvent } from '@/test-utils'
import Button from '../Button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })
})
```
```

---

## 🛠️ PRIORITY 2: Development Tools

### Prompt 3: Install and Configure Prettier
```
Set up Prettier for consistent code formatting:

1. Install Prettier:
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier

2. Create .prettierrc.json:
```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "jsxSingleQuote": false,
  "jsxBracketSameLine": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css"
}
```

3. Create .prettierignore:
```
node_modules
.next
out
build
coverage
dist
.git
*.log
package-lock.json
pnpm-lock.yaml
yarn.lock
*.min.js
*.min.css
```

4. Update .eslintrc.cjs to integrate Prettier:
```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    node: true,
    es2020: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals',
    'prettier',
    'plugin:prettier/recommended', // Must be last
  ],
  plugins: ['react', '@typescript-eslint', 'jsx-a11y', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
```

5. Add formatting scripts to package.json:
```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "next lint",
    "lint:fix": "next lint --fix"
  }
}
```
```

### Prompt 4: Set up Husky and Pre-commit Hooks
```
Configure Git hooks for code quality enforcement:

1. Install Husky and lint-staged:
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional

2. Initialize Husky:
npx husky-init && npm install

3. Create .husky/pre-commit:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

4. Create .husky/commit-msg:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

5. Create .husky/pre-push:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:ci
npm run build
```

6. Configure lint-staged in package.json:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests --passWithNoTests"
    ],
    "*.{json,md,mdx,css,scss}": [
      "prettier --write"
    ]
  }
}
```

7. Create commitlint.config.js:
```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Test changes
        'chore',    // Maintenance tasks
        'revert',   // Revert commits
        'build',    // Build system changes
        'ci',       // CI configuration changes
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-min-length': [2, 'always', 5],
    'subject-max-length': [2, 'always', 72],
  },
}
```
```

---

## 📊 PRIORITY 3: State Management

### Prompt 5: Install and Configure Zustand
```
Set up Zustand for efficient state management:

1. Install Zustand:
npm install zustand immer zustand/middleware

2. Create store structure (src/store/index.ts):
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createAuthSlice, AuthSlice } from './slices/authSlice'
import { createTransactionSlice, TransactionSlice } from './slices/transactionSlice'
import { createAccountSlice, AccountSlice } from './slices/accountSlice'
import { createUISlice, UISlice } from './slices/uiSlice'

export type StoreState = AuthSlice & TransactionSlice & AccountSlice & UISlice

export const useStore = create<StoreState>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createAuthSlice(...a),
        ...createTransactionSlice(...a),
        ...createAccountSlice(...a),
        ...createUISlice(...a),
      })),
      {
        name: 'finance-app-storage',
        partialize: (state) => ({
          // Only persist auth and UI preferences
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    )
  )
)

// Selectors
export const useAuth = () => useStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  user: state.user,
  login: state.login,
  logout: state.logout,
}))

export const useTransactions = () => useStore((state) => ({
  transactions: state.transactions,
  loading: state.transactionsLoading,
  filters: state.transactionFilters,
  setFilters: state.setTransactionFilters,
  fetchTransactions: state.fetchTransactions,
}))
```

3. Create auth slice (src/store/slices/authSlice.ts):
```typescript
import { StateCreator } from 'zustand'
import { authService } from '@/services/authService'
import type { User, LoginCredentials } from '@/types'

export interface AuthSlice {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
  error: string | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  clearError: () => void
}

export const createAuthSlice: StateCreator<
  AuthSlice,
  [],
  [],
  AuthSlice
> = (set) => ({
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,

  login: async (credentials) => {
    set((state) => {
      state.loading = true
      state.error = null
    })

    try {
      const response = await authService.login(credentials)
      set((state) => {
        state.isAuthenticated = true
        state.user = response.user
        state.loading = false
      })
    } catch (error) {
      set((state) => {
        state.error = error.message
        state.loading = false
      })
      throw error
    }
  },

  logout: () => {
    authService.logout()
    set((state) => {
      state.isAuthenticated = false
      state.user = null
      state.error = null
    })
  },

  refreshToken: async () => {
    try {
      const response = await authService.refreshToken()
      set((state) => {
        state.user = response.user
      })
    } catch {
      set((state) => {
        state.isAuthenticated = false
        state.user = null
      })
    }
  },

  clearError: () => {
    set((state) => {
      state.error = null
    })
  },
})
```

4. Create provider wrapper (src/providers/StoreProvider.tsx):
```typescript
import { useRef, useEffect } from 'react'
import { useStore } from '@/store'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false)
  const refreshToken = useStore((state) => state.refreshToken)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      // Initialize store, refresh auth token, etc.
      refreshToken()
    }
  }, [refreshToken])

  return <>{children}</>
}
```
```

### Prompt 6: Alternative - Redux Toolkit Setup
```
Alternative state management with Redux Toolkit:

1. Install Redux Toolkit:
npm install @reduxjs/toolkit react-redux redux-persist

2. Create store configuration (src/store/index.ts):
```typescript
import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import authReducer from './slices/authSlice'
import transactionReducer from './slices/transactionSlice'
import accountReducer from './slices/accountSlice'
import uiReducer from './slices/uiSlice'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui'], // Only persist auth and UI state
}

const rootReducer = {
  auth: authReducer,
  transactions: transactionReducer,
  accounts: accountReducer,
  ui: uiReducer,
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```
```

---

## 🔄 PRIORITY 4: Data Fetching & Caching

### Prompt 7: Install and Configure React Query (TanStack Query)
```
Set up React Query for server state management:

1. Install React Query:
npm install @tanstack/react-query @tanstack/react-query-devtools

2. Create query client configuration (src/lib/react-query.ts):
```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
})

// Query keys factory
export const queryKeys = {
  all: ['finance'] as const,
  auth: () => [...queryKeys.all, 'auth'] as const,
  accounts: () => [...queryKeys.all, 'accounts'] as const,
  account: (id: string) => [...queryKeys.accounts(), id] as const,
  transactions: () => [...queryKeys.all, 'transactions'] as const,
  transaction: (id: string) => [...queryKeys.transactions(), id] as const,
  transactionsByFilter: (filters: Record<string, any>) => 
    [...queryKeys.transactions(), { filters }] as const,
  categories: () => [...queryKeys.all, 'categories'] as const,
  budgets: () => [...queryKeys.all, 'budgets'] as const,
  budget: (id: string) => [...queryKeys.budgets(), id] as const,
  reports: (type: string) => [...queryKeys.all, 'reports', type] as const,
}
```

3. Create custom hooks for data fetching (src/hooks/queries/useAccounts.ts):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountService } from '@/services/accountService'
import { queryKeys } from '@/lib/react-query'
import type { Account, CreateAccountDto, UpdateAccountDto } from '@/types'

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts(),
    queryFn: accountService.getAccounts,
    select: (data) => data.sort((a, b) => a.order - b.order),
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: queryKeys.account(id),
    queryFn: () => accountService.getAccount(id),
    enabled: !!id,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateAccountDto) => accountService.createAccount(data),
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.setQueryData(
        queryKeys.account(newAccount.id),
        newAccount
      )
    },
    onError: (error) => {
      console.error('Failed to create account:', error)
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountDto }) =>
      accountService.updateAccount(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.account(id) })
      const previousAccount = queryClient.getQueryData(queryKeys.account(id))
      
      queryClient.setQueryData(queryKeys.account(id), (old: Account) => ({
        ...old,
        ...data,
      }))
      
      return { previousAccount }
    },
    onError: (err, { id }, context) => {
      if (context?.previousAccount) {
        queryClient.setQueryData(
          queryKeys.account(id),
          context.previousAccount
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts() })
      queryClient.removeQueries({ queryKey: queryKeys.account(id) })
    },
  })
}
```

4. Add React Query Provider (app/providers.tsx):
```typescript
'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/react-query'
import { AuthProvider } from '@/context/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
```

5. Implement infinite query for transactions (src/hooks/queries/useTransactions.ts):
```typescript
import { useInfiniteQuery } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { queryKeys } from '@/lib/react-query'

export function useInfiniteTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactionsByFilter(filters),
    queryFn: ({ pageParam = 1 }) =>
      transactionService.getTransactions({
        ...filters,
        page: pageParam,
        limit: 20,
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.length + 1
      }
      return undefined
    },
    keepPreviousData: true,
  })
}
```
```

---

## 📈 PRIORITY 5: Performance Monitoring

### Prompt 8: Install Bundle Analyzer and Performance Tools
```
Set up tools for monitoring and optimizing application performance:

1. Install bundle analyzer:
npm install --save-dev @next/bundle-analyzer webpack-bundle-analyzer

2. Configure bundle analyzer (next.config.js):
```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  swcMinify: true,
  
  webpack: (config, { isServer }) => {
    // Custom webpack configuration
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, 'src'),
      }
    }
    
    // Add webpack bundle analyzer for detailed analysis
    if (process.env.ANALYZE_DETAILED === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      )
    }
    
    return config
  },
  
  // Optimize images
  images: {
    domains: ['localhost', 'api.example.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features
  experimental: {
    optimizeFonts: true,
    optimizeCss: true,
  },
})
```

3. Add performance monitoring (src/utils/performance.ts):
```typescript
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  measureComponent(componentName: string, callback: () => void): void {
    const startTime = performance.now()
    callback()
    const endTime = performance.now()
    const duration = endTime - startTime

    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, [])
    }
    this.metrics.get(componentName)!.push(duration)

    if (process.env.NODE_ENV === 'development') {
      console.debug(`${componentName} render time: ${duration.toFixed(2)}ms`)
    }
  }

  getAverageRenderTime(componentName: string): number | null {
    const times = this.metrics.get(componentName)
    if (!times || times.length === 0) return null

    const average = times.reduce((a, b) => a + b, 0) / times.length
    return average
  }

  reportWebVitals(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // First Contentful Paint
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      
      // Largest Contentful Paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.debug('LCP:', lastEntry.startTime)
      })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })

      // Time to Interactive
      if ('PerformanceObserver' in window) {
        const tti = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            console.debug('TTI:', entry.startTime)
          })
        })
        tti.observe({ entryTypes: ['measure'] })
      }

      if (fcp) {
        console.debug('FCP:', fcp.startTime)
      }
    }
  }

  clearMetrics(): void {
    this.metrics.clear()
  }
}

// Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance()

  useEffect(() => {
    monitor.measureComponent(componentName, () => {})
    return () => {
      const avgTime = monitor.getAverageRenderTime(componentName)
      if (avgTime && avgTime > 16.67) { // More than 1 frame (60fps)
        console.warn(`${componentName} average render time: ${avgTime.toFixed(2)}ms`)
      }
    }
  }, [componentName, monitor])
}
```

4. Add scripts to package.json:
```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "analyze:detailed": "ANALYZE_DETAILED=true next build",
    "lighthouse": "lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html"
  }
}
```
```

---

## 🚀 PRIORITY 6: Additional Development Dependencies

### Prompt 9: Install Utility Libraries
```
Install essential utility libraries for better development experience:

1. Install utility packages:
npm install --save-dev 
  @types/node 
  cross-env 
  dotenv-cli 
  npm-run-all 
  rimraf 
  ts-node 
  tsconfig-paths

npm install 
  clsx 
  date-fns 
  lodash 
  zod 
  axios 
  swr 
  react-hook-form 
  @hookform/resolvers

2. Install type definitions:
npm install --save-dev 
  @types/lodash 
  @types/react-color

3. Create utility scripts (package.json):
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:turbo": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "clean": "rimraf .next out coverage",
    "clean:all": "npm run clean && rimraf node_modules",
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "validate": "npm-run-all --parallel type-check lint test:ci",
    "prepare": "husky install",
    "postinstall": "npm run prepare"
  }
}
```

4. Create environment validation (src/config/env.ts):
```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Required environment variables
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1),
  
  // Optional with defaults
  NEXT_PUBLIC_MODAL_TIMEOUT: z.string().transform(Number).default('3000'),
  NEXT_PUBLIC_CRYPTO_ALGORITHM: z.string().default('AES-GCM'),
  
  // Development only
  ANALYZE: z.string().optional(),
  ANALYZE_DETAILED: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

export const env = envSchema.parse(process.env)

// Type-safe environment variable access
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key]
}
```

5. Create form validation example (src/components/forms/AccountForm.tsx):
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(50),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  balance: z.number().min(0, 'Balance cannot be negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
})

type AccountFormData = z.infer<typeof accountSchema>

export function AccountForm({ onSubmit }: { onSubmit: (data: AccountFormData) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      type: 'checking',
      balance: 0,
      currency: 'USD',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
      
      <select {...register('type')}>
        <option value="checking">Checking</option>
        <option value="savings">Savings</option>
        <option value="credit">Credit Card</option>
        <option value="investment">Investment</option>
      </select>
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  )
}
```
```

---

## 📦 Complete Dependencies List

### Production Dependencies
```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@floating-ui/react": "^0.27.16",
    "@hookform/resolvers": "^3.3.4",
    "@tanstack/react-query": "^5.20.0",
    "axios": "^1.6.7",
    "bootstrap": "^5.3.8",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "immer": "^10.0.3",
    "lodash": "^4.17.21",
    "next": "^16.0.0",
    "rc-slider": "^11.1.9",
    "react": "^18.3.1",
    "react-bootstrap": "^2.10.10",
    "react-color": "^2.19.3",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.49.3",
    "react-icons": "^5.5.0",
    "recharts": "^3.3.0",
    "sweetalert2": "^11.26.3",
    "swr": "^2.2.5",
    "zod": "^3.22.4",
    "zustand": "^4.5.0"
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@commitlint/cli": "^18.6.0",
    "@commitlint/config-conventional": "^18.6.0",
    "@next/bundle-analyzer": "^14.1.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/react-hooks": "^8.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/jest": "^29.5.11",
    "@types/lodash": "^4.14.202",
    "@types/node": "^20.11.30",
    "@types/react": "^18.0.28",
    "@types/react-color": "^3.0.11",
    "@types/react-dom": "^18.0.11",
    "@typescript-eslint/eslint-plugin": "^8.46.2",
    "@typescript-eslint/parser": "^8.46.2",
    "cross-env": "^7.0.3",
    "dotenv-cli": "^7.3.0",
    "eslint": "^9.38.0",
    "eslint-config-next": "^16.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-jsx-a11y": "^6.8.0",
    "eslint-plugin-prettier": "^5.1.3",
    "husky": "^9.0.10",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "lint-staged": "^15.2.2",
    "msw": "^2.1.5",
    "npm-run-all": "^4.1.5",
    "prettier": "^3.2.5",
    "rimraf": "^5.0.5",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.5.4",
    "webpack-bundle-analyzer": "^4.10.1",
    "whatwg-fetch": "^3.6.20"
  }
}
```

---

## 🎯 Implementation Checklist

### Immediate Actions (Day 1)
- [ ] Install all testing dependencies
- [ ] Configure Jest and create initial tests
- [ ] Install and configure Prettier
- [ ] Set up ESLint with strict rules

### Short Term (Week 1)
- [ ] Set up Husky pre-commit hooks
- [ ] Configure lint-staged
- [ ] Install React Query or SWR
- [ ] Create data fetching hooks

### Medium Term (Week 2-3)
- [ ] Implement Zustand or Redux Toolkit
- [ ] Migrate from Context API
- [ ] Set up bundle analyzer
- [ ] Add performance monitoring

### Long Term (Month 1)
- [ ] Achieve 80% test coverage
- [ ] Implement E2E testing
- [ ] Set up CI/CD pipeline
- [ ] Add documentation generation

---

## 🚀 Quick Start Commands

```bash
# Install all dependencies at once (copy and run)
npm install --save \
  @tanstack/react-query \
  @hookform/resolvers \
  axios \
  clsx \
  date-fns \
  lodash \
  react-hook-form \
  swr \
  zod \
  zustand \
  immer

npm install --save-dev \
  @commitlint/cli \
  @commitlint/config-conventional \
  @next/bundle-analyzer \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/user-event \
  @types/jest \
  @types/lodash \
  @types/react-color \
  cross-env \
  eslint-config-prettier \
  eslint-plugin-jsx-a11y \
  eslint-plugin-prettier \
  husky \
  jest \
  jest-environment-jsdom \
  lint-staged \
  msw \
  prettier \
  rimraf \
  webpack-bundle-analyzer

# Initialize configurations
npx husky-init && npm install
npm run prepare
```

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Schema Validation](https://zod.dev/)

---

*Generated: November 3, 2025*  
*Ready for immediate implementation*
