'use client';

import { useEffect } from 'react';
import { measureWebVitals } from '../utils/performance';

/**
 * Web Vitals Reporter Component
 * Tracks and reports Core Web Vitals metrics
 */
export function WebVitalsReporter() {
  useEffect(() => {
    // Only measure web vitals in production or when explicitly enabled
    const shouldMeasure =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_MEASURE_WEB_VITALS === 'true';

    if (shouldMeasure) {
      measureWebVitals((metric) => {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[Web Vitals]', {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          });
        }

        // Send to analytics service in production
        if (process.env.NODE_ENV === 'production') {
          // TODO: Send to your analytics service
          // Example: analytics.track('web-vital', metric)
        }

        // Performance thresholds
        const thresholds = {
          CLS: 0.1,    // Cumulative Layout Shift
          FID: 100,    // First Input Delay (ms)
          FCP: 1800,   // First Contentful Paint (ms)
          LCP: 2500,   // Largest Contentful Paint (ms)
          TTFB: 600,   // Time to First Byte (ms)
        };

        // Warn if metrics exceed thresholds
        const threshold = thresholds[metric.name as keyof typeof thresholds];
        if (threshold && metric.value > threshold) {
          console.warn(
            `[Performance Warning] ${metric.name} exceeds threshold:`,
            `${metric.value.toFixed(2)} > ${threshold}`
          );
        }
      });
    }
  }, []);

  return null;
}
