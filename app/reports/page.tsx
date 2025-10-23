'use client';
import React from 'react';
import Reports from '../../src/views/Reports/Reports';
import ProtectedShell from '../components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Reports />
    </ProtectedShell>
  );
}