# Global Transaction Modal System

## 📖 Overview

The Global Transaction Modal is a centralized system that allows you to **open the transaction modal from ANY page** in the application. This eliminates code duplication and ensures consistent transaction handling across the entire app.

## 🏗️ Architecture

### Components Created:
1. **TransactionContext** (`src/contexts/TransactionContext.tsx`)
   - Global state provider for modal
   - Manages open/close state
   - Handles add/edit modes

2. **GlobalTransactionModal** (`src/components/transactions/GlobalTransactionModal.tsx`)
   - Self-contained modal with all CRUD logic
   - Fetches accounts and categories automatically
   - Handles form validation and submission
   - Shows SweetAlert2 success/error messages
   - Emits events when transactions change

3. **RecordTransactionButton** (`src/components/transactions/RecordTransactionButton.tsx`)
   - Reusable button component
   - Can be used anywhere
   - Supports prefilling data

4. **DashboardLayout** (Updated)
   - Wraps all dashboard pages with `TransactionProvider`
   - Renders `GlobalTransactionModal` once

## 📚 Usage Examples

### 1. Simple "Record Transaction" Button

```tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <RecordTransactionButton />
    </div>
  );
}
```

### 2. Custom Button Text

```tsx
<RecordTransactionButton>
  Add Expense
</RecordTransactionButton>

<RecordTransactionButton variant="success">
  Quick Income
</RecordTransactionButton>

<RecordTransactionButton size="sm" variant="outline-primary">
  + Transaction
</RecordTransactionButton>
```

### 3. Prefill with Account ID

```tsx
// Add transaction to specific account
<RecordTransactionButton 
  prefillData={{ 
    account_id: '123',
    type: 'expense'
  }}
>
  Add to Cash Account
</RecordTransactionButton>
```

### 4. Prefill with Category

```tsx
// Quick expense for a specific category
<RecordTransactionButton 
  prefillData={{ 
    category_id: '456',
    type: 'expense',
    description: 'Grocery Shopping'
  }}
>
  Add Grocery Expense
</RecordTransactionButton>
```

### 5. Use Hook Directly (Advanced)

For custom buttons or programmatic control:

```tsx
import { useTransaction } from '@/contexts/TransactionContext';

function CustomComponent() {
  const { openAddModal, openEditModal } = useTransaction();

  const handleQuickExpense = () => {
    openAddModal({
      type: 'expense',
      amount: '50000',
      description: 'Coffee',
      payment_method: 'Cash',
    });
  };

  const handleEditTransaction = (transaction) => {
    openEditModal({
      id: transaction.id,
      date: transaction.date,
      account_id: transaction.account_id,
      category_id: transaction.category_id,
      amount: transaction.amount,
      type: transaction.type,
      description: transaction.description,
      payee: transaction.payee,
      payment_method: transaction.payment_method,
    });
  };

  return (
    <>
      <button onClick={handleQuickExpense}>
        Quick Coffee ☕
      </button>
      <button onClick={() => handleEditTransaction(myTransaction)}>
        Edit
      </button>
    </>
  );
}
```

### 6. Listen for Transaction Updates

Other components can listen for transaction events:

```tsx
useEffect(() => {
  const handleTransactionUpdate = (event) => {
    console.log('Transaction updated:', event.detail);
    // Refresh your data
    fetchTransactions();
  };

  window.addEventListener('transaction-updated', handleTransactionUpdate);
  
  return () => {
    window.removeEventListener('transaction-updated', handleTransactionUpdate);
  };
}, []);
```

## 🎨 Real-World Examples

### Dashboard Page

```tsx
// Add "Record Transaction" button to dashboard header
<div className="d-flex justify-content-between align-items-center mb-4">
  <h2>Dashboard</h2>
  <RecordTransactionButton size="sm" />
</div>
```

### Accounts Page

```tsx
// Add transaction to specific account from account card
<Card>
  <Card.Header>Cash Account</Card.Header>
  <Card.Body>
    <p>Balance: $5,000</p>
    <RecordTransactionButton
      prefillData={{ account_id: account.id }}
      variant="outline-primary"
      size="sm"
    >
      Add Transaction
    </RecordTransactionButton>
  </Card.Body>
</Card>
```

### Category Management Page

```tsx
// Quick add transaction for a category
{categories.map(category => (
  <div key={category.id}>
    <h3>{category.name}</h3>
    <RecordTransactionButton
      prefillData={{
        category_id: category.id,
        type: category.type, // income or expense
      }}
      size="sm"
      variant="outline-secondary"
    >
      + Quick Add
    </RecordTransactionButton>
  </div>
))}
```

### Budget Page

```tsx
// Add expense to a budget category
<div className="budget-card">
  <h4>Food Budget</h4>
  <ProgressBar now={70} label="70%" />
  <RecordTransactionButton
    prefillData={{
      category_id: budget.category_id,
      type: 'expense',
    }}
    variant="outline-danger"
    size="sm"
  >
    Record Expense
  </RecordTransactionButton>
</div>
```

### Header/Navigation Bar

```tsx
// Global "+" button in header
<Navbar>
  <Nav>
    <Nav.Link href="/dashboard">Dashboard</Nav.Link>
    <Nav.Link href="/transactions">Transactions</Nav.Link>
  </Nav>
  <Nav>
    <RecordTransactionButton variant="success" size="sm">
      + New
    </RecordTransactionButton>
  </Nav>
</Navbar>
```

## ✨ Features

### Automatic Data Fetching
The modal automatically fetches:
- All active accounts
- All categories (filtered by income/expense type)

### Smart Validation
- Date required
- Account required
- Category required
- Amount must be > 0

### Success/Error Handling
- Shows SweetAlert2 notifications
- Handles API errors gracefully
- Emits events for other components

### Loading States
- Shows spinner while fetching data
- Disables form during submission
- Prevents modal close during save

### Type Safety
- Full TypeScript support
- Type-safe prefill data
- Type-safe event emissions

## 🔧 How It Works

1. **DashboardLayout** wraps all pages with `TransactionProvider`
2. **GlobalTransactionModal** is rendered once at the layout level
3. Any page can use `useTransaction()` hook or `RecordTransactionButton`
4. Opening the modal updates global context state
5. Modal fetches necessary data and displays form
6. On save, emits `transaction-updated` event
7. Other components listening to event can refresh their data

## 🚀 Benefits

✅ **Single Source of Truth** - One modal, one handler
✅ **No Code Duplication** - Reuse everywhere
✅ **Consistent UX** - Same modal across all pages
✅ **Easy to Maintain** - Update once, apply everywhere
✅ **Type Safe** - Full TypeScript support
✅ **Flexible** - Prefill data, custom buttons, direct hook access
✅ **Event-Driven** - Other components auto-update

## 📝 Notes

- Modal is always mounted but hidden
- Data fetching happens only when modal opens
- Prefilled data is optional
- Works on all dashboard pages automatically
- Can be extended for transfers, recurring transactions, etc.

## 🎯 Next Steps

You can now:
1. Add the button to any page
2. Customize button appearance
3. Prefill transaction data
4. Listen for transaction events
5. Build custom workflows (quick expense buttons, recurring transactions, etc.)
