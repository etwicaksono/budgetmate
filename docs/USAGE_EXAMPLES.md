# Global Transaction Modal - Quick Start Examples

## 🚀 Quick Examples for Common Pages

### 1. Dashboard Page - Add "Record Transaction" Button

```tsx
// app/dashboard/page.tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="d-flex justify-content-between mb-4">
        <h2>Dashboard</h2>
        <RecordTransactionButton size="sm" />
      </div>
      {/* Rest of dashboard content */}
    </DashboardLayout>
  );
}
```

### 2. Accounts Page - Add Transaction to Specific Account

```tsx
// app/dashboard/accounts/page.tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function AccountsPage() {
  return (
    <DashboardLayout>
      {accounts.map(account => (
        <Card key={account.id}>
          <Card.Header>{account.name}</Card.Header>
          <Card.Body>
            <p>Balance: {formatCurrency(account.balance)}</p>
            
            {/* Quick add transaction to this account */}
            <RecordTransactionButton
              prefillData={{ 
                account_id: account.id,
                type: 'expense'
              }}
              variant="outline-primary"
              size="sm"
            >
              Add Expense
            </RecordTransactionButton>
          </Card.Body>
        </Card>
      ))}
    </DashboardLayout>
  );
}
```

### 3. Transactions Page - Use Hook Directly

```tsx
// app/dashboard/transactions/page.tsx
import { useTransaction } from '@/contexts/TransactionContext';
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function TransactionsPage() {
  const { openEditModal } = useTransaction();

  const handleEdit = (transaction) => {
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
    <DashboardLayout>
      <div className="d-flex justify-content-between mb-4">
        <h2>Transactions</h2>
        <RecordTransactionButton />
      </div>

      <Table>
        <tbody>
          {transactions.map(txn => (
            <tr key={txn.id}>
              <td>{txn.description}</td>
              <td>{txn.amount}</td>
              <td>
                <Button 
                  size="sm" 
                  variant="outline-secondary"
                  onClick={() => handleEdit(txn)}
                >
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </DashboardLayout>
  );
}
```

### 4. Header - Global Quick Add Button

```tsx
// src/components/Header.tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function Header() {
  return (
    <Navbar>
      <Nav>
        <Nav.Link href="/dashboard">Dashboard</Nav.Link>
        <Nav.Link href="/transactions">Transactions</Nav.Link>
        <Nav.Link href="/accounts">Accounts</Nav.Link>
      </Nav>
      
      <Nav className="ms-auto">
        {/* Global quick add button in header */}
        <RecordTransactionButton 
          variant="success" 
          size="sm"
          className="me-3"
        >
          + New
        </RecordTransactionButton>
        
        <NavDropdown title={user?.email}>
          <NavDropdown.Item href="/settings">Settings</NavDropdown.Item>
          <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
        </NavDropdown>
      </Nav>
    </Navbar>
  );
}
```

### 5. Budget Page - Quick Expense for Category

```tsx
// app/dashboard/budgets/page.tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function BudgetsPage() {
  return (
    <DashboardLayout>
      <h2>Budgets</h2>
      
      {budgets.map(budget => (
        <Card key={budget.id}>
          <Card.Header>
            <h5>{budget.category_name}</h5>
            <small>Budget: {formatCurrency(budget.limit)}</small>
          </Card.Header>
          <Card.Body>
            <ProgressBar 
              now={(budget.spent / budget.limit) * 100} 
              label={`${Math.round((budget.spent / budget.limit) * 100)}%`}
            />
            <p className="mt-2">
              Spent: {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
            </p>
            
            {/* Quick add expense to this budget category */}
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
          </Card.Body>
        </Card>
      ))}
    </DashboardLayout>
  );
}
```

### 6. Categories Page - Quick Add by Category

