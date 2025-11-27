# 09. Critical Implementation Rules

## 🚨 MANDATORY Rules That MUST Be Followed

These rules are non-negotiable and MUST be implemented exactly as specified to ensure the application works correctly.

---

## 1️⃣ Amount Sign Convention

### Rule: Expenses are NEGATIVE, Income is POSITIVE

```typescript
// ✅ CORRECT Implementation
const finalAmount = type === 'expense' 
  ? -Math.abs(inputAmount)  // Force negative for expenses
  : Math.abs(inputAmount);   // Force positive for income

// ❌ WRONG - Never store expense as positive
const amount = inputAmount; // DON'T DO THIS

// Examples:
// Salary: 5000.00 (positive)
// Rent: -1500.00 (negative)
// Groceries: -100.50 (negative)
// Investment return: 250.00 (positive)
```

### Database Storage
```sql
-- In database, amounts are stored as:
-- Income: 5000.00
-- Expense: -1500.00

-- Account balance calculation
UPDATE accounts 
SET current_balance = current_balance + transaction.amount
-- This works because expense amounts are already negative
```

### Display Formatting
```typescript
// When displaying to user, show absolute value with sign
const displayAmount = (amount: number, type: string) => {
  const absAmount = Math.abs(amount);
  const sign = type === 'income' ? '+' : '-';
  return `${sign}${formatCurrency(absAmount)}`;
};
```

---

## 2️⃣ Personal ID Management

### Rule: Each user has independent sequential numbering

```typescript
// Personal IDs are user-specific sequences
// User A: Transaction #1, #2, #3...
// User B: Transaction #1, #2, #3... (independent)

// ✅ CORRECT: Always filter by user_id
const maxTransaction = await prisma.transaction.findFirst({
  where: { user_id: user.user_id }, // CRITICAL: Filter by user
  orderBy: { personal_id: 'desc' }
});

// ❌ WRONG: Never get global max
const max = await prisma.transaction.findFirst({
  orderBy: { personal_id: 'desc' } // Missing user filter!
});
```

### Retry Logic for Conflicts
```typescript
// ✅ CORRECT: Implement retry with fresh personal_id
let retries = 3;
let personalId = suggestedId;

while (retries > 0) {
  try {
    const record = await prisma.transaction.create({
      data: {
        user_id: user.user_id,
        personal_id: BigInt(personalId),
        // ... other fields
      }
    });
    return record; // Success
    
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('personal_id')) {
      // Fetch new max personal_id
      const maxRecord = await prisma.transaction.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' }
      });
      
      personalId = Number(maxRecord?.personal_id || 0n) + 1;
      retries--;
      
      if (retries === 0) {
        throw new Error('Unable to generate unique personal_id');
      }
    } else {
      throw error; // Other errors, don't retry
    }
  }
}
```

---

## 3️⃣ Transfer Implementation

### Rule: Transfers MUST create TWO linked transactions

```typescript
// ✅ CORRECT: Always create both transactions atomically
await prisma.$transaction(async (tx) => {
  // 1. Create transfer record
  const transfer = await tx.transfer.create({
    data: {
      user_id,
      from_account,
      to_account,
      amount,
      date
    }
  });
  
  // 2. Create EXPENSE in source account (NEGATIVE)
  await tx.transaction.create({
    data: {
      user_id,
      account_id: from_account,
      type: 'transfer_out',
      amount: -Math.abs(amount), // MUST be negative
      transfer_id: transfer.id,
      date
    }
  });
  
  // 3. Create INCOME in destination account (POSITIVE)
  await tx.transaction.create({
    data: {
      user_id,
      account_id: to_account,
      type: 'transfer_in',
      amount: Math.abs(to_amount || amount), // MUST be positive
      transfer_id: transfer.id,
      date
    }
  });
  
  // 4. Update account balances
  await tx.account.update({
    where: { id: from_account },
    data: { current_balance: { decrement: amount } }
  });
  
  await tx.account.update({
    where: { id: to_account },
    data: { current_balance: { increment: to_amount || amount } }
  });
});

// ❌ WRONG: Never create transfer without transactions
await prisma.transfer.create({ ... }); // Incomplete!
```

