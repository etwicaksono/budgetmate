# Implement Lazy Loading

## Objective
Implement comprehensive lazy loading to improve initial load time and reduce Time to Interactive (TTI).

## Implementation Prompt

```
Implement lazy loading strategies:

1. ROUTE-BASED CODE SPLITTING
- Lazy load all route components
- Add loading states for routes
- Implement error boundaries
- Prefetch critical routes

2. COMPONENT LAZY LOADING
- Lazy load heavy components
- Modal lazy loading
- Chart components on demand
- Form components when needed

3. IMAGE LAZY LOADING
- Use Next.js Image component
- Implement progressive loading
- Add blur placeholders
- Optimize image formats

4. DATA LAZY LOADING
- Infinite scroll for lists
- Pagination implementation
- Load more patterns
- Virtual scrolling

5. LIBRARY LAZY LOADING
- Dynamic imports for libraries
- Load polyfills conditionally
- Lazy load chart libraries
- Load icons on demand
```

## Implementation Examples

### 1. Route Lazy Loading
```typescript
// app/routes.tsx
import { lazy, Suspense } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'

// Lazy load all routes
const Dashboard = lazy(() => import('@/views/Dashboard'))
const Transactions = lazy(() => import('@/views/Transactions'))
const Accounts = lazy(() => import('@/views/Accounts'))
const Reports = lazy(() => import('@/views/Reports'))
const Settings = lazy(() => import('@/views/Settings'))
const Budgets = lazy(() => import('@/views/Budgets'))

// Route component with suspense
export function Routes() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/reports" component={Reports} />
        <Route path="/settings" component={Settings} />
        <Route path="/budgets" component={Budgets} />
      </Switch>
    </Suspense>
  )
}

// Prefetch critical routes
export function prefetchRoutes() {
  import('@/views/Dashboard')
  import('@/views/Transactions')
}
```

### 2. Component Lazy Loading
```typescript
// components/LazyChart.tsx
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/Skeleton'

const Chart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  {
    loading: () => <Skeleton height={300} />,
    ssr: false,
  }
)

// Lazy modal
const TransactionModal = dynamic(
  () => import('./TransactionModal'),
  {
    loading: () => null,
    ssr: false,
  }
)

// Usage with trigger
export function TransactionButton() {
  const [showModal, setShowModal] = useState(false)
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Add Transaction
      </button>
      {showModal && <TransactionModal />}
    </>
  )
}
```

### 3. Progressive Image Loading
```typescript
// components/LazyImage.tsx
import Image from 'next/image'
import { useState } from 'react'

export function LazyImage({ src, alt, ...props }) {
  const [isLoading, setIsLoading] = useState(true)
  
  return (
    <div className="image-container">
      {isLoading && <div className="image-skeleton" />}
      <Image
        src={src}
        alt={alt}
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,..."
        onLoadingComplete={() => setIsLoading(false)}
        {...props}
      />
    </div>
  )
}

// Intersection Observer for custom lazy loading
export function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true)
        observer.disconnect()
      }
    }, options)
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [ref, options])
  
  return isIntersecting
}
```

### 4. Infinite Scroll Implementation
```typescript
// hooks/useInfiniteScroll.ts
export function useInfiniteScroll(callback, hasMore) {
  const observer = useRef<IntersectionObserver>()
  
  const lastElementRef = useCallback(node => {
    if (!hasMore) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        callback()
      }
    })
    
    if (node) observer.current.observe(node)
  }, [callback, hasMore])
  
  return lastElementRef
}

// Usage in TransactionList
export function TransactionList() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(...)
  const lastElementRef = useInfiniteScroll(fetchNextPage, hasNextPage)
  
  return (
    <div>
      {data.pages.map((page, i) => (
        <Fragment key={i}>
          {page.items.map((item, j) => (
            <div
              key={item.id}
              ref={
                i === data.pages.length - 1 && 
                j === page.items.length - 1 
                  ? lastElementRef 
                  : null
              }
            >
              <TransactionItem {...item} />
            </div>
          ))}
        </Fragment>
      ))}
      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  )
}
```

### 5. Virtual Scrolling
```typescript
// Install: npm install react-window
import { FixedSizeList } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

export function VirtualTransactionList({ transactions }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TransactionItem {...transactions[index]} />
    </div>
  )
  
  return (
    <AutoSizer>
      {({ height, width }) => (
        <FixedSizeList
          height={height}
          width={width}
          itemCount={transactions.length}
          itemSize={80}
          overscanCount={5}
        >
          {Row}
        </FixedSizeList>
      )}
    </AutoSizer>
  )
}
```

### 6. Conditional Library Loading
```typescript
// utils/loadLibrary.ts
const libraryCache = new Map()

export async function loadLibrary(name: string) {
  if (libraryCache.has(name)) {
    return libraryCache.get(name)
  }
  
  let library
  
  switch(name) {
    case 'chart':
      library = await import('recharts')
      break
    case 'pdf':
      library = await import('jspdf')
      break
    case 'excel':
      library = await import('xlsx')
      break
    case 'qrcode':
      library = await import('qrcode')
      break
    default:
      throw new Error(`Unknown library: ${name}`)
  }
  
  libraryCache.set(name, library)
  return library
}

// Usage
export function ExportButton() {
  const handleExport = async (format) => {
    if (format === 'pdf') {
      const { jsPDF } = await loadLibrary('pdf')
      const doc = new jsPDF()
      // Generate PDF
    } else if (format === 'excel') {
      const XLSX = await loadLibrary('excel')
      // Generate Excel
    }
  }
  
  return (
    <Dropdown>
      <Dropdown.Item onClick={() => handleExport('pdf')}>
        Export PDF
      </Dropdown.Item>
      <Dropdown.Item onClick={() => handleExport('excel')}>
        Export Excel
      </Dropdown.Item>
    </Dropdown>
  )
}
```

### 7. Resource Hints
```typescript
// components/ResourceHints.tsx
import Head from 'next/head'

export function ResourceHints() {
  return (
    <Head>
      {/* Preconnect to API */}
      <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_BASE_URL} />
      
      {/* DNS prefetch for external resources */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      
      {/* Preload critical fonts */}
      <link
        rel="preload"
        href="/fonts/inter-var.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      
      {/* Prefetch next likely navigation */}
      <link rel="prefetch" href="/transactions" />
    </Head>
  )
}
```

## Loading States

### Skeleton Components
```typescript
// components/Skeleton.tsx
export function Skeleton({ 
  width, 
  height, 
  className = '',
  variant = 'rectangular' 
}) {
  return (
    <div 
      className={`skeleton ${variant} ${className}`}
      style={{ width, height }}
    />
  )
}

// CSS
.skeleton {
  animation: shimmer 2s infinite;
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

## Success Criteria
- [ ] All routes lazy loaded
- [ ] Heavy components load on demand
- [ ] Images use lazy loading
- [ ] Lists implement virtual scrolling
- [ ] Loading states for all async content
- [ ] TTI improved by 40%
