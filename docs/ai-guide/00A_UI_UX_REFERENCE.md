# 00A. UI/UX Reference - Old Project Analysis

## 🎯 CRITICAL: UI/UX Consistency Requirements

**This document is MANDATORY reading before implementing ANY frontend component.**

The rewritten application MUST maintain **pixel-perfect visual consistency** and **identical user experience** with the existing application located at `../old/`.

---

## 📂 Reference Project Structure

All UI/UX implementations should reference the existing codebase:
- **Location**: `../old/`
- **Structure**: See `../old/TREE.md`

### Key Reference Directories

```
old/
├── src/
│   ├── views/           # Page-level components (YOUR PRIMARY REFERENCE)
│   │   ├── Dashboard/
│   │   ├── Transactions/
│   │   ├── Accounts/
│   │   ├── Analytics/
│   │   ├── Budgets/
│   │   ├── settings/
│   │   └── Login/Register/
│   ├── components/      # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Records/     # Transaction list components
│   │   ├── PeriodNavigation.tsx
│   │   ├── AddAccountModal.tsx
│   │   └── WidgetCards.tsx
│   └── styles/          # CSS styling
│       ├── App.css      # Main styles
│       └── main.css     # Global styles
```

---

## 🎨 Technology Stack Requirements

### ✅ MUST USE (From Old Project)

| Technology | Purpose | Notes |
|------------|---------|-------|
| **React Bootstrap** | UI Framework | NOT Tailwind CSS, NOT Shadcn UI |
| **react-icons/fa** | Icon Library | Font Awesome icons via react-icons |
| **SweetAlert2** | Alert/Confirm Dialogs | For user confirmations and notifications |
| **react-number-format** | Numeric Input | NumericFormat component for amount inputs |
| **@dnd-kit** | Drag & Drop | For sortable widgets and lists |
| **react-bootstrap/Offcanvas** | Mobile Menus | Mobile-first responsive navigation |
| **Custom CSS** | Styling | See `src/styles/App.css` |

### ❌ DO NOT USE

- ~~Tailwind CSS~~ (Old project uses Bootstrap + Custom CSS)
- ~~Shadcn UI~~ (Old project uses React Bootstrap)
- ~~Headless UI~~ (Use React Bootstrap components)
- ~~Radix UI~~ (Use React Bootstrap components)

---

## 🏗️ Component Architecture Patterns

### 1. Layout Structure (Reference: `Header.tsx`)

```tsx
// CORRECT Pattern from old/src/components/Header.tsx
import { Container, Dropdown, Offcanvas, Button } from 'react-bootstrap';
import { FaBars, FaPlus, FaSignOutAlt } from 'react-icons/fa';

const Header: React.FC = () => {
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="header-desktop">
        <Container fluid>
          {/* Navigation items */}
        </Container>
      </nav>
      
      {/* Mobile Offcanvas Sidebar */}
      <Offcanvas show={showSidebar} onHide={handleClose}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {/* Mobile navigation items */}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};
```

**Key Patterns:**
- Use `Container` for responsive width
- Use `Offcanvas` for mobile menus (NOT drawer or sheet components)
- Use Bootstrap classes for responsiveness (`d-none d-lg-block`)

### 2. Modal Pattern (Reference: `TransactionModal.tsx`)

```tsx
// CORRECT Pattern from old/src/views/Transactions/TransactionModal.tsx
import { Modal, Form, Button, Row, Col, InputGroup } from 'react-bootstrap';

const TransactionModal: React.FC<Props> = ({ show, onHide, transaction }) => {
  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg" 
      centered
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {transaction ? 'Edit Transaction' : 'Add Transaction'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Form>
          <Row>
            <Col xs={12} md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Amount</Form.Label>
                <Form.Control 
                  type="number" 
                  value={amount}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
```

**Key Patterns:**
- Use React Bootstrap `Modal` component
- Always use `backdrop="static"` for data entry modals
- Use `size="lg"` for complex forms
- Use Bootstrap Grid (`Row`, `Col`) inside modal body

