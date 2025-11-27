'use client';

import React, { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';
import { TransactionProvider } from '@/contexts/TransactionContext';
import { GlobalTransactionModal } from './transactions/GlobalTransactionModal';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <ProtectedRoute>
      <TransactionProvider>
        <div className="app">
          <Header />
          <main className="app-content">
            <Container fluid className="py-4">
              {children}
            </Container>
          </main>
          <GlobalTransactionModal />
        </div>
      </TransactionProvider>
    </ProtectedRoute>
  );
}
