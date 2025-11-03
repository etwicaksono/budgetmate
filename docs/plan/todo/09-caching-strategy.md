# Caching Strategy

## Objective
Implement comprehensive caching to reduce API calls, improve performance, and enable offline functionality.

## Implementation Prompt

```
Implement multi-layer caching strategy:

1. BROWSER CACHING
- Service Worker caching
- LocalStorage for user preferences
- SessionStorage for temporary data
- IndexedDB for large datasets

2. API RESPONSE CACHING
- React Query cache management
- SWR caching strategy
- Cache invalidation rules
- Optimistic updates

3. STATIC ASSET CACHING
- Next.js static optimization
- Image caching with CDN
- Font caching
- CSS/JS long-term caching

4. SERVER-SIDE CACHING
- Redis integration
- API response caching
- Database query caching
- Session caching

5. OFFLINE SUPPORT
- Service Worker offline mode
- Queue API calls when offline
- Sync when back online
- Offline indicators
```

## Implementation Details

### 1. Service Worker Setup
```typescript
// public/sw.js
const CACHE_NAME = 'finance-app-v1'
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
]

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

// Fetch event - serve from cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response
        }

        // Clone the request
        const fetchRequest = event.request.clone()

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Clone the response
          const responseToCache = response.clone()

          caches.open(CACHE_NAME)
            .then(cache => {
              // Cache API responses
              if (event.request.url.includes('/api/')) {
                cache.put(event.request, responseToCache)
              }
            })

          return response
        })
      })
      .catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('/offline.html')
        }
      })
  )
})

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
```

### 2. React Query Cache Configuration
```typescript
// lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Persist cache to localStorage
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
})

persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
})

// Cache strategies for different data types
export const cacheStrategies = {
  static: {
    staleTime: Infinity,
    cacheTime: Infinity,
  },
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  },
  transactions: {
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  reports: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
}
```

### 3. Custom Cache Hooks
```typescript
// hooks/useCache.ts
export function useCache() {
  const queryClient = useQueryClient()

  const setCache = useCallback((key: QueryKey, data: unknown) => {
    queryClient.setQueryData(key, data)
  }, [queryClient])

  const getCache = useCallback((key: QueryKey) => {
    return queryClient.getQueryData(key)
  }, [queryClient])

  const invalidateCache = useCallback((key: QueryKey) => {
    return queryClient.invalidateQueries(key)
  }, [queryClient])

  const prefetchData = useCallback(async (key: QueryKey, fetcher: () => Promise<unknown>) => {
    return queryClient.prefetchQuery(key, fetcher)
  }, [queryClient])

  return {
    setCache,
    getCache,
    invalidateCache,
    prefetchData,
  }
}

// Optimistic updates hook
export function useOptimisticUpdate() {
  const queryClient = useQueryClient()

  const optimisticUpdate = useCallback(async (
    key: QueryKey,
    updater: (old: any) => any,
    mutation: () => Promise<any>
  ) => {
    // Cancel in-flight queries
    await queryClient.cancelQueries(key)

    // Snapshot previous value
    const previousData = queryClient.getQueryData(key)

    // Optimistically update
    queryClient.setQueryData(key, updater)

    try {
      // Perform mutation
      const result = await mutation()
      
      // Update with real data
      queryClient.setQueryData(key, result)
      
      return result
    } catch (error) {
      // Revert on error
      queryClient.setQueryData(key, previousData)
      throw error
    }
  }, [queryClient])

  return optimisticUpdate
}
```

### 4. IndexedDB for Large Data
```typescript
// utils/indexedDB.ts
class IndexedDBCache {
  private db: IDBDatabase | null = null
  private dbName = 'FinanceAppCache'
  private version = 1

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create stores
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { 
            keyPath: 'id',
            autoIncrement: true 
          })
          transactionStore.createIndex('date', 'date')
          transactionStore.createIndex('account', 'accountId')
        }

        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' })
        }
      }
    })
  }

  async set(store: string, data: any) {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.put(data)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async get(store: string, key: any) {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.get(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getAll(store: string, index?: string, query?: IDBKeyRange) {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readonly')
      const objectStore = transaction.objectStore(store)
      
      const target = index 
        ? objectStore.index(index) 
        : objectStore
      
      const request = query 
        ? target.getAll(query) 
        : target.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async delete(store: string, key: any) {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.delete(key)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async clear(store: string) {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([store], 'readwrite')
      const objectStore = transaction.objectStore(store)
      const request = objectStore.clear()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
}

export const idbCache = new IndexedDBCache()
```

### 5. Offline Queue
```typescript
// utils/offlineQueue.ts
class OfflineQueue {
  private queue: Array<{
    id: string
    type: string
    payload: any
    timestamp: number
  }> = []

  constructor() {
    // Load queue from localStorage
    const saved = localStorage.getItem('offline_queue')
    if (saved) {
      this.queue = JSON.parse(saved)
    }

    // Listen for online/offline events
    window.addEventListener('online', () => this.processQueue())
    window.addEventListener('offline', () => this.notifyOffline())
  }

  add(type: string, payload: any) {
    const item = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      payload,
      timestamp: Date.now(),
    }

    this.queue.push(item)
    this.persist()

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue()
    }
  }

  async processQueue() {
    if (this.queue.length === 0) return

    const items = [...this.queue]
    this.queue = []

    for (const item of items) {
      try {
        await this.processItem(item)
      } catch (error) {
        // Re-add to queue if failed
        this.queue.push(item)
      }
    }

    this.persist()
  }

  private async processItem(item: any) {
    switch (item.type) {
      case 'CREATE_TRANSACTION':
        await transactionService.create(item.payload)
        break
      case 'UPDATE_ACCOUNT':
        await accountService.update(item.payload.id, item.payload.data)
        break
      // Add more cases as needed
    }
  }

  private persist() {
    localStorage.setItem('offline_queue', JSON.stringify(this.queue))
  }

  private notifyOffline() {
    // Show offline notification
    if (window.showToast) {
      window.showToast({
        type: 'warning',
        message: 'You are offline. Changes will be synced when connection is restored.',
      })
    }
  }
}

export const offlineQueue = new OfflineQueue()
```

### 6. Cache Headers Configuration
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, must-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

## Success Criteria
- [ ] Service Worker installed and caching
- [ ] React Query cache configured
- [ ] IndexedDB for large datasets
- [ ] Offline queue implemented
- [ ] Cache invalidation working
- [ ] Performance improved by 50%
