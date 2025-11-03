/**
 * Data Prefetcher - Prefetches and caches critical data for improved performance
 */

import { batchRequest } from './requestBatcher';

interface PrefetchConfig {
  key: string;
  url: string;
  ttl?: number; // Time to live in milliseconds
  priority?: 'high' | 'medium' | 'low';
  dependencies?: string[]; // Keys of other data this depends on
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  loading: boolean;
  error?: Error;
  promise?: Promise<any>;
}

class DataPrefetcher {
  private cache: Map<string, CacheEntry> = new Map();
  private prefetchQueue: PrefetchConfig[] = [];
  private isProcessing = false;
  private observers: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Register data to prefetch
   */
  register(configs: PrefetchConfig[]): void {
    configs.forEach(config => {
      // Sort by priority
      const priority = config.priority || 'medium';
      const index = this.getPriorityIndex(priority);
      this.prefetchQueue.splice(index, 0, config);
    });
  }

  /**
   * Get priority index for insertion
   */
  private getPriorityIndex(priority: 'high' | 'medium' | 'low'): number {
    const priorities = { high: 0, medium: 1, low: 2 };
    const targetPriority = priorities[priority];
    
    return this.prefetchQueue.findIndex(item => {
      const itemPriority = priorities[item.priority || 'medium'];
      return itemPriority > targetPriority;
    });
  }

  /**
   * Start prefetching process
   */
  async startPrefetching(): Promise<void> {
    if (this.isProcessing || this.prefetchQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.prefetchQueue.length > 0) {
      const config = this.prefetchQueue.shift()!;
      
      // Check dependencies
      if (config.dependencies && config.dependencies.length > 0) {
        const allDependenciesLoaded = config.dependencies.every(dep => 
          this.cache.has(dep) && !this.cache.get(dep)!.loading
        );

        if (!allDependenciesLoaded) {
          // Re-queue if dependencies not ready
          this.prefetchQueue.push(config);
          continue;
        }
      }

      // Start prefetching
      this.prefetch(config).catch(error => {
        console.error(`Failed to prefetch ${config.key}:`, error);
      });

      // Add small delay between prefetches to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
  }

  /**
   * Prefetch data for a specific key
   */
  private async prefetch(config: PrefetchConfig): Promise<void> {
    const { key, url, ttl = 5 * 60 * 1000 } = config; // Default 5 minutes TTL

    // Check if already cached and valid
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return;
    }

    // Mark as loading
    const promise = this.fetchData(url);
    this.cache.set(key, {
      data: cached?.data || null,
      timestamp: Date.now(),
      ttl,
      loading: true,
      promise,
    });

    try {
      const data = await promise;
      
      // Update cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        loading: false,
      });

      // Notify observers
      this.notifyObservers(key, data);
    } catch (error) {
      // Keep old data if available, but mark as error
      this.cache.set(key, {
        data: cached?.data || null,
        timestamp: cached?.timestamp || Date.now(),
        ttl,
        loading: false,
        error: error as Error,
      });
      
      throw error;
    }
  }

  /**
   * Fetch data from URL
   */
  private async fetchData(url: string): Promise<any> {
    // Use batch request for better performance
    const response = await batchRequest({
      url,
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch data');
    }

    return response.data;
  }

  /**
   * Get data from cache or fetch if needed
   */
  async get(key: string, url?: string): Promise<any> {
    const cached = this.cache.get(key);

    // If valid cache exists, return it
    if (cached && !this.isExpired(cached) && !cached.loading) {
      return cached.data;
    }

    // If currently loading, wait for it
    if (cached?.loading && cached.promise) {
      return cached.promise;
    }

    // If URL provided, fetch it
    if (url) {
      const promise = this.prefetch({ key, url });
      return promise.then(() => this.cache.get(key)?.data);
    }

    // Return stale data if available
    if (cached?.data) {
      // Trigger background refresh
      if (url) {
        this.prefetch({ key, url }).catch(console.error);
      }
      return cached.data;
    }

    return null;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Invalidate cache for a key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    this.observers.clear();
  }

  /**
   * Subscribe to data changes
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }

    this.observers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.observers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.observers.delete(key);
        }
      }
    };
  }

  /**
   * Notify observers of data changes
   */
  private notifyObservers(key: string, data: any): void {
    const callbacks = this.observers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Observer callback error:', error);
        }
      });
    }
  }

  /**
   * Prefetch critical data on app initialization
   */
  async prefetchCriticalData(): Promise<void> {
    const criticalData: PrefetchConfig[] = [
      {
        key: 'user-profile',
        url: '/api/user/profile',
        priority: 'high',
        ttl: 10 * 60 * 1000, // 10 minutes
      },
      {
        key: 'accounts',
        url: '/api/accounts',
        priority: 'high',
        ttl: 5 * 60 * 1000, // 5 minutes
      },
      {
        key: 'categories',
        url: '/api/categories',
        priority: 'medium',
        ttl: 30 * 60 * 1000, // 30 minutes
      },
      {
        key: 'recent-transactions',
        url: '/api/transactions?limit=20',
        priority: 'medium',
        ttl: 2 * 60 * 1000, // 2 minutes
        dependencies: ['accounts'], // Load after accounts
      },
      {
        key: 'dashboard-stats',
        url: '/api/dashboard/stats',
        priority: 'low',
        ttl: 5 * 60 * 1000, // 5 minutes
        dependencies: ['accounts', 'recent-transactions'],
      },
    ];

    this.register(criticalData);
    await this.startPrefetching();
  }
}

// Create singleton instance
const dataPrefetcher = new DataPrefetcher();

// Export convenient functions
export const prefetchData = dataPrefetcher.get.bind(dataPrefetcher);
export const invalidateCache = dataPrefetcher.invalidate.bind(dataPrefetcher);
export const clearCache = dataPrefetcher.clearAll.bind(dataPrefetcher);
export const subscribeToData = dataPrefetcher.subscribe.bind(dataPrefetcher);
export const prefetchCriticalData = dataPrefetcher.prefetchCriticalData.bind(dataPrefetcher);

export default dataPrefetcher;
