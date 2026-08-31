'use client';

import React, { ReactNode } from 'react';
import { Container } from 'react-bootstrap';
import Header from './Header';
import ProtectedRoute from './ProtectedRoute';
import { TransactionProvider } from '@/context/TransactionContext';
import { DebtProvider } from '@/context/DebtContext';
import { GlobalTransactionModal } from './transactions/GlobalTransactionModal';
import { GlobalDebtModal } from './debt/GlobalDebtModal';
import { ModalBackCloseManager } from './ModalBackCloseManager';
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
            <ModalBackCloseManager />
          </div>
        </DebtProvider>
      </TransactionProvider>
    </ProtectedRoute>
  );
}