### 3. Card/Widget Pattern (Reference: `WidgetCards.tsx`)

```tsx
// CORRECT Pattern from old/src/components/WidgetCards.tsx
import { Card } from 'react-bootstrap';
import { FaWallet } from 'react-icons/fa';

const WidgetCard: React.FC<Props> = ({ title, children, icon }) => {
  return (
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
};
```

**Key Patterns:**
- Use `Card` component with `Card.Header` and `Card.Body`
- Use Bootstrap utility classes (`d-flex`, `align-items-center`, `mb-0`)
- Use `shadow-sm` for elevation
- Use `h-100` for full-height cards in grid layouts

### 4. Filter Sidebar Pattern (Reference: `DesktopFilterSidebar.tsx`)

```tsx
// CORRECT Pattern from old
import { Form, Accordion } from 'react-bootstrap';

const FilterSidebar: React.FC = () => {
  return (
    <div className="filter-sidebar">
      <Accordion defaultActiveKey={['0']} alwaysOpen>
        <Accordion.Item eventKey="0">
          <Accordion.Header>Date Range</Accordion.Header>
          <Accordion.Body>
            <Form.Group>
              <Form.Label>From</Form.Label>
              <Form.Control type="date" />
            </Form.Group>
          </Accordion.Body>
        </Accordion.Item>
        
        <Accordion.Item eventKey="1">
          <Accordion.Header>Categories</Accordion.Header>
          <Accordion.Body>
            {/* Filter options */}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
```

**Key Patterns:**
- Use `Accordion` for collapsible filter sections
- Use `alwaysOpen` to allow multiple open sections
- Group related filters in accordion items

---

## 🎨 Styling Guidelines

### CSS Architecture (Reference: `src/styles/App.css`)

```css
/* CORRECT Pattern from old/src/styles/App.css */

/* 1. Main Container Padding */
.main-container {
  flex: 1;
  overflow: hidden;
  padding-top: 20px;
  padding-bottom: 40px;
}

/* Desktop only padding */
@media (min-width: 992px) {
  .main-container {
    padding-left: 6rem;
    padding-right: 6rem;
  }
}

/* 2. Sidebar Patterns */
.analytics-sidebar-container {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 10px;
}

.analytics-sidebar {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 3. Interactive Hover States */
.category-item {
  transition: background-color 0.2s ease;
}

.category-item:hover {
  background-color: #f8f9fa;
}

/* 4. Card Elevation */
.card {
  transition: box-shadow 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

**Styling Rules:**
1. **Use Custom CSS Classes**: Don't rely solely on Bootstrap utilities
2. **Responsive Padding**: Desktop gets more padding (6rem), mobile is compact
3. **Consistent Shadows**: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)`
4. **Smooth Transitions**: All interactive elements should have transitions
5. **Border Radius**: Consistent `8px` for cards and panels

---

## 📊 Specific UI Components Reference

### Transaction List (Reference: `components/Records/RecordsList.tsx`)

```tsx
// Pattern: Virtual scrolling for performance
import { FixedSizeList } from 'react-window';

const RecordsList: React.FC<Props> = ({ transactions, onEdit, onDelete }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={transactions.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style} className="transaction-item">
          {/* Transaction row content */}
        </div>
      )}
    </FixedSizeList>
  );
};
```

**Key Points:**
- Use `react-window` for virtualization with large lists
- Transaction rows should be ~80px height
- Include hover states and action buttons

### Period Navigation (Reference: `components/PeriodNavigation.tsx`)

```tsx
// Pattern: Context-based date range management
import { ButtonGroup, Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PeriodNavigation: React.FC = () => {
  const { period, goToPrevious, goToNext, currentLabel } = usePeriodNavigation();
  
  return (
    <div className="d-flex justify-content-between align-items-center">
      <ButtonGroup>
        <Button variant="outline-primary" size="sm" onClick={goToPrevious}>
          <FaChevronLeft />
        </Button>
        <Button variant="outline-primary" size="sm" disabled>
          {currentLabel}
        </Button>
        <Button variant="outline-primary" size="sm" onClick={goToNext}>
          <FaChevronRight />
        </Button>
      </ButtonGroup>
    </div>
  );
};
```

