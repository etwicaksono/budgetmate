'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Container, Alert } from 'react-bootstrap';
import { FaExclamationTriangle, FaHome, FaRedo } from 'react-icons/fa';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only this component tree is affected
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Store error info for display
    this.setState(prevState => ({ 
      errorInfo,
      errorCount: prevState.errorCount + 1 
    }));

    // Log to external service (when available)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with logging service when available
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    };

    // Log to console for now
    console.error('Error logged:', errorData);
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  override render() {
    if (this.state.hasError) {
      // Prevent infinite error loops
      if (this.state.errorCount > 3) {
        return (
          <Container className="py-5 text-center">
            <Alert variant="danger">
              <h3>Multiple errors detected</h3>
              <p>The application is experiencing issues. Please refresh the page.</p>
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </Alert>
          </Container>
        );
      }

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      // Default error UI
      return (
        <Container className="error-boundary-container py-5">
          <Alert variant="danger" className="text-center">
            <FaExclamationTriangle size={48} className="mb-3 text-danger" />
            <h2>Oops! Something went wrong</h2>
            <p className="mb-3">
              We apologize for the inconvenience. The application encountered an unexpected error.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-start mt-3">
                <summary className="cursor-pointer">Error Details (Development Only)</summary>
                <div className="mt-2 p-3 bg-light rounded">
                  <pre className="text-wrap" style={{ fontSize: '0.875rem' }}>
                    <strong>Error ID:</strong> {this.state.errorId}
                    {'\n\n'}
                    <strong>Error Message:</strong>
                    {'\n'}
                    {this.state.error.toString()}
                    {'\n\n'}
                    <strong>Stack Trace:</strong>
                    {'\n'}
                    {this.state.error.stack}
                    {this.state.errorInfo && (
                      <>
                        {'\n\n'}
                        <strong>Component Stack:</strong>
                        {'\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            )}

            <div className="mt-4">
              <Button
                variant="primary"
                onClick={this.resetError}
                className="me-2"
              >
                <FaRedo className="me-2" />
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/'}
              >
                <FaHome className="me-2" />
                Go Home
              </Button>
            </div>

            {!this.props.isolate && (
              <p className="mt-3 text-muted small">
                Error ID: {this.state.errorId}
              </p>
            )}
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
