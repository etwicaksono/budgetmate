'use client';

import React, { ReactNode, Suspense } from 'react';
import { Spinner, Container } from 'react-bootstrap';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  loadingMessage?: string;
  errorFallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Combines Suspense and ErrorBoundary for handling both loading and error states
 * for lazy-loaded components
 */
export function AsyncErrorBoundary({ 
  children, 
  fallback, 
  loadingMessage = 'Loading...',
  errorFallback,
  onError 
}: Props) {
  const defaultFallback = (
    <Container 
      className="d-flex flex-column justify-content-center align-items-center" 
      style={{ minHeight: '200px' }}
    >
      <Spinner animation="border" role="status" variant="primary">
        <span className="visually-hidden">{loadingMessage}</span>
      </Spinner>
      <p className="mt-3 text-muted">{loadingMessage}</p>
    </Container>
  );

  return (
    <ErrorBoundary 
      fallback={errorFallback}
      onError={onError}
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Lightweight wrapper for simple async boundaries
 */
export function SimpleAsyncBoundary({ children }: { children: ReactNode }) {
  return (
    <AsyncErrorBoundary
      loadingMessage="Loading component..."
      errorFallback={(error, reset) => (
        <Container className="text-center py-3">
          <p className="text-danger">Failed to load component</p>
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={reset}
          >
            Retry
          </button>
        </Container>
      )}
    >
      {children}
    </AsyncErrorBoundary>
  );
}

export default AsyncErrorBoundary;
