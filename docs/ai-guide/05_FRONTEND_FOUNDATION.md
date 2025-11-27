# 05. Frontend Foundation Implementation

## 🚨 UI FRAMEWORK NOTICE

**This project uses React Bootstrap as the primary UI framework, NOT Tailwind/Shadcn.**

- ✅ Use **React Bootstrap** components (Modal, Button, Form, Card, etc.)
- ✅ Use **react-icons/fa** for icons
- ✅ Use **SweetAlert2** for alerts and confirmations
- ✅ Use **NumericFormat** from react-number-format for currency inputs
- ✅ Use Bootstrap utility classes (`d-flex`, `mb-3`, etc.)
- ⚠️ Tailwind is available for utility classes only, not as primary UI
- ❌ Do NOT use Shadcn UI components
- ❌ Do NOT use Headless UI components

**See [05A_FRONTEND_UI_OVERRIDE.md](./05A_FRONTEND_UI_OVERRIDE.md) for detailed React Bootstrap patterns.**

---

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check Phase 3 frontend checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#phase-3-frontend-implementation)
4. 🧪 Write component tests as per [Document 14](./14_TESTING_REQUIREMENTS.md#frontend-component-tests)

## 🎨 UI Components and Layout Structure

### Step 1: Root Layout

Create `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Finance Manager - Personal Finance Tracking',
  description: 'Track expenses, manage budgets, and analyze your financial health',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Step 2: Providers Wrapper

Create `app/providers.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import { ToastProvider } from '@/context/ToastContext';
import { AuthStateProvider } from '@/context/AuthStateContext';
import { AuthProvider } from '@/context/AuthContext';
import { TransactionModalProvider } from '@/context/TransactionModalContext';

interface ProvidersProps {
  children: ReactNode;
}

// CRITICAL: Provider order matters due to dependencies
// Level 1: ToastProvider (no dependencies)
// Level 2: AuthStateProvider (depends on Toast)
// Level 3: AuthProvider (depends on AuthState and Toast)
// Level 4: TransactionModalProvider (depends on Auth)
export function Providers({ children }: ProvidersProps) {
  return (
    <ToastProvider>
      <AuthStateProvider>
        <AuthProvider>
          <TransactionModalProvider>
            {children}
          </TransactionModalProvider>
        </AuthProvider>
      </AuthStateProvider>
    </ToastProvider>
  );
}
```

## 🏗️ Layout Components

### App Shell Component

Create `src/components/layout/AppShell.tsx`:

```tsx
'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/common/Spinner';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Component

Create `src/components/layout/Sidebar.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FaHome, 
  FaWallet, 
  FaExchangeAlt, 
  FaTags, 
  FaChartPie, 
  FaCog,
  FaMoneyBillWave,
  FaChartBar
} from 'react-icons/fa';
import { cn } from '@/utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/', icon: FaHome },
  { name: 'Accounts', href: '/accounts', icon: FaWallet },
  { name: 'Transactions', href: '/transactions', icon: FaExchangeAlt },
  { name: 'Categories', href: '/categories', icon: FaTags },
  { name: 'Budgets', href: '/budgets', icon: FaMoneyBillWave },
  { name: 'Analytics', href: '/analytics', icon: FaChartBar },
  { name: 'Settings', href: '/settings', icon: FaCog },
];

export function Sidebar() {
  const pathname = usePathname();
  
  return (
    <div className="flex w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center">
          <FaChartPie className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-semibold text-white">
            Finance Manager
          </span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
                          (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon 
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary' : 'text-gray-400'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* User Info */}
      <div className="flex flex-shrink-0 border-t border-gray-800 p-4">
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-full bg-gray-700" />
          <div className="ml-3">
            <p className="text-sm font-medium text-white">User Name</p>
            <p className="text-xs text-gray-400">View profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Header Component

Create `src/components/layout/Header.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTransactionModal } from '@/context/TransactionModalContext';
import { 
  FaBars, 
  FaPlus, 
  FaBell, 
  FaUserCircle,
  FaSignOutAlt
} from 'react-icons/fa';
import { Button } from '@/components/common/Button';
import { DropdownMenu } from '@/components/common/DropdownMenu';

