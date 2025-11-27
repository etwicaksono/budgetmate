# 00B. Code Principles - SOLID, DRY, and KISS

## 🎯 Purpose

This document defines **mandatory coding principles** that MUST be followed when refactoring code from `../old/` into the new project. These principles ensure the codebase is maintainable, scalable, and clean while preserving all existing functionality.

---

## 🏛️ SOLID Principles

### **S - Single Responsibility Principle (SRP)**

> Each module, class, or function should have ONE reason to change.

#### ❌ WRONG: Multiple Responsibilities

```tsx
// old pattern (to be refactored)
// One component doing too much
const TransactionPage = () => {
  // 1. Data fetching
  const [transactions, setTransactions] = useState([]);
  useEffect(() => {
    fetch('/api/transactions').then(/* ... */);
  }, []);
  
  // 2. Filtering logic
  const filteredTransactions = transactions.filter(/* complex logic */);
  
  // 3. Sorting logic
  const sortedTransactions = filteredTransactions.sort(/* ... */);
  
  // 4. UI rendering
  return (
    <div>
      <FilterSidebar />
      <TransactionList />
      <Modal />
    </div>
  );
};
```

#### ✅ CORRECT: Separated Responsibilities

```tsx
// 1. Custom hook for data fetching (Single Responsibility: Data)
const useTransactions = (filters: TransactionFilters) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const data = await transactionService.getAll(filters);
        setTransactions(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactions();
  }, [filters]);
  
  return { transactions, loading, error };
};

// 2. Utility for filtering (Single Responsibility: Filter Logic)
const filterTransactions = (
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] => {
  return transactions.filter(tx => {
    if (filters.dateFrom && tx.date < filters.dateFrom) return false;
    if (filters.dateTo && tx.date > filters.dateTo) return false;
    if (filters.categoryId && tx.category_id !== filters.categoryId) return false;
    return true;
  });
};

// 3. Component (Single Responsibility: UI Rendering)
const TransactionPage: React.FC = () => {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { transactions, loading, error } = useTransactions(filters);
  const filtered = filterTransactions(transactions, filters);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <Container>
      <Row>
        <Col lg={3}>
          <FilterSidebar filters={filters} onChange={setFilters} />
        </Col>
        <Col lg={9}>
          <TransactionList transactions={filtered} />
        </Col>
      </Row>
    </Container>
  );
};
```

**Benefits:**
- `useTransactions` can be reused in other components
- `filterTransactions` can be tested independently
- `TransactionPage` only handles UI composition

---

### **O - Open/Closed Principle (OCP)**

> Software entities should be open for extension, closed for modification.

#### ❌ WRONG: Hardcoded Chart Types

```tsx
// Adding new chart types requires modifying this function
const renderChart = (type: string, data: any) => {
  if (type === 'pie') {
    return <PieChart data={data} />;
  } else if (type === 'bar') {
    return <BarChart data={data} />;
  } else if (type === 'line') {
    return <LineChart data={data} />;
  }
  // Adding new type? Must modify this function!
  return null;
};
```

#### ✅ CORRECT: Chart Registry Pattern

```tsx
// 1. Define chart interface
interface ChartComponent {
  render: (data: ChartData) => JSX.Element;
  validate?: (data: ChartData) => boolean;
}

// 2. Chart registry (open for extension)
const chartRegistry: Record<string, ChartComponent> = {
  pie: {
    render: (data) => <PieChart data={data} />,
    validate: (data) => data.values.every(v => v >= 0)
  },
  bar: {
    render: (data) => <BarChart data={data} />
  },
  line: {
    render: (data) => <LineChart data={data} />
  }
};

// 3. Register new charts WITHOUT modifying core code
chartRegistry.area = {
  render: (data) => <AreaChart data={data} />
};

// 4. Generic renderer (closed for modification)
const renderChart = (type: string, data: ChartData) => {
  const chart = chartRegistry[type];
  if (!chart) {
    console.warn(`Unknown chart type: ${type}`);
    return null;
  }
  
  if (chart.validate && !chart.validate(data)) {
    console.warn(`Invalid data for ${type} chart`);
    return null;
  }
  
  return chart.render(data);
};
```

