import React from 'react';
import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../src/styles/main.css';
import '../src/styles/App.css';

import Providers from './providers';
// TODO: Revisit global layout once shell/navigation work begins.
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { WebVitalsReporter } from '../src/components/WebVitalsReporter';
import { ServiceWorkerRegistration } from '../src/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'My Finance Manager',
  description: 'A comprehensive personal finance management application',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/images/logo-image-only.svg', type: 'image/svg+xml' },
      { url: '/images/favicon.png', type: 'image/png' }
    ],
    shortcut: '/images/logo-image-only.svg',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d6efd',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>
            <div className="App">
              {children}
            </div>
          </Providers>
        </ErrorBoundary>
        <WebVitalsReporter />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}