'use client';
import React from 'react';
import Settings from '../../src/views/settings/Settings';
import ProtectedShell from '../components/ProtectedShell';

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Settings />
    </ProtectedShell>
  );
}