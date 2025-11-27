# 14. Testing Requirements & Implementation

## 🚨 CRITICAL: Test-Driven Development

**EVERY feature MUST have tests BEFORE considering it complete!**

---

## 📋 Testing Strategy Overview

### Test Coverage Requirements
- **Minimum 80% code coverage** for production
- **100% coverage** for critical business logic:
  - Amount sign conventions
  - Personal ID generation
  - Transfer operations
  - User isolation
  - Authentication

### Test Types Required
1. **Unit Tests** - Individual functions/components
2. **Integration Tests** - API endpoints and database operations
3. **E2E Tests** - Critical user flows
4. **Performance Tests** - Response times and load handling

---

## 🔧 Test Setup

### Install Testing Dependencies

```bash
# Backend testing
npm install -D jest @types/jest ts-jest
npm install -D @testing-library/jest-dom
npm install -D supertest @types/supertest
npm install -D @faker-js/faker

# Frontend testing
npm install -D @testing-library/react @testing-library/user-event
npm install -D @testing-library/react-hooks
npm install -D msw # Mock Service Worker for API mocking

# E2E testing
npm install -D playwright @playwright/test
```

### Jest Configuration: `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/app', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/lib/amount-utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### Test Setup File: `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { prisma } from '@/lib/prisma';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET_KEY = 'test-secret-key';
process.env.JWT_REFRESH_SECRET_KEY = 'test-refresh-secret';