**Key Points:**
- Use `ButtonGroup` for connected buttons
- Use chevron icons for navigation
- Middle button shows current period (disabled)

### Numeric Amount Input (Reference: `TransactionModal.tsx`)

```tsx
// Pattern: NumericFormat from react-number-format
import { NumericFormat } from 'react-number-format';

<Form.Group>
  <Form.Label>Amount</Form.Label>
  <NumericFormat
    customInput={Form.Control}
    thousandSeparator=","
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    allowNegative={false}
    value={amount}
    onValueChange={({ floatValue }) => {
      setAmount(floatValue || 0);
    }}
    placeholder="0.00"
  />
</Form.Group>
```

**Key Points:**
- Always use `NumericFormat` for money inputs
- Always use 2 decimal places
- Use thousand separators
- Don't allow negative input (handle sign separately)

### Category Dropdown (Reference: `CategoryDropdown.tsx`)

```tsx
// Pattern: Hierarchical category selection with icons and colors
import { Dropdown } from 'react-bootstrap';
import * as FaIcons from 'react-icons/fa';

const CategoryDropdown: React.FC<Props> = ({ categories, onSelect }) => {
  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-secondary">
        {selectedCategory ? (
          <>
            <span style={{ color: category.color }}>
              {renderIcon(category.icon)}
            </span>
            {category.name}
          </>
        ) : (
          'Select Category'
        )}
      </Dropdown.Toggle>
      
      <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {categories.map(parent => (
          <React.Fragment key={parent.id}>
            <Dropdown.Header>
              <span style={{ color: parent.color }}>
                {renderIcon(parent.icon)}
              </span>
              {parent.name}
            </Dropdown.Header>
            {parent.children.map(child => (
              <Dropdown.Item onClick={() => onSelect(child)}>
                <span className="ms-3">{child.name}</span>
              </Dropdown.Item>
            ))}
            <Dropdown.Divider />
          </React.Fragment>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
};
```

**Key Points:**
- Show parent categories as headers
- Indent child categories
- Show category color and icon
- Limit dropdown height with scrolling

### Dashboard Widgets (Reference: `Dashboard.tsx`)

```tsx
// Pattern: Drag-and-drop sortable widgets
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

const Dashboard: React.FC = () => {
  const [widgetOrder, setWidgetOrder] = useState(DEFAULT_WIDGET_ORDER);
  
  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
        <Row>
          {widgetOrder.map(widgetId => (
            <Col key={widgetId} xs={12} lg={6} className="mb-4">
              <SortableWidgetCard id={widgetId}>
                {renderWidget(widgetId)}
              </SortableWidgetCard>
            </Col>
          ))}
        </Row>
      </SortableContext>
    </DndContext>
  );
};
```

**Key Points:**
- Widgets should be draggable and sortable
- Save widget order to localStorage
- 2-column layout on desktop, 1-column on mobile
- Each widget wrapped in Card component

---

## 🔄 Responsive Design Patterns

### Bootstrap Breakpoints (Reference across all views)

```tsx
// CORRECT: Use Bootstrap responsive utilities

// Desktop/Mobile Split
<div className="d-none d-lg-block">Desktop Content</div>
<div className="d-lg-none">Mobile Content</div>

// Grid Responsiveness
<Row>
  <Col xs={12} md={6} lg={4}>
    {/* Full width mobile, half tablet, third desktop */}
  </Col>
</Row>

// Spacing Responsiveness
<div className="p-2 p-md-3 p-lg-4">
  {/* 8px mobile, 16px tablet, 24px desktop */}
</div>

// Typography Responsiveness
<h2 className="fs-4 fs-md-3 fs-lg-2">
  {/* Responsive font sizes */}
</h2>
```

