import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { RegisterSchema, type RegisterInput } from '@/lib/validation/auth';
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

interface UseRegisterReturn {
  // State
  loading: boolean;
  errorMessage: string;
  fieldErrors: FieldErrors;
  showErrorModal: boolean;
  showSuccessModal: boolean;
  
  // Actions
  handleRegister: (
    email: string,
    username: string,
    password: string,
    confirmPassword: string,
    fullName?: string
  ) => Promise<void>;
  clearError: () => void;
  closeErrorModal: () => void;
  closeSuccessModal: () => void;
  clearFieldError: (field: keyof RegisterInput | 'confirmPassword') => void;
}

/**
 * Custom hook for registration functionality
 * Handles validation, API calls, error management, and success flow
 * 
 * @param redirectTo - Optional redirect path after successful registration (default: '/dashboard')
 * @returns Registration state and handlers
 * 
 * @example
 * const { handleRegister, loading, errorMessage, fieldErrors, showSuccessModal } = useRegister();
 */
export const useRegister = (redirectTo: string = '/dashboard'): UseRegisterReturn => {
  const router = useRouter();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
   * Close success modal and navigate to login
   */
  const closeSuccessModal = useCallback(() => {
    setShowSuccessModal(false);
    router.push('/login');
  }, [router]);

  /**
   * Clear specific field error
   */
  const clearFieldError = useCallback((field: keyof RegisterInput | 'confirmPassword') => {
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
   * Validate password confirmation
   */
  const validatePasswordConfirmation = useCallback((
    password: string,
    confirmPassword: string
  ): boolean => {
    if (password !== confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: 'Passwords do not match'
      }));
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return false;
    }
    return true;
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
    console.error('Registration failed:', error);

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

    // USER_EXISTS - show below relevant field
    if (errorCode === 'USER_EXISTS') {
      const message = errorMessage || 'User already exists';
      if (message.toLowerCase().includes('email')) {
        setFieldErrors({ email: message });
      } else if (message.toLowerCase().includes('username')) {
        setFieldErrors({ username: message });
      } else {
        // Can't determine which field, show in both
        setFieldErrors({ 
          email: message,
          username: message 
        });
      }
      return;
    }

    // WEAK_PASSWORD - show below password field
    if (errorCode === 'WEAK_PASSWORD') {
      let passwordError = errorMessage || 'Password does not meet requirements';
      if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
        // Join all password requirement errors
        passwordError = errorDetails.join(', ');
      }
      setFieldErrors({ password: passwordError });
      return;
    }

    // VALIDATION_ERROR - map to fields
    if (errorCode === 'VALIDATION_ERROR' && errorDetails && Array.isArray(errorDetails)) {
      const newFieldErrors: Record<string, string> = {};
      
      errorDetails.forEach((detail: { path?: string[]; message?: string; field?: string }) => {
        // Handle both path array and field string formats
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

    // DUPLICATE_USERNAME
    if (errorCode === 'DUPLICATE_USERNAME') {
      setFieldErrors({ username: errorMessage || 'This username is already taken' });
      return;
    }

    // DUPLICATE_EMAIL
    if (errorCode === 'DUPLICATE_EMAIL') {
      setFieldErrors({ email: errorMessage || 'This email is already registered' });
      return;
    }

    // Generic error - show in modal only if we can't map to a field
    const apiMessage = errorMessage;
    const resolvedMessage: string = 
      (typeof apiMessage === 'string' && apiMessage.length > 0)
        ? apiMessage
        : (typeof error.message === 'string' && error.message.length > 0)
        ? error.message
        : 'Registration failed. Please check your information and try again.';

    setErrorMessage(resolvedMessage);
    setShowErrorModal(true);
  }, [buildFieldErrors, formatErrorMessage]);

  /**
   * Main registration handler
   */
  const handleRegister = useCallback(async (
    email: string,
    username: string,
    password: string,
    confirmPassword: string,
    fullName?: string
  ): Promise<void> => {
    // Clear previous errors
    clearError();
    setLoading(true);

    try {
      // Validate password confirmation first
      if (!validatePasswordConfirmation(password, confirmPassword)) {
        setLoading(false);
        return;
      }

      // Prepare data for validation
      const registerData = {
        email: email.trim(),
        username: username.trim(),
        password,
        ...(fullName && fullName.trim() ? { full_name: fullName.trim() } : {})
      };

      // Validate input
      const validationResult = RegisterSchema.safeParse(registerData);

      if (!validationResult.success) {
        setFieldErrors(buildFieldErrors(validationResult.error.issues));
        setErrorMessage(formatErrorMessage(validationResult.error));
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // Call API with properly typed data
      const apiData: {
        email: string;
        username: string;
        password: string;
        full_name?: string;
      } = {
        email: validationResult.data.email,
        username: validationResult.data.username,
        password: validationResult.data.password,
      };
      
      if (validationResult.data.full_name) {
        apiData.full_name = validationResult.data.full_name;
      }
      
      const response = await authService.register(apiData);

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

      // Show success modal
      setShowSuccessModal(true);

      // Navigate after a short delay to let user see success message
      setTimeout(() => {
        router.replace(redirectTo);
      }, 2000);
      
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
    validatePasswordConfirmation,
    buildFieldErrors,
    formatErrorMessage,
    handleApiError
  ]);

  return {
    loading,
    errorMessage,
    fieldErrors,
    showErrorModal,
    showSuccessModal,
    handleRegister,
    clearError,
    closeErrorModal,
    closeSuccessModal,
    clearFieldError,
  };
};