// Clean database before each test
beforeEach(async () => {
  await prisma.$transaction([
    prisma.transactionLabel.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.label.deleteMany(),
    prisma.category.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

// Close database connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## ✅ Backend Unit Tests

### 1. Amount Sign Convention Tests: `src/lib/__tests__/amount-utils.test.ts`

```typescript
import { formatAmount, parseAmount, enforceAmountSign } from '@/lib/amount-utils';

describe('Amount Sign Convention', () => {
  describe('enforceAmountSign', () => {
    it('should make expense amounts negative', () => {
      expect(enforceAmountSign(100, 'expense')).toBe(-100);
      expect(enforceAmountSign(-100, 'expense')).toBe(-100);
    });

    it('should make income amounts positive', () => {
      expect(enforceAmountSign(100, 'income')).toBe(100);
      expect(enforceAmountSign(-100, 'income')).toBe(100);
    });

    it('should handle zero amounts', () => {
      expect(enforceAmountSign(0, 'expense')).toBe(0);
      expect(enforceAmountSign(0, 'income')).toBe(0);
    });

    it('should handle decimal amounts', () => {
      expect(enforceAmountSign(99.99, 'expense')).toBe(-99.99);
      expect(enforceAmountSign(99.99, 'income')).toBe(99.99);
    });
  });

  describe('formatAmount', () => {
    it('should format currency correctly', () => {
      expect(formatAmount(-1500.50)).toBe('-$1,500.50');
      expect(formatAmount(1500.50)).toBe('$1,500.50');
    });
  });
});
```

### 2. Personal ID Generation Tests: `src/lib/__tests__/personal-id.test.ts`

```typescript
import { getNextPersonalId, retryWithPersonalId } from '@/lib/personal-id';
import { prisma } from '@/lib/prisma';
import { faker } from '@faker-js/faker';

describe('Personal ID Generation', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        password: 'hashed',
        name: faker.person.fullName(),
      },
    });
    userId = user.id;
  });

  describe('getNextPersonalId', () => {
    it('should return 1 for first transaction', async () => {
      const nextId = await getNextPersonalId('transaction', userId);
      expect(nextId).toBe(1);
    });

    it('should increment from existing max', async () => {
      await prisma.transaction.create({
        data: {
          user_id: userId,
          personal_id: 5n,
          amount: -100,
          type: 'expense',
          date: new Date(),
          account_id: 'test-account',
        },
      });

      const nextId = await getNextPersonalId('transaction', userId);
      expect(nextId).toBe(6);
    });

    it('should be user-specific', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: faker.internet.email(),
          password: 'hashed',
          name: faker.person.fullName(),
        },
      });

      await prisma.transaction.create({
        data: {
          user_id: userId,
          personal_id: 10n,
          amount: -100,
          type: 'expense',
          date: new Date(),
          account_id: 'test-account',
        },
      });

      const nextIdOtherUser = await getNextPersonalId('transaction', otherUser.id);
      expect(nextIdOtherUser).toBe(1); // Should start at 1 for different user
    });
  });

  describe('retryWithPersonalId', () => {
    it('should retry on conflict', async () => {
      let attempts = 0;
      
      const result = await retryWithPersonalId(
        async (personalId) => {
          attempts++;
          if (attempts === 1) {
            throw { code: 'P2002', meta: { target: ['personal_id'] } };
          }
          return { success: true, personalId };
        },
        'transaction',
        userId
      );

      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      await expect(
        retryWithPersonalId(
          async () => {
            throw { code: 'P2002', meta: { target: ['personal_id'] } };
          },
          'transaction',
          userId,
          3 // max retries
        )
      ).rejects.toThrow('Unable to generate unique personal_id after 3 retries');
    });
  });
});
```

### 3. JWT Authentication Tests: `src/lib/__tests__/jwt.test.ts`

```typescript
import { generateTokens, verifyAccessToken, verifyRefreshToken } from '@/lib/jwt';
import { encryptToken, decryptToken } from '@/lib/crypto';

describe('JWT Authentication', () => {
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  describe('Token Generation', () => {
    it('should generate access and refresh tokens', async () => {
      const tokens = await generateTokens(testUser);
      
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate valid tokens', async () => {
      const tokens = await generateTokens(testUser);
      
      const accessPayload = await verifyAccessToken(tokens.accessToken);
      expect(accessPayload.userId).toBe(testUser.id);
      expect(accessPayload.email).toBe(testUser.email);
      
      const refreshPayload = await verifyRefreshToken(tokens.refreshToken);
      expect(refreshPayload.userId).toBe(testUser.id);
    });
  });

  describe('Token Encryption', () => {
    it('should encrypt and decrypt tokens', async () => {
      const originalToken = 'test.jwt.token';
      
      const encrypted = await encryptToken(originalToken);
      expect(encrypted).not.toBe(originalToken);
      
      const decrypted = await decryptToken(encrypted);
      expect(decrypted).toBe(originalToken);
    });

    it('should produce different encrypted values for same token', async () => {
      const token = 'test.jwt.token';
      
      const encrypted1 = await encryptToken(token);
      const encrypted2 = await encryptToken(token);
      
      expect(encrypted1).not.toBe(encrypted2); // Different due to IV
      expect(await decryptToken(encrypted1)).toBe(token);
      expect(await decryptToken(encrypted2)).toBe(token);
    });
  });
});
```

---

## ✅ API Integration Tests

### 1. Authentication Endpoints: `app/api/v1/auth/__tests__/auth.test.ts`

```typescript
import { createMocks } from 'node-mocks-http';
import { POST as registerHandler } from '@/app/api/v1/auth/register/route';
import { POST as loginHandler } from '@/app/api/v1/auth/login/route';
import { prisma } from '@/lib/prisma';

describe('/api/v1/auth', () => {
  describe('POST /register', () => {
    it('should create user with default data', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        },
      });

      const response = await registerHandler(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('user');
      expect(data.data).toHaveProperty('tokens');

      // Verify default data created
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
        include: {
          categories: true,
          accounts: true,
        },
      });

      expect(user?.categories.length).toBeGreaterThanOrEqual(70);
      expect(user?.accounts.length).toBe(3);
    });

    it('should enforce password requirements', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
        },
      });

      const response = await registerHandler(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('password');
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Create test user
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPass123!',
          name: 'Test User',
        },
      });
      await registerHandler(req as any);
    });

    it('should login with valid credentials', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      });

      const response = await loginHandler(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tokens).toHaveProperty('accessToken');
      expect(data.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'WrongPassword',
        },
      });

      const response = await loginHandler(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });
});
```

### 2. Transaction API Tests: `app/api/v1/transactions/__tests__/transactions.test.ts`

```typescript
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/v1/transactions/route';
import { prisma } from '@/lib/prisma';
import { generateTokens } from '@/lib/jwt';

describe('/api/v1/transactions', () => {
  let user: any;
  let account: any;
  let category: any;
  let authToken: string;

  beforeEach(async () => {
    // Setup test data
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
      },
    });

    account = await prisma.account.create({
      data: {
        user_id: user.id,
        personal_id: 1n,
        name: 'Test Account',
        type: 'bank',
        currency: 'USD',
        current_balance: 1000,
        initial_balance: 1000,
      },
    });

    category = await prisma.category.create({
      data: {
        user_id: user.id,
        personal_id: 1n,
        name: 'Food',
        type: 'expense',
        color: '#FF0000',
      },
    });

    const tokens = await generateTokens(user);
    authToken = tokens.accessToken;
  });

  describe('POST /transactions', () => {
    it('should create expense with negative amount', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        body: {
          date: '2024-01-01',
          account_id: account.id,
          category_id: category.id,
          amount: 50, // Input as positive
          type: 'expense',
          description: 'Lunch',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.amount).toBe(-50); // Stored as negative

      // Verify account balance updated
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(updatedAccount?.current_balance.toNumber()).toBe(950);
    });

    it('should create income with positive amount', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        body: {
          date: '2024-01-01',
          account_id: account.id,
          amount: 500,
          type: 'income',
          description: 'Freelance payment',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.amount).toBe(500); // Stored as positive

      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(updatedAccount?.current_balance.toNumber()).toBe(1500);
    });

    it('should handle personal_id conflict with retry', async () => {
      // Create existing transaction
      await prisma.transaction.create({
        data: {
          user_id: user.id,
          personal_id: 1n,
          account_id: account.id,
          amount: -25,
          type: 'expense',
          date: new Date(),
        },
      });

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        body: {
          suggested_personal_id: 1, // Conflicting ID
          date: '2024-01-01',
          account_id: account.id,
          amount: 30,
          type: 'expense',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.personal_id).toBe(2); // Should get next available
    });
  });

  describe('GET /transactions', () => {
    beforeEach(async () => {
      // Create test transactions
      await prisma.transaction.createMany({
        data: [
          {
            user_id: user.id,
            personal_id: 1n,
            account_id: account.id,
            category_id: category.id,
            amount: -50,
            type: 'expense',
            date: new Date('2024-01-01'),
          },
          {
            user_id: user.id,
            personal_id: 2n,
            account_id: account.id,
            amount: 1000,
            type: 'income',
            date: new Date('2024-01-02'),
          },
        ],
      });
    });

    it('should return user transactions with pagination', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        query: {
          page: '1',
          limit: '10',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.transactions).toHaveLength(2);
      expect(data.data.pagination.total).toBe(2);
    });

    it('should filter transactions by date range', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        query: {
          start_date: '2024-01-02',
          end_date: '2024-01-02',
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(data.data.transactions).toHaveLength(1);
      expect(data.data.transactions[0].type).toBe('income');
    });

    it('should not return other users transactions', async () => {
      // Create another user's transaction
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashed',
          name: 'Other User',
        },
      });

      await prisma.transaction.create({
        data: {
          user_id: otherUser.id,
          personal_id: 1n,
          account_id: 'other-account',
          amount: -100,
          type: 'expense',
          date: new Date(),
        },
      });

      const { req } = createMocks({
        method: 'GET',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(data.data.transactions).toHaveLength(2); // Only user's transactions
      expect(data.data.transactions.every((tx: any) => tx.user_id === user.id)).toBe(true);
    });
  });
});
```

---

## ✅ Frontend Component Tests

### 1. Transaction Form Tests: `src/components/transactions/__tests__/TransactionForm.test.tsx`

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { transactionService } from '@/services/transaction.service';

jest.mock('@/services/transaction.service');

describe('TransactionForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    accounts: [
      { id: 'acc1', name: 'Cash', currency: 'USD' },
      { id: 'acc2', name: 'Bank', currency: 'USD' },
    ],
    categories: [
      { id: 'cat1', name: 'Food', type: 'expense' },
      { id: 'cat2', name: 'Salary', type: 'income' },
    ],
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form fields', () => {
    render(<TransactionForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('should handle expense submission', async () => {
    const user = userEvent.setup();
    (transactionService.createTransaction as jest.Mock).mockResolvedValue({
      id: 'tx1',
      amount: -50,
    });

    render(<TransactionForm {...defaultProps} />);
    
    // Select expense type
    await user.click(screen.getByRole('radio', { name: /expense/i }));
    
    // Fill form
    await user.type(screen.getByLabelText(/amount/i), '50');
    await user.selectOptions(screen.getByLabelText(/account/i), 'acc1');
    await user.selectOptions(screen.getByLabelText(/category/i), 'cat1');
    await user.type(screen.getByLabelText(/description/i), 'Lunch');
    
    // Submit
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(transactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50, // Input as positive
          type: 'expense',
          account_id: 'acc1',
          category_id: 'cat1',
          description: 'Lunch',
        })
      );
    });
    
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    render(<TransactionForm {...defaultProps} />);
    
    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    expect(await screen.findByText(/amount is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/account is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show different categories for income/expense', async () => {
    const user = userEvent.setup();
    
    render(<TransactionForm {...defaultProps} />);
    
    // Initially shows expense categories
    await user.click(screen.getByRole('radio', { name: /expense/i }));
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.queryByText('Salary')).not.toBeInTheDocument();
    
    // Switch to income
    await user.click(screen.getByRole('radio', { name: /income/i }));
    expect(screen.queryByText('Food')).not.toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });
});
```

### 2. Context Provider Tests: `src/context/__tests__/AuthContext.test.tsx`

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';

jest.mock('@/services/auth.service');

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should provide authentication state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.login).toBeDefined();
    expect(result.current.logout).toBeDefined();
  });

  it('should handle login', async () => {
    const mockUser = { id: 'user1', email: 'test@example.com' };
    const mockTokens = { 
      accessToken: 'access-token', 
      refreshToken: 'refresh-token' 
    };
    
    (authService.login as jest.Mock).mockResolvedValue({
      user: mockUser,
      tokens: mockTokens,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // First login
    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });
    
    // Then logout
    await act(async () => {
      await result.current.logout();
    });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('should auto-refresh token on 401', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Mock token refresh
    (authService.refreshToken as jest.Mock).mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    
    await act(async () => {
      await result.current.handleTokenRefresh();
    });
    
    expect(authService.refreshToken).toHaveBeenCalled();
  });
});
```