```tsx
// app/dashboard/categories/page.tsx
import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton';

export default function CategoriesPage() {
  return (
    <DashboardLayout>
      <h2>Categories</h2>
      
      <Row>
        <Col md={6}>
          <h4>Expense Categories</h4>
          {expenseCategories.map(category => (
            <ListGroup.Item 
              key={category.id}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <FaIcon icon={category.icon} color={category.color} />
                <span className="ms-2">{category.name}</span>
              </div>
              
              <RecordTransactionButton
                prefillData={{
                  category_id: category.id,
                  type: 'expense',
                }}
                size="sm"
                variant="link"
              >
                + Add
              </RecordTransactionButton>
            </ListGroup.Item>
          ))}
        </Col>
        
        <Col md={6}>
          <h4>Income Categories</h4>
          {incomeCategories.map(category => (
            <ListGroup.Item 
              key={category.id}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <FaIcon icon={category.icon} color={category.color} />
                <span className="ms-2">{category.name}</span>
              </div>
              
              <RecordTransactionButton
                prefillData={{
                  category_id: category.id,
                  type: 'income',
                }}
                size="sm"
                variant="link"
              >
                + Add
              </RecordTransactionButton>
            </ListGroup.Item>
          ))}
        </Col>
      </Row>
    </DashboardLayout>
  );
}
```

### 7. Listen for Updates (Any Page)

```tsx
// Any page that needs to refresh when transactions change
import { useEffect } from 'react';

export default function MyPage() {
  const [transactions, setTransactions] = useState([]);

  // Fetch initial data
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = (event) => {
      console.log('Transaction updated:', event.detail);
      // Refresh data
      fetchTransactions();
    };

    window.addEventListener('transaction-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('transaction-updated', handleUpdate);
    };
  }, []);

  const fetchTransactions = async () => {
    const data = await transactionService.fetchTransactions();
    setTransactions(data.transactions);
  };

  return (
    <DashboardLayout>
      {/* Your content */}
    </DashboardLayout>
  );
}
```

### 8. Custom Quick Action Buttons

```tsx
// Create custom quick action buttons
import { useTransaction } from '@/contexts/TransactionContext';
import { Button } from 'react-bootstrap';

export function QuickActionButtons() {
  const { openAddModal } = useTransaction();

  return (
    <div className="quick-actions">
      <h5>Quick Actions</h5>
      
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => openAddModal({
          type: 'expense',
          category_id: 'food-category-id',
          description: 'Lunch',
        })}
      >
        🍽️ Lunch
      </Button>
      
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => openAddModal({
          type: 'expense',
          category_id: 'transport-category-id',
          description: 'Gas',
        })}
      >
        ⛽ Gas
      </Button>
      
      <Button
        variant="outline-success"
        size="sm"
        onClick={() => openAddModal({
          type: 'income',
          category_id: 'salary-category-id',
          description: 'Salary',
        })}
      >
        💰 Salary
      </Button>
      
      <Button
        variant="outline-danger"
        size="sm"
        onClick={() => openAddModal({
          type: 'expense',
          category_id: 'shopping-category-id',
          description: 'Shopping',
        })}
      >
        🛍️ Shopping
      </Button>
    </div>
  );
}
```

## 🎯 Key Points

1. **Import Once**: `import { RecordTransactionButton } from '@/components/transactions/RecordTransactionButton'`
2. **Use Anywhere**: Works on all dashboard pages automatically
3. **Prefill Data**: Pass `prefillData` prop to preset fields
4. **Customize**: Use `variant`, `size`, `className` props
5. **Advanced**: Use `useTransaction()` hook for custom controls
6. **Listen**: Subscribe to `transaction-updated` events to refresh data

## 📱 Mobile Responsive

The modal is fully responsive and works great on mobile devices. No extra code needed!

## 🔄 Automatic Refresh

To make your page refresh automatically when transactions are added/edited:

```tsx
useEffect(() => {
  const refresh = () => fetchYourData();
  window.addEventListener('transaction-updated', refresh);
  return () => window.removeEventListener('transaction-updated', refresh);
}, []);
```

## ✨ That's It!

You now have a **single, centralized transaction modal** that works across your entire app with **zero code duplication**!
