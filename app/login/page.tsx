'use client';
import React, { Suspense } from 'react';
import Login from '../../src/views/Login/Login';

export default function Page(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}