export function Header() {
  const { logout } = useAuth();
  const { openTransactionModal } = useTransactionModal();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  return (
    <header className="bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
        >
          <FaBars className="h-6 w-6" />
        </button>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => openTransactionModal()}
            className="flex items-center space-x-2"
            variant="primary"
          >
            <FaPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
        
        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full p-2 text-gray-400 hover:text-gray-500"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FaBell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center rounded-full p-2 text-gray-400 hover:text-gray-500"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <FaUserCircle className="h-6 w-6" />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                <button
                  onClick={logout}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FaSignOutAlt className="mr-3 h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
```

## 🧩 Common UI Components

### Button Component

Create `src/components/common/Button.tsx`:

```tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'hover:bg-gray-100 hover:text-gray-900',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

### Input Component

Create `src/components/common/Input.tsx`:

```tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'block w-full rounded-md border-gray-300 shadow-sm',
              'focus:border-primary focus:ring-primary sm:text-sm',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
              icon && 'pl-10',
              error && 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### Card Component

Create `src/components/common/Card.tsx`:

```tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white',
      bordered: 'bg-white border border-gray-200',
      elevated: 'bg-white shadow-lg',
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg p-6',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  )
);

CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';
```

### Modal Component

Create `src/components/common/Modal.tsx`:

```tsx
'use client';

import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FaTimes } from 'react-icons/fa';
import { cn } from '@/utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>
        
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all',
                  'sm:my-8 sm:w-full',
                  sizes[size]
                )}
              >
                {title && (
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <Dialog.Title className="text-lg font-semibold">
                      {title}
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={onClose}
                    >
                      <FaTimes className="h-5 w-5" />
                    </button>
                  </div>
                )}
                
                <div className="px-6 py-4">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
```

## 🎯 Utility Functions

### CN Utility (Class Names)

Create `src/utils/cn.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Format Utilities

Create `src/utils/format.ts`:

```typescript
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatNumber = (
  value: number,
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale).format(value);
};

export const formatDate = (
  date: Date | string,
  format: string = 'MMM dd, yyyy'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use date-fns or native Intl.DateTimeFormat
  return d.toLocaleDateString();
};

export const formatPercentage = (
  value: number,
  decimals: number = 1
): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatAccountType = (type: string): string => {
  const types: Record<string, string> = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    credit_card: 'Credit Card',
    cash: 'Cash',
    investment: 'Investment',
    loan: 'Loan',
  };
  return types[type] || type;
};

export const getTransactionSign = (type: string): string => {
  return type === 'income' ? '+' : '-';
};

export const getTransactionColor = (type: string): string => {
  return type === 'income' ? 'text-green-600' : 'text-red-600';
};
```

## 📱 Protected Routes

### RequireAuth Component

Create `src/components/layout/RequireAuth.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/common/Spinner';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({ children, redirectTo = '/login' }: RequireAuthProps) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, loading, redirectTo, router]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  return <>{children}</>;
}
```

### Authenticated App Layout

Create `app/(app)/layout.tsx`:

> **Note**: The `(app)` directory is a Next.js route group. It doesn't affect URLs but allows all pages inside to share the same layout. Pages will be at `/dashboard`, `/accounts`, `/transactions`, etc.

```tsx
import AppLayout from '@/components/AppLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
```

**AppLayout Component** (`src/components/AppLayout.tsx`):

```tsx
'use client';

import React, { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';
import { TransactionProvider } from '@/contexts/TransactionContext';
import { GlobalTransactionModal } from './transactions/GlobalTransactionModal';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <ProtectedRoute>
      <TransactionProvider>
        <div className="app">
          <Header />
          <main className="app-content">
            <Container fluid className="py-4">
              {children}
            </Container>
          </main>
          <GlobalTransactionModal />
        </div>
      </TransactionProvider>
    </ProtectedRoute>
  );
}
```

## ✅ Frontend Foundation Checklist

- [ ] Root layout with providers
- [ ] Provider hierarchy maintained
- [ ] AppLayout with header and protection
- [ ] (app) route group created with layout
- [ ] Common UI components created
- [ ] Utility functions implemented
- [ ] Protected route wrapper
- [ ] All authenticated pages use AppLayout
- [ ] Mobile responsive design
- [ ] Icon library integrated
- [ ] Navigation structure defined

## 🎯 Next Steps

1. Implement context providers from [06_CONTEXT_STATE_MANAGEMENT.md](./06_CONTEXT_STATE_MANAGEMENT.md)
2. Create auth pages (login/register)
3. Build dashboard pages
4. Implement transaction modal
5. Add chart components for analytics
