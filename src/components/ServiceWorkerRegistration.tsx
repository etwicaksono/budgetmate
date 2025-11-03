'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[SW] Registration successful:', registration.scope);

            // Check for updates periodically
            const checkInterval = setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour

            // Clean up interval on unmount
            return () => clearInterval(checkInterval);
          })
          .catch((error) => {
            console.error('[SW] Registration failed:', error);
          });
      });

      // Listen for service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] New service worker activated');
      });

      // Handle offline/online events
      window.addEventListener('online', () => {
        console.log('[SW] Back online');
        // Trigger sync if needed
        if ('sync' in navigator.serviceWorker.registration) {
          navigator.serviceWorker.registration.sync.register('sync-transactions');
        }
      });

      window.addEventListener('offline', () => {
        console.log('[SW] Gone offline');
      });
    }
  }, []);

  return null;
}