**Breakpoints:**
- `xs`: < 576px (mobile)
- `sm`: ≥ 576px (large mobile)
- `md`: ≥ 768px (tablet)
- `lg`: ≥ 992px (desktop)
- `xl`: ≥ 1200px (large desktop)

---

## 🎭 Interactive Behaviors

### 1. Confirmation Dialogs (SweetAlert2)

```tsx
import Swal from 'sweetalert2';

// Delete Confirmation
const handleDelete = async (id: number) => {
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
    Swal.fire('Deleted!', 'Transaction has been deleted.', 'success');
  }
};

// Success Toast
Swal.fire({
  toast: true,
  position: 'top-end',
  icon: 'success',
  title: 'Transaction saved successfully',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});
```

### 2. Loading States

```tsx
// Inline Loading
<Button variant="primary" disabled={loading}>
  {loading ? (
    <>
      <Spinner
        as="span"
        animation="border"
        size="sm"
        role="status"
        aria-hidden="true"
        className="me-2"
      />
      Loading...
    </>
  ) : (
    'Save'
  )}
</Button>

// Page Loading Overlay
{isLoading && (
  <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 9999 }}>
    <Spinner animation="border" variant="primary" />
  </div>
)}
```

### 3. Empty States

```tsx
// Empty List State
{transactions.length === 0 && (
  <div className="text-center py-5">
    <FaInbox size={64} className="text-muted mb-3" />
    <h5 className="text-muted">No transactions found</h5>
    <p className="text-muted">
      Click the "Add Transaction" button to get started
    </p>
    <Button variant="primary" onClick={onAdd}>
      <FaPlus className="me-2" />
      Add Transaction
    </Button>
  </div>
)}
```

---

## 📋 Implementation Checklist

Before implementing ANY page or component, verify:

- [ ] Referenced the equivalent component/view in `../old/`
- [ ] Using React Bootstrap components (NOT Tailwind/Shadcn)
- [ ] Using `react-icons/fa` for icons
- [ ] Using SweetAlert2 for confirmations
- [ ] Using NumericFormat for amount inputs
- [ ] Following Bootstrap grid system (Container, Row, Col)
- [ ] Using Bootstrap utility classes for spacing/layout
- [ ] Implementing responsive behavior matching old project
- [ ] Adding custom CSS classes where needed (see App.css)
- [ ] Including hover states and transitions
- [ ] Handling loading states consistently
- [ ] Providing empty states for lists
- [ ] Using consistent shadows and border radius

---

## 🚨 Common Mistakes to Avoid

### ❌ WRONG: Using Tailwind CSS
```tsx
// DON'T DO THIS
<div className="flex items-center justify-between p-4 rounded-lg shadow-md">
```

### ✅ CORRECT: Using Bootstrap + Custom CSS
```tsx
// DO THIS
<div className="d-flex align-items-center justify-content-between p-3 rounded shadow-sm">
```

### ❌ WRONG: Custom Modal Implementation
```tsx
// DON'T DO THIS
<Dialog open={open} onClose={onClose}>
```

### ✅ CORRECT: React Bootstrap Modal
```tsx
// DO THIS
<Modal show={show} onHide={onHide}>
```

### ❌ WRONG: Plain Number Input
```tsx
// DON'T DO THIS
<input type="number" value={amount} />
```

### ✅ CORRECT: NumericFormat Component
```tsx
// DO THIS
<NumericFormat
  customInput={Form.Control}
  thousandSeparator=","
  decimalScale={2}
  value={amount}
/>
```

---

## 🎯 Next Steps

1. **Read this document completely** before starting ANY frontend work
2. **Keep the old project open** in a separate editor/browser tab
3. **Reference specific files** when implementing similar features
4. **Test visual consistency** by comparing side-by-side with old project
5. **Follow the patterns exactly** - don't try to "improve" the UI without explicit instruction

---

**Remember: The goal is NOT to create a "better" UI, but to maintain EXACT visual and behavioral consistency while improving code quality (SOLID, DRY, KISS).**
