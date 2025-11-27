import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { LoginSchema, type LoginInput } from '@/lib/validation/auth';
import { APP_CONFIG } from '@/utils/constants';

// Types for field-level errors
interface FieldError {
  field: string;
  message: string;
}

interface FieldErrors {
  [fieldName: string]: string | undefined;
}

interface ApiError {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        fields?: Record<string, FieldError>;
        details?: Array<{ path?: string[]; message?: string; field?: string }> | string[];
      };
    };
  };
  message?: string;
}

interface UseLoginReturn {
  // State
  loading: boolean;
  errorMessage: string;
  fieldErrors: FieldErrors;
  showErrorModal: boolean;
  
  // Actions
  handleLogin: (email_or_username: string, password: string) => Promise<void>;
  clearError: () => void;
  closeErrorModal: () => void;
  clearFieldError: (field: keyof LoginInput) => void;
}

/**
 * Custom hook for login functionality
 * Handles validation, API calls, and error management
 * 
 * @param redirectTo - Optional redirect path after successful login (default: '/')
 * @returns Login state and handlers
 * 
 * @example
 * const { handleLogin, loading, errorMessage, fieldErrors } = useLogin('/dashboard');
 */
export const useLogin = (redirectTo: string = '/'): UseLoginReturn => {
  const router = useRouter();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showErrorModal, setShowErrorModal] = useState(false);

  /**
   * Clear all errors
   */
  const clearError = useCallback(() => {
    setErrorMessage('');
    setFieldErrors({});
    setShowErrorModal(false);
  }, []);

  /**
   * Close error modal
   */
  const closeErrorModal = useCallback(() => {
    setShowErrorModal(false);
  }, []);

  /**
   * Clear specific field error
   */
  const clearFieldError = useCallback((field: keyof LoginInput) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  /**
   * Build field errors from Zod validation issues
   */
  const buildFieldErrors = useCallback((issues: ZodError['issues']): FieldErrors => {
    return issues.reduce<FieldErrors>((acc, issue) => {
      const field = issue.path.join('.');
      if (field && !acc[field]) {
        acc[field] = issue.message;
      }
      return acc;
    }, {});
  }, []);

  /**
   * Format error message for display
   */
  const formatErrorMessage = useCallback((error: ZodError): string => {
    const messages = error.errors.map(e => e.message);
    return messages.length === 1 
      ? (messages[0] || 'Validation error')
      : `Please fix the following errors: ${messages.join(', ')}`;
  }, []);

  /**
   * Handle API error response
   */
  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof ZodError) {
      // Client-side validation error
      setFieldErrors(buildFieldErrors(err.issues));
      setErrorMessage(formatErrorMessage(err));
      setShowErrorModal(true);
      return;
    }

    const error = err as ApiError;
    console.error('Login failed:', error);

    // Handle field-specific errors from API
    if (error.response?.data?.error?.fields) {
      const fields = error.response.data.error.fields;
      const fieldErrorsMap: FieldErrors = {};
      
      Object.entries(fields).forEach(([key, value]) => {
        if (value) {
          fieldErrorsMap[key] = value.message;
        }
      });
      
      setFieldErrors(fieldErrorsMap);

      // Create user-friendly error message
      const fieldNames = Object.keys(fields);
      const lastField = fieldNames[fieldNames.length - 1] ?? 'field';
      const fieldList = fieldNames.length > 1
        ? `${fieldNames.slice(0, -1).join(', ')} and ${lastField}`.trim()
        : lastField;
      
      setErrorMessage(`Please check your ${fieldList} field${fieldNames.length > 1 ? 's' : ''}`);
      setShowErrorModal(true);
      return;
    }

    // Handle specific API error codes
    const errorCode = error.response?.data?.error?.code;
    const errorMessage = error.response?.data?.error?.message;
    const errorDetails = error.response?.data?.error?.details;

    // UNAUTHORIZED - wrong credentials, show below fields
    if (errorCode === 'UNAUTHORIZED') {
      const message = errorMessage || 'Invalid email/username or password';
      setFieldErrors({
        email_or_username: message,
        password: message,
      });
      return;
    }

    // VALIDATION_ERROR - map to fields
    if (errorCode === 'VALIDATION_ERROR' && errorDetails && Array.isArray(errorDetails)) {
      const newFieldErrors: Record<string, string> = {};
      
      errorDetails.forEach((detail: { path?: string[]; message?: string; field?: string }) => {
        const fieldName = detail.path?.[0] || detail.field;
        if (fieldName && detail.message) {
          newFieldErrors[fieldName] = detail.message;
        }
      });
      
      if (Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        return;
      }
    }

    // Generic error - show in modal only if we can't map to a field
    const apiMessage = errorMessage;
    const resolvedMessage: string = 
      (typeof apiMessage === 'string' && apiMessage.length > 0)
        ? apiMessage
        : (typeof error.message === 'string' && error.message.length > 0)
        ? error.message
        : 'An unexpected error occurred. Please try again.';

    setErrorMessage(resolvedMessage);
    setShowErrorModal(true);
  }, [buildFieldErrors, formatErrorMessage]);

  /**
   * Main login handler
   */
  const handleLogin = useCallback(async (
    email_or_username: string,
    password: string
  ): Promise<void> => {
    // Clear previous errors
    clearError();
    setLoading(true);

    try {
      // Validate input
      const validationResult = LoginSchema.safeParse({
        email_or_username,
        password,
      });

      if (!validationResult.success) {
        setFieldErrors(buildFieldErrors(validationResult.error.issues));
        setErrorMessage(formatErrorMessage(validationResult.error));
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // Call API
      const response = await authService.login(validationResult.data);

      // Validate response
      if (!response.data.access_token || response.data.access_token.trim().length === 0) {
        throw new Error('No access token received from server');
      }

      // Store user data in localStorage
      localStorage.setItem(
        APP_CONFIG.storageKeys.userData,
        JSON.stringify(response.data.user)
      );

      // Update auth context
      await login({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        user: response.data.user
      });

      // Redirect to dashboard
      router.replace(redirectTo);
      
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }, [
    router,
    login,
    redirectTo,
    clearError,
    buildFieldErrors,
    formatErrorMessage,
    handleApiError
  ]);

  return {
    loading,
    errorMessage,
    fieldErrors,
    showErrorModal,
    handleLogin,
    clearError,
    closeErrorModal,
    clearFieldError,
  };
};
