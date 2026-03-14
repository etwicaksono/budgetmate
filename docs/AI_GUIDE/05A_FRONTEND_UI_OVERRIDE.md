# 05A. Frontend UI Override - React Bootstrap Implementation

## 🚨 CRITICAL NOTICE

**Document 05 (FRONTEND_FOUNDATION.md) contains outdated UI framework recommendations.**

This addendum document **OVERRIDES** the UI framework sections in Document 05.

---

## ❌ IGNORE These Sections from Document 05

The following sections in `05_FRONTEND_FOUNDATION.md` should be **IGNORED**:

1. **Any references to Tailwind CSS** - Do NOT use Tailwind
2. **Any references to Shadcn UI** - Do NOT use Shadcn components
3. **The `cn` utility function** - Not needed with Bootstrap
4. **Any Tailwind-based component examples** - Replace with Bootstrap equivalents

---

## ✅ INSTEAD: Follow These Guidelines

### 1. UI Framework: React Bootstrap

**Install:**
```bash
npm install react-bootstrap bootstrap
npm install react-icons
npm install sweetalert2
npm install react-number-format
npm install @dnd-kit/core @dnd-kit/sortable
```

**Import Bootstrap CSS:**
```tsx
// app/layout.tsx or app/globals.css
import 'bootstrap/dist/css/bootstrap.min.css';
```

### 2. Component Patterns

#### Button Component

❌ **WRONG (from Document 05):**
```tsx
// Don't use this Tailwind-based button
import { cn } from '@/utils/cn';

export const Button = ({ className, variant = 'primary', ...props }) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md',
        'bg-primary text-white hover:bg-primary/90',
        className
      )}
      {...props}
    />
  );
};
```

✅ **CORRECT (React Bootstrap):**
```tsx
// Use React Bootstrap Button directly
import { Button } from 'react-bootstrap';

// Usage
<Button variant="primary" onClick={handleClick}>
  Save
</Button>

// With loading state
<Button variant="primary" disabled={loading}>
  {loading ? (
    <>
      <Spinner
        as="span"
        animation="border"
        size="sm"
        className="me-2"
      />
      Loading...
    </>
  ) : (
    'Save'
  )}
</Button>
```

#### Modal Component

❌ **WRONG (from Document 05):**
```tsx
// Don't use Headless UI Dialog
import { Dialog, Transition } from '@headlessui/react';

export function Modal({ isOpen, onClose, children }) {
  return (
    <Transition.Root show={isOpen}>
      <Dialog onClose={onClose}>
        {/* Headless UI implementation */}
      </Dialog>
    </Transition.Root>
  );
}
```

✅ **CORRECT (React Bootstrap):**
```tsx
// Use React Bootstrap Modal
import { Modal, Button, Form } from 'react-bootstrap';

interface TransactionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: any) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  show,
  onHide,
  onSave
}) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Add Transaction</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form>
          {/* Form fields */}
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
```

#### Card Component

❌ **WRONG (from Document 05):**
```tsx
// Don't use Tailwind-based card
export const Card = ({ className, ...props }) => (
  <div 
    className={cn('rounded-lg bg-white p-6 shadow', className)}
    {...props}
  />
);
```

✅ **CORRECT (React Bootstrap):**
```tsx
// Use React Bootstrap Card
import { Card } from 'react-bootstrap';

export const DashboardWidget: React.FC = ({ title, children, icon }) => (
  <Card className="shadow-sm h-100">
    <Card.Header className="bg-white border-bottom">
      <div className="d-flex align-items-center">
        {icon && <span className="me-2">{icon}</span>}
        <h5 className="mb-0">{title}</h5>
      </div>
    </Card.Header>
    <Card.Body>
      {children}
    </Card.Body>
  </Card>
);
```

#### Input Component

❌ **WRONG (from Document 05):**
```tsx
// Don't use Tailwind-styled input
export const Input = ({ className, ...props }) => (
  <input
    className={cn(
      'block w-full rounded-md border-gray-300',
      'focus:border-primary focus:ring-primary',
      className
    )}
    {...props}
  />
);
```

✅ **CORRECT (React Bootstrap):**
```tsx
// Use React Bootstrap Form.Control
import { Form } from 'react-bootstrap';

// Regular input
<Form.Group className="mb-3">
  <Form.Label>Description</Form.Label>
  <Form.Control
    type="text"
    placeholder="Enter description"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
  />
</Form.Group>

// Numeric input (for amounts)
import { NumericFormat } from 'react-number-format';

<Form.Group className="mb-3">
  <Form.Label>Amount</Form.Label>
  <NumericFormat
    customInput={Form.Control}
    thousandSeparator=","
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    allowNegative={false}
    value={amount}
    onValueChange={({ floatValue }) => setAmount(floatValue || 0)}
    placeholder="0.00"
  />
</Form.Group>
```

### 3. Layout Components

#### App Shell / Layout

❌ **WRONG (from Document 05):**
```tsx
// Don't use Tailwind flex utilities
<div className="flex h-screen bg-gray-50">
  <div className="hidden lg:flex lg:flex-shrink-0">
    <Sidebar />
  </div>
  <div className="flex flex-1 flex-col">
    <Header />
    <main className="flex-1 overflow-y-auto">
      {children}
    </main>
  </div>
</div>
```

