/**
 * Request Batcher - Batches multiple API requests to reduce network overhead
 */

type BatchRequest = {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
};

type BatchResponse = {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
};

type PendingRequest = {
  request: BatchRequest;
  resolve: (value: BatchResponse) => void;
  reject: (error: any) => void;
};

class RequestBatcher {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private batchDelay: number;
  private maxBatchSize: number;
  private batchEndpoint: string;

  constructor(options?: {
    batchDelay?: number;
    maxBatchSize?: number;
    batchEndpoint?: string;
  }) {
    this.batchDelay = options?.batchDelay || 10; // 10ms default delay
    this.maxBatchSize = options?.maxBatchSize || 10; // Max 10 requests per batch
    this.batchEndpoint = options?.batchEndpoint || '/api/batch';
  }

  /**
   * Add a request to the batch queue
   */
  async addRequest(request: BatchRequest): Promise<BatchResponse> {
    return new Promise((resolve, reject) => {
      const key = this.generateKey(request);
      
      // Check if we have a pending identical request
      if (this.pendingRequests.has(key)) {
        // Attach to existing request
        this.pendingRequests.get(key)!.push({ request, resolve, reject });
      } else {
        // Create new pending request
        this.pendingRequests.set(key, [{ request, resolve, reject }]);
      }

      // Check if we should flush immediately due to batch size
      if (this.getTotalPendingCount() >= this.maxBatchSize) {
        this.flush();
      } else {
        // Schedule batch processing
        this.scheduleBatch();
      }
    });
  }

  /**
   * Generate a unique key for deduplication
   */
  private generateKey(request: BatchRequest): string {
    return `${request.method}:${request.url}:${JSON.stringify(request.body || {})}`;
  }

  /**
   * Get total number of pending requests
   */
  private getTotalPendingCount(): number {
    let count = 0;
    this.pendingRequests.forEach(requests => {
      count += requests.length;
    });
    return count;
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flush();
    }, this.batchDelay);
  }

  /**
   * Flush all pending requests
   */
  private async flush(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingRequests.size === 0) {
      return;
    }

    // Get all unique requests
    const requests: BatchRequest[] = [];
    const requestMap = new Map<string, PendingRequest[]>();

    this.pendingRequests.forEach((pendingList, key) => {
      if (pendingList.length > 0) {
        requests.push(pendingList[0].request);
        requestMap.set(key, pendingList);
      }
    });

    // Clear pending requests
    this.pendingRequests.clear();

    // Execute batch request
    try {
      const responses = await this.executeBatch(requests);

      // Resolve promises
      responses.forEach((response, index) => {
        const key = this.generateKey(requests[index]);
        const pendingList = requestMap.get(key);
        
        if (pendingList) {
          pendingList.forEach(({ resolve, reject }) => {
            if (response.success) {
              resolve(response);
            } else {
              reject(new Error(response.error || 'Request failed'));
            }
          });
        }
      });
    } catch (error) {
      // Reject all promises on batch failure
      requestMap.forEach(pendingList => {
        pendingList.forEach(({ reject }) => {
          reject(error);
        });
      });
    }
  }

  /**
   * Execute batch request
   */
  private async executeBatch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    try {
      const response = await fetch(this.batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.responses || [];
    } catch (error) {
      // Fallback to individual requests if batch fails
      console.warn('Batch request failed, falling back to individual requests', error);
      return this.executeFallback(requests);
    }
  }

  /**
   * Execute requests individually as fallback
   */
  private async executeFallback(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const promises = requests.map(async (request) => {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const data = await response.json();
        
        return {
          success: response.ok,
          data,
          statusCode: response.status,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Request failed',
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Reject all pending requests
    this.pendingRequests.forEach(pendingList => {
      pendingList.forEach(({ reject }) => {
        reject(new Error('Batch cancelled'));
      });
    });
    
    this.pendingRequests.clear();
  }
}

// Create singleton instance
const requestBatcher = new RequestBatcher();

/**
 * Batch multiple API requests
 */
export async function batchRequest(request: BatchRequest): Promise<BatchResponse> {
  return requestBatcher.addRequest(request);
}

/**
 * Create a custom batcher instance
 */
export function createBatcher(options?: {
  batchDelay?: number;
  maxBatchSize?: number;
  batchEndpoint?: string;
}): RequestBatcher {
  return new RequestBatcher(options);
}

export default requestBatcher;
