'use client';
import React from 'react';
import Transactions from '../../src/features/transactions/Transactions';
import ProtectedShell from '../components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Transactions />
    </ProtectedShell>
  );
}