---

## 4️⃣ Context Provider Hierarchy

### Rule: Providers MUST be nested in exact order

```tsx
// ✅ CORRECT Order (dependencies flow downward)
export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>           {/* Level 1: No dependencies */}
      <AuthStateProvider>     {/* Level 2: Uses Toast */}
        <AuthProvider>        {/* Level 3: Uses AuthState + Toast */}
          <TransactionModalProvider> {/* Level 4: Uses Auth */}
            {children}
          </TransactionModalProvider>
        </AuthProvider>
      </AuthStateProvider>
    </ToastProvider>
  );
}

// ❌ WRONG: Incorrect order causes dependency errors
<AuthProvider>          {/* Error: Can't use Toast */}
  <ToastProvider>       {/* Too late! */}
    {children}
  </ToastProvider>
</AuthProvider>
```

### Why Order Matters
```typescript
// AuthProvider needs ToastProvider
const AuthProvider = () => {
  const { showToast } = useToast(); // Requires ToastProvider above
  // ...
};

// TransactionModalProvider needs AuthProvider
const TransactionModalProvider = () => {
  const { isAuthenticated } = useAuth(); // Requires AuthProvider above
  // ...
};
```

---

## 5️⃣ Token Storage Security

### Rule: ALWAYS encrypt tokens before localStorage

```typescript
// ✅ CORRECT: Encrypt before storage
const storeToken = async (token: string) => {
  const encrypted = await tokenCrypto.encryptToken(token);
  localStorage.setItem(APP_CONFIG.storageKeys.authToken, encrypted);
};

// ✅ CORRECT: Decrypt when reading
const getToken = async () => {
  const encrypted = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
  if (!encrypted) return null;
  return await tokenCrypto.decryptToken(encrypted);
};

// ❌ WRONG: Never store plain tokens
localStorage.setItem('token', accessToken); // SECURITY RISK!
```

### Token Refresh Flow
```typescript
// ✅ CORRECT: Handle token expiry gracefully
if (error.response?.status === 401 && !originalRequest._retry) {
  originalRequest._retry = true;
  
  const refreshToken = await getDecryptedRefreshToken();
  if (refreshToken) {
    const newTokens = await refreshTokens(refreshToken);
    await storeEncryptedTokens(newTokens);
    originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
    return apiClient(originalRequest);
  }
  
  // Refresh failed, redirect to login
  redirectToLogin();
}
```

---

## 6️⃣ User Data Isolation

### Rule: ALWAYS filter by user_id in queries

```typescript
// ✅ CORRECT: Every query must filter by user
const accounts = await prisma.account.findMany({
  where: {
    user_id: authenticatedUser.id, // MANDATORY
    // ... other filters
  }
});

// ❌ WRONG: Missing user filter (SECURITY BREACH!)
const accounts = await prisma.account.findMany({
  where: { is_active: true } // Can see other users' data!
});

// ✅ CORRECT: Check ownership before operations
const account = await prisma.account.findFirst({
  where: {
    id: requestedId,
    user_id: authenticatedUser.id // Verify ownership
  }
});

if (!account) {
  throw new Error('Account not found or access denied');
}
```

---

## 7️⃣ Database Transactions

### Rule: Use transactions for multi-step operations

```typescript
// ✅ CORRECT: Atomic operations
await prisma.$transaction(async (tx) => {
  // All operations succeed or fail together
  const transaction = await tx.transaction.create({ ... });
  await tx.account.update({ ... });
  await tx.auditLog.create({ ... });
});

// ❌ WRONG: Separate operations (can partially fail)
await prisma.transaction.create({ ... });
await prisma.account.update({ ... }); // Might fail, leaving inconsistent state
```

---

## 8️⃣ BigInt and Decimal Handling

### Rule: Convert for JSON serialization

