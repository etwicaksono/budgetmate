'use client';

import React, { useEffect } from 'react';
import { Container, Button, Alert } from 'react-bootstrap';
import { FaExclamationCircle, FaHome, FaRedo } from 'react-icons/fa';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js Error Component
 * This component is rendered when an error occurs in a route segment
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Route error occurred:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <Container className="py-5">
      <Alert variant="danger" className="text-center mx-auto" style={{ maxWidth: '600px' }}>
        <FaExclamationCircle size={48} className="mb-3 text-danger" />
        <h2 className="mb-3">Something went wrong!</h2>
        <p className="mb-4">
          We're sorry, but something unexpected happened while loading this page.
        </p>
        
        {/* Show error details in development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-start mb-4">
            <summary className="cursor-pointer mb-2">
              <strong>Error Details (Development Mode)</strong>
            </summary>
            <div className="p-3 bg-light rounded">
              <pre className="mb-0 text-wrap" style={{ fontSize: '0.875rem' }}>
                <strong>Message:</strong> {error.message}
                {error.digest && (
                  <>
                    {'\n'}
                    <strong>Digest:</strong> {error.digest}
                  </>
                )}
                {error.stack && (
                  <>
                    {'\n\n'}
                    <strong>Stack Trace:</strong>
                    {'\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </div>
          </details>
        )}

        <div className="d-flex justify-content-center gap-2">
          <Button 
            variant="primary" 
            onClick={reset}
          >
            <FaRedo className="me-2" />
            Try Again
          </Button>
          <Button 
            variant="secondary" 
            href="/"
          >
            <FaHome className="me-2" />
            Go Home
          </Button>
        </div>

        {/* Error reference for support */}
        {error.digest && (
          <p className="mt-3 mb-0 text-muted small">
            Error Reference: {error.digest}
          </p>
        )}
      </Alert>
    </Container>
  );
}