**Benefits:**
- Add new chart types without modifying `renderChart`
- Each chart has its own validation logic
- Easy to test individual chart types

---

### **L - Liskov Substitution Principle (LSP)**

> Subtypes must be substitutable for their base types.

#### ❌ WRONG: Inconsistent API Response Handling

```tsx
// Different services return different shapes
class AccountService {
  async getAll() {
    return { accounts: [...] }; // Wrapped in object
  }
}

class CategoryService {
  async getAll() {
    return [...]; // Direct array
  }
}

// Consumer must know implementation details
const accounts = await accountService.getAll();
const accountList = accounts.accounts; // Must unwrap

const categories = await categoryService.getAll();
const categoryList = categories; // Direct use
```

#### ✅ CORRECT: Consistent Service Interface

```tsx
// 1. Base service interface
interface CrudService<T> {
  getAll(filters?: Record<string, any>): Promise<ApiResponse<T[]>>;
  getById(id: number): Promise<ApiResponse<T>>;
  create(data: Partial<T>): Promise<ApiResponse<T>>;
  update(id: number, data: Partial<T>): Promise<ApiResponse<T>>;
  delete(id: number): Promise<ApiResponse<void>>;
}

// 2. Standard API response
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

// 3. All services follow same pattern
class AccountService implements CrudService<Account> {
  async getAll(filters?: AccountFilters): Promise<ApiResponse<Account[]>> {
    const response = await api.get('/api/v1/accounts', { params: filters });
    return response.data;
  }
  // ... other methods
}

class CategoryService implements CrudService<Category> {
  async getAll(filters?: CategoryFilters): Promise<ApiResponse<Category[]>> {
    const response = await api.get('/api/v1/categories', { params: filters });
    return response.data;
  }
  // ... other methods
}

// 4. Generic hook works with ANY service
const useResource = <T,>(service: CrudService<T>, filters?: any) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const response = await service.getAll(filters);
      if (response.success) {
        setData(response.data);
      }
      setLoading(false);
    };
    fetch();
  }, [service, filters]);
  
  return { data, loading };
};

// Usage: Same pattern for all resources
const { data: accounts } = useResource(accountService);
const { data: categories } = useResource(categoryService);
```

**Benefits:**
- Any service can be used interchangeably
- Generic hooks work with all services
- Consistent error handling

---

### **I - Interface Segregation Principle (ISP)**

> Clients should not depend on interfaces they don't use.

#### ❌ WRONG: Fat Interface

```tsx
// One massive component with all props
interface TransactionModalProps {
  // Basic props
  show: boolean;
  onHide: () => void;
  transaction: Transaction | null;
  
  // Edit mode props (not used when creating)
  isEditMode?: boolean;
  onUpdate?: (tx: Transaction) => void;
  
  // Transfer mode props (not used for regular transactions)
  isTransfer?: boolean;
  toAccount?: Account;
  
  // Quick transaction props (not used in normal mode)
  quickTemplates?: QuickTemplate[];
  onTemplateSelect?: (id: string) => void;
  
  // Admin props (not used by regular users)
  canOverrideValidation?: boolean;
  showAdvancedOptions?: boolean;
}

// Component must handle ALL scenarios
const TransactionModal: React.FC<TransactionModalProps> = (props) => {
  // Massive component with complex conditionals
  if (props.isTransfer) { /* ... */ }
  if (props.isEditMode) { /* ... */ }
  if (props.quickTemplates) { /* ... */ }
  // ... hundreds of lines
};
```

#### ✅ CORRECT: Segregated Components