---

## ✅ E2E Tests with Playwright

### Playwright Config: `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example: `tests/e2e/user-flow.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('User Registration and Transaction Flow', () => {
  test('should register and create first transaction', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', 'e2e@example.com');
    await page.fill('input[name="password"]', 'E2ETest123!');
    await page.fill('input[name="name"]', 'E2E Test User');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify default accounts exist
    await expect(page.locator('text=Cash')).toBeVisible();
    await expect(page.locator('text=Checking')).toBeVisible();
    await expect(page.locator('text=Savings')).toBeVisible();
    
    // Create a transaction
    await page.click('button:has-text("Add Transaction")');
    
    // Fill transaction form
    await page.click('label:has-text("Expense")');
    await page.fill('input[name="amount"]', '50.00');
    await page.selectOption('select[name="account"]', 'Cash');
    await page.selectOption('select[name="category"]', 'Food');
    await page.fill('textarea[name="description"]', 'Lunch');
    await page.click('button:has-text("Save")');
    
    // Verify transaction appears
    await expect(page.locator('text=Lunch')).toBeVisible();
    await expect(page.locator('text=-$50.00')).toBeVisible();
    
    // Verify balance updated
    const cashBalance = await page.locator('[data-testid="cash-balance"]').textContent();
    expect(cashBalance).toContain('$950.00'); // 1000 - 50
  });
  
  test('should create transfer between accounts', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');
    
    // Navigate to transfers
    await page.click('a:has-text("Transfers")');
    await page.click('button:has-text("New Transfer")');
    
    // Fill transfer form
    await page.selectOption('select[name="from_account"]', 'Checking');
    await page.selectOption('select[name="to_account"]', 'Savings');
    await page.fill('input[name="amount"]', '500');
    await page.click('button:has-text("Transfer")');
    
    // Verify both transactions created
    await page.goto('/transactions');
    
    const transactions = page.locator('[data-testid="transaction-row"]');
    await expect(transactions).toHaveCount(2);
    
    // Verify amounts
    await expect(page.locator('text=-$500.00')).toBeVisible(); // From Checking
    await expect(page.locator('text=+$500.00')).toBeVisible(); // To Savings
  });
});
```

---

## 📊 Test Coverage Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:ci": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## ✅ Testing Checklist for Each Feature

### When Implementing a New Feature:

1. **Before Writing Code (TDD)**:
   - [ ] Write unit tests for business logic
   - [ ] Write integration tests for API endpoints
   - [ ] Plan E2E test scenarios

2. **During Implementation**:
   - [ ] Run tests continuously with `npm run test:watch`
   - [ ] Ensure each function has a test
   - [ ] Test edge cases and error conditions

3. **After Implementation**:
   - [ ] Run full test suite: `npm run test:all`
   - [ ] Check coverage: `npm run test:coverage`
   - [ ] Ensure coverage > 80%
   - [ ] Fix any failing tests

4. **Critical Areas Requiring 100% Coverage**:
   - [ ] Amount sign convention functions
   - [ ] Personal ID generation and retry logic
   - [ ] Transfer creation (two transactions)
   - [ ] User isolation (user_id filtering)
   - [ ] JWT token generation and validation
   - [ ] Password hashing and verification

---

## 🚨 IMPORTANT Testing Rules

### NEVER skip tests for:
1. **Financial Calculations** - Amount signs, balances
2. **Security Features** - Auth, user isolation
3. **Data Integrity** - Personal IDs, transfers
4. **API Endpoints** - All CRUD operations
5. **Critical User Flows** - Registration, transactions

### Test Naming Convention:
```typescript
describe('ComponentName or FeatureName', () => {
  describe('methodName or scenario', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});
```

### Mock External Dependencies:
- Database calls in unit tests
- API calls in frontend tests
- File system operations
- Third-party services

---

## 📈 Monitoring Test Quality

### Metrics to Track:
1. **Code Coverage**: Minimum 80%, target 90%+
2. **Test Execution Time**: < 5 minutes for full suite
3. **Test Flakiness**: 0 tolerance for flaky tests
4. **Test Maintenance**: Update tests with code changes

### CI/CD Integration:
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:ci
      - run: npx codecov # Upload coverage
```

---

## 🎯 Test Quality Gates

Before merging any PR:
1. ✅ All tests must pass
2. ✅ Coverage must not decrease
3. ✅ No console.logs in tests
4. ✅ New features must have tests
5. ✅ E2E tests for critical paths

**Remember: Untested code is broken code!**
