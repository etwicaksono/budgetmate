import React, { useState, useEffect } from 'react';
// TODO: Rework login UX once backend contract is finalized.
import { Form, Button, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@/types/schemas';
import { APP_CONFIG } from '../../config';
import './Login.css';

// Type definitions
interface ApiError {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        fields?: Record<string, { message?: string }>;
      };
    };
  };
  message?: string;
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const {
    register,
    handleSubmit: handleFormSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      email_or_username: '',
      password: '',
    },
  });
  
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = (searchParams?.get('from')) || '/';

  // Auto-dismiss error modal after 3 seconds
  useEffect(() => {
    if (showErrorModal) {
      const timer = setTimeout(() => {
        setShowErrorModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showErrorModal]);

  const onSubmit = async (formData: LoginRequest): Promise<void> => {
    setErrorMessage('');
    setShowErrorModal(false);

    try {
      const response = await authService.login(formData);

      await login({ data: response });

      if (response?.user) {
        localStorage.setItem(APP_CONFIG.storageKeys.userData, JSON.stringify(response.user));
      }

      reset();
      router.replace(from);
    } catch (err) {
      const error = err as ApiError;
      console.error('Login failed:', error);

      let message = error.response?.data?.error?.message || error.message || 'Invalid credentials';

      const fieldErrors = error.response?.data?.error?.fields;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const mappedFields = Object.entries(fieldErrors as Record<string, { message?: string }>);
        const collected: string[] = [];
        mappedFields.forEach(([field, value]) => {
          const fieldMap: Record<string, keyof LoginRequest> = {
            email: 'email_or_username',
            username: 'email_or_username',
            email_or_username: 'email_or_username',
            password: 'password',
          };
          const normalized = fieldMap[field];
          if (normalized) {
            collected.push(normalized);
            setError(normalized, {
              type: 'server',
              message: value?.message || 'Invalid value',
            });
          }
        });

        if (collected.length > 0) {
          const uniqueFields = Array.from(new Set(collected));
          const readableFields = uniqueFields.map(name =>
            name === 'email_or_username' ? 'email or username' : name
          );
          const fieldList = readableFields.length > 1
            ? `${readableFields.slice(0, -1).join(', ')} and ${readableFields[readableFields.length - 1]}`
            : readableFields[0];
          message = `Please check your ${fieldList} field${readableFields.length > 1 ? 's' : ''}`;
        }
      } else if (error.response?.data?.error?.code === 'UNAUTHORIZED') {
        const unauthorizedMessage = message || 'Invalid credentials';
        setError('email_or_username', {
          type: 'server',
          message: unauthorizedMessage,
        });
        setError('password', {
          type: 'server',
          message: unauthorizedMessage,
        });
        message = 'Invalid email/username or password';
      }

      setErrorMessage(message || 'Login failed');
      setShowErrorModal(true);
    }
  };

  const handlePasswordToggle = (): void => {
    setShowPassword(!showPassword);
  };

  const handleCloseErrorModal = (): void => {
    setShowErrorModal(false);
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="app-info">
          <h1>Your Finances<br />in One Place</h1>
          <div className="app-preview"></div>
        </div>

        <div className="login-form-container">
          <h2>Log In</h2>

          <Form onSubmit={handleFormSubmit(onSubmit)}>
            <Form.Group className="mb-3" controlId="email_or_username">
              <Form.Label>E-mail or Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your email or username"
                disabled={isSubmitting}
                isInvalid={Boolean(errors.email_or_username)}
                {...register('email_or_username')}
              />
              {errors.email_or_username && (
                <div className="invalid-feedback-custom">
                  {errors.email_or_username.message}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  isInvalid={Boolean(errors.password)}
                  {...register('password')}
                />
                <Button
                  variant="outline-secondary"
                  className="password-toggle"
                  onClick={handlePasswordToggle}
                  type="button"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    </svg>
                  )}
                </Button>
              </div>
              {errors.password && (
                <div className="invalid-feedback-custom">
                  {errors.password.message}
                </div>
              )}
            </Form.Group>

            <Button
              className="login-button"
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
          </Form>

          <p className="register-link">
            Don&apos;t have an account? <Link href="/register" className="link-button">Sign up</Link>
          </p>

          <p className="learn-more">
            <button className="link-button" type="button">Learn more about how Wallet works</button>
          </p>

          <p className="terms">
            By signing up or connecting with the services above you agree to our{' '}
            <button className="link-button" type="button">Terms of Service</button> and acknowledge our{' '}
            <button className="link-button" type="button">Privacy Policy</button> describing how we handle your personal data.
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        show={showErrorModal}
        onHide={handleCloseErrorModal}
        centered
        className="error-modal"
      >
        <Modal.Body className="text-center p-4">
          <div className="error-icon mb-3">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#dc3545"/>
              <path d="M24 24L40 40M40 24L24 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h4 className="mb-3">Login Failed</h4>
          <p className="mb-4">
            {errorMessage}
          </p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Login;