✅ **CORRECT (React Bootstrap):**
```tsx
// Use Bootstrap Container and responsive classes
import { Container, Row, Col } from 'react-bootstrap';

export const AppShell: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="App d-flex flex-column min-vh-100">
      <Header />
      
      <Container fluid className="main-container flex-grow-1">
        {children}
      </Container>
      
      {/* Mobile Navigation */}
      <div className="d-lg-none">
        <MobileNav />
      </div>
    </div>
  );
};

// Page Layout Example
export const TransactionsPage: React.FC = () => {
  return (
    <Container>
      <Row>
        {/* Filter Sidebar - Desktop */}
        <Col lg={3} className="d-none d-lg-block">
          <FilterSidebar />
        </Col>
        
        {/* Main Content */}
        <Col lg={9}>
          <TransactionList />
        </Col>
      </Row>
      
      {/* Filter Offcanvas - Mobile */}
      <Offcanvas show={showFilters} onHide={() => setShowFilters(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <FilterSidebar />
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
};
```

### 4. Utility Classes

❌ **WRONG (Tailwind utilities):**
```tsx
<div className="flex items-center justify-between p-4 rounded-lg shadow-md">
  <span className="text-gray-700 font-medium">Label</span>
  <span className="text-blue-600">Value</span>
</div>
```

✅ **CORRECT (Bootstrap utilities):**
```tsx
<div className="d-flex align-items-center justify-content-between p-3 rounded shadow-sm">
  <span className="text-muted fw-medium">Label</span>
  <span className="text-primary">Value</span>
</div>
```

**Common Bootstrap Utility Mappings:**

| Tailwind | Bootstrap |
|----------|-----------|
| `flex` | `d-flex` |
| `items-center` | `align-items-center` |
| `justify-between` | `justify-content-between` |
| `p-4` | `p-3` or `p-4` |
| `rounded-lg` | `rounded` |
| `shadow-md` | `shadow-sm` |
| `text-gray-700` | `text-muted` |
| `font-medium` | `fw-medium` |
| `hidden lg:block` | `d-none d-lg-block` |
| `w-full` | `w-100` |
| `h-full` | `h-100` |
| `mt-4` | `mt-3` or `mt-4` |
| `mb-4` | `mb-3` or `mb-4` |

### 5. Styling Approach

**Use Custom CSS Classes (Not Inline Tailwind):**

```css
/* src/styles/App.css */

/* Main container */
.main-container {
  flex: 1;
  overflow: hidden;
  padding-top: 20px;
  padding-bottom: 40px;
}

@media (min-width: 992px) {
  .main-container {
    padding-left: 6rem;
    padding-right: 6rem;
  }
}

/* Card hover effect */
.widget-card {
  transition: box-shadow 0.3s ease;
}

.widget-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Transaction item */
.transaction-item {
  padding: 12px;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.2s ease;
}

.transaction-item:hover {
  background-color: #f8f9fa;
}
```

```tsx
// Usage in component
import './App.css';

const TransactionRow = ({ transaction }) => (
  <div className="transaction-item">
    {/* content */}
  </div>
);
```

### 6. Icons

**Use react-icons/fa:**

```tsx
import { 
  FaWallet, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaChevronDown,
  FaBars
} from 'react-icons/fa';

// Usage
<Button variant="primary">
  <FaPlus className="me-2" />
  Add Transaction
</Button>

// With color
<span style={{ color: category.color }}>
  <FaWallet size={20} />
</span>
```

### 7. Alerts and Toasts

**Use SweetAlert2:**

```tsx
import Swal from 'sweetalert2';

// Success toast
const showSuccessToast = (message: string) => {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
};

// Confirmation dialog
const confirmDelete = async (id: number) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    await deleteTransaction(id);
    showSuccessToast('Transaction deleted successfully');
  }
};
```

---

## 📋 Updated Component Checklist

When creating components, ensure:

- [ ] Using React Bootstrap components (`Button`, `Modal`, `Form`, `Card`, etc.)
- [ ] Using Bootstrap utility classes (`d-flex`, `mb-3`, etc.)
- [ ] Using react-icons/fa for icons
- [ ] Using SweetAlert2 for alerts/confirmations
- [ ] Using NumericFormat for amount inputs
- [ ] Using custom CSS classes for complex styling
- [ ] NO Tailwind classes (no `className="flex items-center..."`)
- [ ] NO Shadcn components
- [ ] NO Headless UI components

---

## 🎯 Quick Reference

**Always refer to:**
1. **[00A_UI_UX_REFERENCE.md](./00A_UI_UX_REFERENCE.md)** - For complete UI patterns and examples
2. **Old Project (`../old/`)** - For existing implementations
3. **[React Bootstrap Docs](https://react-bootstrap.github.io/)** - For component API

**Never use:**
1. ~~Tailwind CSS documentation~~
2. ~~Shadcn UI components~~
3. ~~Headless UI components~~

---

## ⚠️ Summary

When following Document 05 (FRONTEND_FOUNDATION.md):

1. **Read the document** for architectural patterns (contexts, hooks, services)
2. **IGNORE** all UI framework code examples (Tailwind/Shadcn)
3. **REPLACE** with React Bootstrap patterns from this document
4. **REFERENCE** the old project for exact UI implementation
5. **FOLLOW** SOLID/DRY/KISS principles from [00B_CODE_PRINCIPLES.md](./00B_CODE_PRINCIPLES.md)

---

**The goal is to maintain the EXACT look and feel of the old project while improving code quality with better architecture patterns.**
