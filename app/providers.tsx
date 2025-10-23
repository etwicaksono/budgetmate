'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider } from '../src/context/AuthContext';
import { TransactionModalProvider } from '../src/context/TransactionModalContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TransactionModalProvider>
        {children}
      </TransactionModalProvider>
    </AuthProvider>
  );
}