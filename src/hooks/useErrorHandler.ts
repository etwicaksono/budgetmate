'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface ErrorHandlerOptions {
  retry?: () => void | Promise<void>;
  fallback?: () => void;
  silent?: boolean;
  showNotification?: boolean;
  redirectTo?: string;
  customMessage?: string;
}

interface ErrorState {
  error: Error | null;
  isError: boolean;
  isRetrying: boolean;
}

/**
 * Custom hook for handling errors in components
 * Provides consistent error handling with notifications and recovery options
 */
export function useErrorHandler() {
  const router = useRouter();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    isRetrying: false,
  });

  /**
   * Main error handler function
   */
  const handleError = useCallback((
    error: Error | unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      retry,
      fallback,
      silent = false,
      showNotification = true,
      redirectTo,
      customMessage,
    } = options;

    // Ensure we have an Error object
    const errorObj = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : 'An unexpected error occurred');

    // Update state
    setErrorState({
      error: errorObj,
      isError: true,
      isRetrying: false,
    });

    // Log error
    console.error('Error handled by useErrorHandler:', {
      message: errorObj.message,
      stack: errorObj.stack,
      options,
    });

    // Show user notification unless silent
    if (!silent && showNotification) {
      showErrorNotification(errorObj, customMessage, retry);
    }

    // Execute fallback if provided
    if (fallback) {
      try {
        fallback();
      } catch (fallbackError) {
        console.error('Fallback function failed:', fallbackError);
      }
    }

    // Redirect if specified
    if (redirectTo) {
      setTimeout(() => router.push(redirectTo), 1500);
    }

    return errorObj;
  }, [router]);

  /**
   * Async error handler wrapper
   */
  const handleAsyncError = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | undefined> => {
    try {
      setErrorState(prev => ({ ...prev, isError: false }));
      const result = await asyncFn();
      return result;
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  }, [handleError]);

  /**
   * Retry handler with loading state
   */
  const retryWithLoading = useCallback(async (
    retryFn: () => Promise<void>,
    options: ErrorHandlerOptions = {}
  ) => {
    setErrorState(prev => ({ ...prev, isRetrying: true }));
    try {
      await retryFn();
      setErrorState({
        error: null,
        isError: false,
        isRetrying: false,
      });
    } catch (error) {
      setErrorState(prev => ({ ...prev, isRetrying: false }));
      handleError(error, options);
    }
  }, [handleError]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      isRetrying: false,
    });
  }, []);

  /**
   * Error handler for form submissions
   */
  const handleFormError = useCallback((
    error: unknown,
    fieldErrors?: Record<string, string>
  ) => {
    const errorObj = error instanceof Error ? error : new Error('Form submission failed');
    
    // Check for validation errors
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const errorList = Object.entries(fieldErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join('\n');
      
      Swal.fire({
        title: 'Validation Error',
        html: `<pre>${errorList}</pre>`,
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } else {
      handleError(errorObj, {
        customMessage: 'Failed to submit form. Please check your input and try again.',
      });
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    retryWithLoading,
    clearError,
    handleFormError,
    errorState,
    isError: errorState.isError,
    isRetrying: errorState.isRetrying,
    error: errorState.error,
  };
}

/**
 * Show error notification using SweetAlert2
 */
function showErrorNotification(
  error: Error,
  customMessage?: string,
  retry?: () => void | Promise<void>
) {
  const message = customMessage || error.message || 'An error occurred. Please try again.';
  
  const options: any = {
    title: 'Error',
    text: message,
    icon: 'error',
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc3545',
  };

  // Add retry button if retry function is provided
  if (retry) {
    options.showCancelButton = true;
    options.cancelButtonText = 'Retry';
    options.cancelButtonColor = '#007bff';
  }

  Swal.fire(options).then((result) => {
    if (retry && result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
      retry();
    }
  });
}

/**
 * Hook for handling API errors specifically
 */
export function useApiErrorHandler() {
  const { handleError } = useErrorHandler();

  const handleApiError = useCallback((error: unknown) => {
    // Check for specific API error types
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as any;
      const status = apiError.response?.status;
      const data = apiError.response?.data;

      let customMessage = 'An error occurred while communicating with the server.';

      switch (status) {
        case 400:
          customMessage = data?.message || 'Invalid request. Please check your input.';
          break;
        case 401:
          customMessage = 'You are not authorized. Please log in again.';
          handleError(new Error(customMessage), {
            redirectTo: '/login',
          });
          return;
        case 403:
          customMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          customMessage = 'The requested resource was not found.';
          break;
        case 429:
          customMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          customMessage = 'Server error. Please try again later.';
          break;
        default:
          customMessage = data?.message || customMessage;
      }

      handleError(new Error(customMessage));
    } else {
      handleError(error);
    }
  }, [handleError]);

  return { handleApiError };
}

export default useErrorHandler;
