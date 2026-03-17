'use client';

import React, { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';
import { TransactionProvider } from '@/contexts/TransactionContext';
import { DebtProvider } from '@/contexts/DebtContext';
import { GlobalTransactionModal } from './transactions/GlobalTransactionModal';
import { GlobalDebtModal } from './debt/GlobalDebtModal';
import './AppLayout.css';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  return (
    <ProtectedRoute>
      <TransactionProvider>
        <DebtProvider>
          <div className="app">
            <Header />
            <main className="app-content">
              <Container fluid className="py-2">
                {children}
              </Container>
            </main>
            <GlobalTransactionModal />
            <GlobalDebtModal />
          </div>
        </DebtProvider>
      </TransactionProvider>
    </ProtectedRoute>
  );
}