```tsx
// 1. Base transaction form (shared logic)
interface BaseTransactionFormProps {
  transaction: Partial<Transaction>;
  onChange: (field: keyof Transaction, value: any) => void;
  accounts: Account[];
  categories: Category[];
}

const BaseTransactionForm: React.FC<BaseTransactionFormProps> = ({
  transaction,
  onChange,
  accounts,
  categories
}) => {
  return (
    <Form>
      <AmountInput 
        value={transaction.amount} 
        onChange={(v) => onChange('amount', v)} 
      />
      <AccountSelect 
        value={transaction.account_id}
        options={accounts}
        onChange={(v) => onChange('account_id', v)}
      />
      <CategorySelect
        value={transaction.category_id}
        options={categories}
        onChange={(v) => onChange('category_id', v)}
      />
    </Form>
  );
};

// 2. Create transaction modal (simple interface)
interface CreateTransactionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (transaction: Partial<Transaction>) => Promise<void>;
}

const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  show,
  onHide,
  onSave
}) => {
  const [transaction, setTransaction] = useState<Partial<Transaction>>({});
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  
  const handleChange = (field: keyof Transaction, value: any) => {
    setTransaction(prev => ({ ...prev, [field]: value }));
  };
  
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Transaction</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <BaseTransactionForm
          transaction={transaction}
          onChange={handleChange}
          accounts={accounts}
          categories={categories}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(transaction)}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// 3. Edit transaction modal (different interface)
interface EditTransactionModalProps {
  show: boolean;
  onHide: () => void;
  transaction: Transaction;
  onUpdate: (updated: Transaction) => Promise<void>;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  show,
  onHide,
  transaction,
  onUpdate
}) => {
  const [edited, setEdited] = useState<Transaction>(transaction);
  // ... similar but focused on editing
};

// 4. Quick transaction modal (minimal interface)
interface QuickTransactionModalProps {
  show: boolean;
  onHide: () => void;
  template: QuickTemplate;
  onSave: (transaction: Partial<Transaction>) => Promise<void>;
}

const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  show,
  onHide,
  template,
  onSave
}) => {
  // Simple, focused component
  // Only shows amount and date (category from template)
};
```

**Benefits:**
- Each component has minimal, focused props
- No unused props or dead code paths
- Easier to understand and maintain
- Better TypeScript type safety

---

### **D - Dependency Inversion Principle (DIP)**

> Depend on abstractions, not concretions.

#### ❌ WRONG: Direct API Calls

```tsx
// Component directly depends on fetch API
const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    // Tightly coupled to fetch implementation
    fetch('/api/v1/transactions')
      .then(res => res.json())
      .then(data => setTransactions(data.data));
  }, []);
  
  return <div>{/* render */}</div>;
};

// Can't test without mocking global fetch
// Can't switch to different API client
// Can't add retry logic without changing component
```

#### ✅ CORRECT: Abstraction Layer

```tsx
// 1. Define abstraction (interface)
interface TransactionRepository {
  getAll(filters?: TransactionFilters): Promise<Transaction[]>;
  getById(id: number): Promise<Transaction>;
  create(transaction: Partial<Transaction>): Promise<Transaction>;
  update(id: number, transaction: Partial<Transaction>): Promise<Transaction>;
  delete(id: number): Promise<void>;
}

// 2. Concrete implementation
class ApiTransactionRepository implements TransactionRepository {
  constructor(private apiClient: ApiClient) {}
  
  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const response = await this.apiClient.get<ApiResponse<Transaction[]>>(
      '/api/v1/transactions',
      { params: filters }
    );
    
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Failed to fetch transactions');
    }
    
    return response.data.data;
  }
  
  // ... other methods
}

// 3. Alternative implementation (for testing or offline mode)
class MockTransactionRepository implements TransactionRepository {
  private transactions: Transaction[] = mockData;
  
  async getAll(): Promise<Transaction[]> {
    return Promise.resolve(this.transactions);
  }
  
  // ... other methods
}

// 4. Dependency injection
const TransactionServiceContext = createContext<TransactionRepository | null>(null);

export const TransactionServiceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiClient = useApiClient();
  const repository = useMemo(
    () => new ApiTransactionRepository(apiClient),
    [apiClient]
  );
  
  return (
    <TransactionServiceContext.Provider value={repository}>
      {children}
    </TransactionServiceContext.Provider>
  );
};

// 5. Component depends on abstraction
const TransactionList: React.FC = () => {
  const repository = useContext(TransactionServiceContext);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    if (!repository) return;
    
    repository.getAll().then(setTransactions);
  }, [repository]);
  
  return <div>{/* render */}</div>;
};

// Testing: Easy to swap implementation
<TransactionServiceContext.Provider value={mockRepository}>
  <TransactionList />
</TransactionServiceContext.Provider>
```

