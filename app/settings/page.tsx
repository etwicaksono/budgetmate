'use client';
import React, { Suspense } from 'react';
import { LazySettings } from '../components/LazyRoute';
import ProtectedShell from '../components/ProtectedShell';
import { Spinner, Container } from 'react-bootstrap';

const LoadingFallback = () => (
  <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
    <Spinner animation="border" role="status" variant="primary" />
  </Container>
);

export default function Page(): JSX.Element {
  return (
    <ProtectedShell>
      <Suspense fallback={<LoadingFallback />}>
        <LazySettings />
      </Suspense>
    </ProtectedShell>
  );
}