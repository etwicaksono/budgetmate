'use client';
import React from 'react';
import Dashboard from '../src/views/Dashboard/Dashboard';
import ProtectedShell from './components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Dashboard />
    </ProtectedShell>
  );
}