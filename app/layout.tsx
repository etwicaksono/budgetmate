import React from 'react';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../src/styles/main.css';
import '../src/styles/App.css';

import Providers from './providers';

export const metadata: Metadata = {
  title: 'My Finance Manager',
  icons: {
    icon: '/images/logo.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="App">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}