'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthStateProvider } from '../src/context/AuthStateContext';
import { AuthProvider } from '../src/context/AuthContext';
import { TransactionModalProvider } from '../src/context/TransactionModalContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthStateProvider>
        <AuthProvider>
          <TransactionModalProvider>
            {children}
          </TransactionModalProvider>
        </AuthProvider>
      </AuthStateProvider>
    </ToastProvider>
  );
}