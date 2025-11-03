'use client';

import React from 'react';
import { Alert, Button } from 'react-bootstrap';
import { FaExclamationTriangle, FaRedo, FaArrowRight } from 'react-icons/fa';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  children: React.ReactNode;
  featureName: string;
  fallbackAction?: () => void;
  fallbackActionLabel?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Feature-specific error boundary that isolates errors to specific features
 * preventing cascade failures across the application
 */
export function FeatureErrorBoundary({ 
  children, 
  featureName, 
  fallbackAction,
  fallbackActionLabel = 'Use Alternative',
  showDetails = false,
  compact = false
}: Props) {
  return (
    <ErrorBoundary
      isolate
      fallback={(error, reset) => {
        if (compact) {
          return <CompactErrorFallback 
            featureName={featureName}
            error={error}
            reset={reset}
            fallbackAction={fallbackAction}
            fallbackActionLabel={fallbackActionLabel}
          />;
        }

        return <DetailedErrorFallback
          featureName={featureName}
          error={error}
          reset={reset}
          fallbackAction={fallbackAction}
          fallbackActionLabel={fallbackActionLabel}
          showDetails={showDetails}
        />;
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

interface FallbackProps {
  featureName: string;
  error: Error;
  reset: () => void;
  fallbackAction?: () => void;
  fallbackActionLabel: string;
  showDetails?: boolean;
}

function CompactErrorFallback({ 
  featureName, 
  reset, 
  fallbackAction,
  fallbackActionLabel 
}: FallbackProps) {
  return (
    <Alert variant="warning" className="m-2">
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <span>{featureName} unavailable</span>
        </div>
        <div>
          <Button 
            size="sm" 
            variant="outline-warning" 
            onClick={reset}
            className="me-2"
          >
            <FaRedo size={12} />
          </Button>
          {fallbackAction && (
            <Button 
              size="sm" 
              variant="link" 
              onClick={fallbackAction}
              className="p-0"
            >
              {fallbackActionLabel}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

function DetailedErrorFallback({ 
  featureName, 
  error, 
  reset, 
  fallbackAction,
  fallbackActionLabel,
  showDetails 
}: FallbackProps) {
  return (
    <Alert variant="warning" className="m-3">
      <div className="d-flex align-items-start">
        <FaExclamationTriangle className="me-3 mt-1 flex-shrink-0" size={20} />
        <div className="flex-grow-1">
          <Alert.Heading className="h5">
            {featureName} is temporarily unavailable
          </Alert.Heading>
          <p className="mb-2">
            This feature encountered an issue. You can continue using other parts of the application.
          </p>
          
          {showDetails && process.env.NODE_ENV === 'development' && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted small">
                Technical details (Development only)
              </summary>
              <pre className="mt-2 p-2 bg-light rounded small">
                {error.message}
              </pre>
            </details>
          )}

          <div className="mt-3 d-flex gap-2">
            <Button 
              size="sm" 
              variant="outline-warning" 
              onClick={reset}
            >
              <FaRedo className="me-2" />
              Try Again
            </Button>
            {fallbackAction && (
              <Button 
                size="sm" 
                variant="link" 
                onClick={fallbackAction}
              >
                {fallbackActionLabel}
                <FaArrowRight className="ms-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Pre-configured boundaries for common features
 */
export const TransactionErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureErrorBoundary 
    featureName="Transactions"
    fallbackAction={() => window.location.reload()}
    fallbackActionLabel="Reload Page"
  >
    {children}
  </FeatureErrorBoundary>
);

export const AccountErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureErrorBoundary 
    featureName="Accounts"
    fallbackAction={() => window.location.href = '/'}
    fallbackActionLabel="Go to Dashboard"
  >
    {children}
  </FeatureErrorBoundary>
);

export const ReportErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <FeatureErrorBoundary 
    featureName="Reports"
    compact
  >
    {children}
  </FeatureErrorBoundary>
);

export default FeatureErrorBoundary;
