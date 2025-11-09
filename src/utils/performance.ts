/**
 * Performance optimization utilities
 * Includes debounce, throttle, and performance monitoring
 */
// TODO: Replace generic performance helpers with targeted utilities.

/**
 * Debounce function - delays execution until after wait time has passed since last call
 * @param func Function to debounce
 * @param wait Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait period
 * @param func Function to throttle
 * @param wait Wait time in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttled(...lastArgs);
          lastArgs = null;
        }
      }, wait);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Performance monitoring class for measuring component render times
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring performance for a component
   */
  startMeasure(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(componentName)) {
        this.measurements.set(componentName, []);
      }
      
      this.measurements.get(componentName)!.push(duration);

      // Log if render time exceeds threshold (16ms = 60fps)
      if (duration > 16) {
        console.warn(`[Performance] ${componentName} render took ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Get average render time for a component
   */
  getAverageRenderTime(componentName: string): number | null {
    const times = this.measurements.get(componentName);
    if (!times || times.length === 0) {return null;}

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return average;
  }

  /**
   * Clear all measurements
   */
  clearMeasurements(): void {
    this.measurements.clear();
  }

  /**
   * Get performance report
   */
  getReport(): Record<string, { average: number; count: number; max: number; min: number }> {
    const report: Record<string, any> = {};

    this.measurements.forEach((times, componentName) => {
      if (times.length > 0) {
        report[componentName] = {
          average: times.reduce((sum, time) => sum + time, 0) / times.length,
          count: times.length,
          max: Math.max(...times),
          min: Math.min(...times),
        };
      }
    });

    return report;
  }
}

/**
 * Hook to measure component performance
 */
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const measureRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Start measurement when component mounts
    measureRef.current = monitor.startMeasure(componentName);

    return () => {
      // Complete measurement when component unmounts
      if (measureRef.current) {
        measureRef.current();
      }
    };
  }, [componentName, monitor]);
}

/**
 * Measure Web Vitals
 */
export function measureWebVitals(onPerfEntry?: (metric: any) => void) {
  if (onPerfEntry && typeof window !== 'undefined') {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry);
      onINP(onPerfEntry);
      onFCP(onPerfEntry);
      onLCP(onPerfEntry);
      onTTFB(onPerfEntry);
    }).catch((error) => {
      console.error('Failed to load web-vitals:', error);
    });
  }
}

/**
 * Memoization helper for expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
