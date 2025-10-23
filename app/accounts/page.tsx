'use client';
import React from 'react';
import Accounts from '../../src/views/Accounts/Accounts';
import ProtectedShell from '../components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Accounts />
    </ProtectedShell>
  );
}