**Benefits:**
- Easy to test (inject mock repository)
- Easy to add features (caching, retry, offline mode)
- Can switch API implementations without changing components
- Clear separation of concerns

---

## 🔁 DRY Principle (Don't Repeat Yourself)

> Every piece of knowledge should have a single, authoritative representation.

### Example 1: Repeated Validation Logic

#### ❌ WRONG: Duplicated Validation

```tsx
// Validation repeated in multiple places
const TransactionForm = () => {
  const handleSubmit = () => {
    // Validation logic here
    if (!amount || amount <= 0) {
      showError('Amount must be positive');
      return;
    }
    if (!category_id) {
      showError('Category is required');
      return;
    }
    if (!account_id) {
      showError('Account is required');
      return;
    }
    // ... submit
  };
};

// Same validation in API route
export async function POST(request: Request) {
  const body = await request.json();
  
  // Duplicated validation logic
  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }
  if (!body.category_id) {
    return NextResponse.json({ error: 'Category is required' }, { status: 400 });
  }
  // ... more duplication
}
```

#### ✅ CORRECT: Centralized Validation

```tsx
// 1. Single source of truth (Zod schema)
import { z } from 'zod';

export const transactionSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000000, 'Amount too large'),
  category_id: z.number().int().positive('Category is required'),
  account_id: z.number().int().positive('Account is required'),
  date: z.string().datetime('Invalid date format'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER'])
});

export type TransactionInput = z.infer<typeof transactionSchema>;

// 2. Reusable validation hook
export const useTransactionValidation = () => {
  const validate = (data: unknown): { valid: boolean; errors: string[] } => {
    const result = transactionSchema.safeParse(data);
    
    if (result.success) {
      return { valid: true, errors: [] };
    }
    
    const errors = result.error.errors.map(err => err.message);
    return { valid: false, errors };
  };
  
  return { validate };
};

// 3. Frontend usage
const TransactionForm = () => {
  const { validate } = useTransactionValidation();
  
  const handleSubmit = () => {
    const { valid, errors } = validate(transaction);
    
    if (!valid) {
      errors.forEach(err => showError(err));
      return;
    }
    
    // Submit valid data
  };
};

// 4. Backend usage (same validation)
export async function POST(request: Request) {
  const body = await request.json();
  
  const result = transactionSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: result.error.errors
      }
    }, { status: 400 });
  }
  
  // Process valid data
  const transaction = result.data;
  // ...
}
```

**Benefits:**
- Single source of truth for validation rules
- Changes propagate automatically
- Type safety with TypeScript
- Consistent error messages

### Example 2: Repeated Data Transformations

#### ❌ WRONG: Duplicated Formatting

```tsx
// Formatting repeated everywhere
const TransactionRow = ({ transaction }) => (
  <tr>
    <td>{transaction.amount.toFixed(2)}</td>
    <td>{new Date(transaction.date).toLocaleDateString()}</td>
  </tr>
);

const TransactionCard = ({ transaction }) => (
  <Card>
    <Card.Body>
      Amount: {transaction.amount.toFixed(2)}
      Date: {new Date(transaction.date).toLocaleDateString()}
    </Card.Body>
  </Card>
);

// More duplication...
```