```typescript
// ✅ CORRECT: Convert BigInt to number
const response = {
  id: transaction.id,
  personal_id: Number(transaction.personal_id), // Convert BigInt
  amount: transaction.amount.toNumber(), // Convert Decimal
};

// ❌ WRONG: Direct serialization fails
return NextResponse.json(transaction); // Error: BigInt can't be serialized
```

### Safe Conversion Utilities
```typescript
const safeTransaction = (tx: any) => ({
  ...tx,
  personal_id: Number(tx.personal_id),
  amount: tx.amount.toNumber(),
  initial_balance: tx.initial_balance?.toNumber() || 0
});
```

---

## 9️⃣ API Response Format

### Rule: Consistent response structure

```typescript
// ✅ CORRECT: Standard success response
return NextResponse.json({
  success: true,
  data: result,
  meta: {
    total: 100,
    page: 1
  }
});

// ✅ CORRECT: Standard error response
return NextResponse.json({
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input data',
    details: errors
  }
}, { status: 400 });

// ❌ WRONG: Inconsistent formats
return NextResponse.json({ user }); // Missing success flag
return NextResponse.json({ error: 'Failed' }); // Wrong structure
```

---

## 🔟 Default Data Seeding

### Rule: Create 70+ categories and 3 accounts on registration

```typescript
// ✅ CORRECT: Complete seeding in transaction
await prisma.$transaction(async (tx) => {
  // 1. Create user
  const user = await tx.user.create({ ... });
  
  // 2. Create income categories (11)
  let categoryId = 1;
  for (const category of defaultCategories.income) {
    await tx.category.create({
      data: {
        user_id: user.id,
        personal_id: BigInt(categoryId++),
        // ...
      }
    });
  }
  
  // 3. Create expense categories with hierarchy (59+)
  for (const [parent, data] of Object.entries(defaultCategories.expense)) {
    const parentCat = await tx.category.create({ ... });
    
    for (const child of data.children) {
      await tx.category.create({
        data: {
          parent_id: parentCat.id,
          color: parentCat.color, // Inherit parent color
          // ...
        }
      });
    }
  }
  
  // 4. Create 3 default accounts
  for (const account of defaultAccounts) {
    await tx.account.create({ ... });
  }
});
```

---

## ⚠️ Common Mistakes to Avoid

### 1. Wrong Amount Signs
```typescript
// ❌ WRONG
if (type === 'expense') amount = amount; // Expenses must be negative!

// ✅ CORRECT
if (type === 'expense') amount = -Math.abs(amount);
```

### 2. Missing User Filter
```typescript
// ❌ WRONG
where: { id: accountId } // Can access any user's account!

// ✅ CORRECT
where: { id: accountId, user_id: userId }
```

### 3. Wrong Provider Order
```tsx
// ❌ WRONG
<AuthProvider><ToastProvider>...</ToastProvider></AuthProvider>

// ✅ CORRECT
<ToastProvider><AuthProvider>...</AuthProvider></ToastProvider>
```

### 4. Unencrypted Tokens
```typescript
// ❌ WRONG
localStorage.setItem('token', token); // Plain text!

// ✅ CORRECT
localStorage.setItem('token', await encrypt(token));
```

### 5. Partial Transfer Creation
```typescript
// ❌ WRONG
await createTransfer({ ... }); // Only creates record, no transactions!

// ✅ CORRECT
await createTransferWithTransactions({ ... }); // Complete operation
```

---

## ✅ Critical Rules Checklist

Before deployment, verify:

- [ ] All expenses stored as negative amounts
- [ ] All income stored as positive amounts
- [ ] Personal IDs are user-specific
- [ ] Retry logic implemented for personal_id conflicts
- [ ] Transfers create two linked transactions
- [ ] Context providers in correct order
- [ ] Tokens encrypted before storage
- [ ] All queries filter by user_id
- [ ] Database transactions used for atomic operations
- [ ] BigInt/Decimal converted for JSON
- [ ] Consistent API response format
- [ ] Default data created on registration
- [ ] Account balances update correctly
- [ ] Multi-tenancy properly enforced
- [ ] Security checks at every level
