'use client';
import React from 'react';
import Budgets from '../../src/views/Budgets/Budgets';
import ProtectedShell from '../components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Budgets />
    </ProtectedShell>
  );
}