#### ✅ CORRECT: Utility Functions

```tsx
// 1. Centralized formatters
export const formatCurrency = (
  amount: number,
  currency: string = 'USD'
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

export const formatDate = (
  date: string | Date,
  format: 'short' | 'long' = 'short'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return d.toLocaleDateString('en-US');
};

export const formatTransactionAmount = (
  amount: number,
  type: TransactionType
): string => {
  const formatted = formatCurrency(Math.abs(amount));
  return type === 'INCOME' ? `+${formatted}` : `-${formatted}`;
};

// 2. Usage (DRY)
const TransactionRow = ({ transaction }) => (
  <tr>
    <td>{formatTransactionAmount(transaction.amount, transaction.type)}</td>
    <td>{formatDate(transaction.date)}</td>
  </tr>
);

const TransactionCard = ({ transaction }) => (
  <Card>
    <Card.Body>
      Amount: {formatTransactionAmount(transaction.amount, transaction.type)}
      Date: {formatDate(transaction.date, 'long')}
    </Card.Body>
  </Card>
);
```

---

## 💋 KISS Principle (Keep It Simple, Stupid)

> Simplicity should be a key goal; unnecessary complexity should be avoided.

### Example 1: Over-Engineering

#### ❌ WRONG: Unnecessary Abstraction

```tsx
// Over-engineered state machine for simple loading state
enum LoadingState {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

interface LoadingContext {
  state: LoadingState;
  data: any;
  error: Error | null;
}

class LoadingStateMachine {
  private state: LoadingState = LoadingState.IDLE;
  private listeners: Set<Function> = new Set();
  
  transition(newState: LoadingState) {
    this.state = newState;
    this.notify();
  }
  
  subscribe(listener: Function) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Complex usage for simple data fetching
const MyComponent = () => {
  const stateMachine = useRef(new LoadingStateMachine());
  const [state, setState] = useState(LoadingState.IDLE);
  
  useEffect(() => {
    return stateMachine.current.subscribe(setState);
  }, []);
  
  const fetchData = async () => {
    stateMachine.current.transition(LoadingState.PENDING);
    try {
      const data = await api.get('/data');
      stateMachine.current.transition(LoadingState.SUCCESS);
    } catch (error) {
      stateMachine.current.transition(LoadingState.ERROR);
    }
  };
  
  // ...
};
```

#### ✅ CORRECT: Simple Solution

```tsx
// Simple, clear, and sufficient
const MyComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.get('/data');
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;
  
  return <div>{/* render data */}</div>;
};

// Or even simpler with a custom hook
const MyComponent = () => {
  const { data, loading, error } = useFetch('/data');
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{/* render data */}</div>;
};
```

### Example 2: Complex Conditionals

#### ❌ WRONG: Nested Ternaries

```tsx
// Unreadable nested ternaries
const getStatusBadge = (transaction: Transaction) => {
  return transaction.status === 'cleared' 
    ? <Badge bg="success">Cleared</Badge>
    : transaction.status === 'pending'
    ? <Badge bg="warning">Pending</Badge>
    : transaction.status === 'scheduled'
    ? <Badge bg="info">Scheduled</Badge>
    : transaction.status === 'cancelled'
    ? <Badge bg="danger">Cancelled</Badge>
    : <Badge bg="secondary">Unknown</Badge>;
};
```

#### ✅ CORRECT: Simple Lookup

```tsx
// Clear and maintainable
const STATUS_CONFIG = {
  cleared: { variant: 'success', label: 'Cleared' },
  pending: { variant: 'warning', label: 'Pending' },
  scheduled: { variant: 'info', label: 'Scheduled' },
  cancelled: { variant: 'danger', label: 'Cancelled' }
} as const;

const getStatusBadge = (transaction: Transaction) => {
  const config = STATUS_CONFIG[transaction.status] || {
    variant: 'secondary',
    label: 'Unknown'
  };
  
  return <Badge bg={config.variant}>{config.label}</Badge>;
};
```

### Example 3: Premature Optimization

#### ❌ WRONG: Over-Optimization

```tsx
// Micro-optimizing before measuring
const TransactionList = ({ transactions }) => {
  // Unnecessary memoization of simple operation
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [transactions]);
  
  // Unnecessary optimization for small lists
  const virtualizedItems = useVirtualization(sortedTransactions, {
    itemHeight: 60,
    overscan: 5
  });
  
  // Complex intersection observer setup
  const observer = useIntersectionObserver(/* ... */);
  
  // ... complex render logic
};
```

#### ✅ CORRECT: Start Simple

```tsx
// Simple and clear first
const TransactionList = ({ transactions }) => {
  const sorted = transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  return (
    <div>
      {sorted.map(transaction => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
};

// Add optimization ONLY if performance issue is measured
// For example, virtualization only needed for 1000+ items
```

---

## ✅ Practical Application Checklist

Before writing code, ask yourself:

### SOLID
- [ ] Does this function/class have a single, well-defined purpose? (SRP)
- [ ] Can I add new features without modifying existing code? (OCP)
- [ ] Are my abstractions consistent and interchangeable? (LSP)
- [ ] Are interfaces focused and minimal? (ISP)
- [ ] Am I depending on interfaces, not implementations? (DIP)

### DRY
- [ ] Have I checked if similar code already exists?
- [ ] Can this logic be extracted into a utility function?
- [ ] Is validation centralized (one schema, not duplicated)?
- [ ] Are data transformations reused via helper functions?

### KISS
- [ ] Is this the simplest solution that could work?
- [ ] Am I adding unnecessary abstractions or patterns?
- [ ] Would someone new to the codebase understand this?
- [ ] Have I avoided premature optimization?

---

## 🎯 Refactoring Strategy

When refactoring code from `old`:

1. **Identify Responsibilities**: What does this component/function do?
2. **Extract Services**: Move API calls to service layer
3. **Extract Utilities**: Move reusable logic to utility functions
4. **Extract Hooks**: Move state management to custom hooks
5. **Simplify Components**: Components should mostly render UI
6. **Add Types**: Strong TypeScript types for safety
7. **Centralize Validation**: Use Zod schemas
8. **Test**: Write unit tests for extracted logic

### Before (old pattern)
```tsx
// 500+ line component with everything mixed together
const Transactions = () => {
  // Data fetching
  // Filtering logic
  // Sorting logic
  // UI state
  // Form handling
  // API calls
  // Validation
  // ... everything
};
```

### After (SOLID + DRY + KISS)
```tsx
// 1. Service layer
class TransactionService {
  async getAll(filters: TransactionFilters): Promise<Transaction[]> { /* ... */ }
}

// 2. Custom hooks
const useTransactions = (filters: TransactionFilters) => { /* ... */ };
const useTransactionFilters = () => { /* ... */ };

// 3. Utility functions
const filterTransactions = (txs: Transaction[], filters: Filters) => { /* ... */ };
const sortTransactions = (txs: Transaction[], sort: SortOption) => { /* ... */ };

// 4. Validation
const transactionSchema = z.object({ /* ... */ });

// 5. Simple component (< 100 lines)
const TransactionsPage: React.FC = () => {
  const { filters, setFilters } = useTransactionFilters();
  const { data, loading } = useTransactions(filters);
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <Container>
      <Row>
        <Col lg={3}>
          <FilterSidebar filters={filters} onChange={setFilters} />
        </Col>
        <Col lg={9}>
          <TransactionList transactions={data} />
        </Col>
      </Row>
    </Container>
  );
};
```

---

## 📚 Further Reading

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Don't Repeat Yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [KISS Principle](https://en.wikipedia.org/wiki/KISS_principle)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Remember: These principles are not about being dogmatic. They're about writing code that's easier to understand, maintain, and extend. Always balance principles with pragmatism.**
