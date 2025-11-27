'use client';

import React, { useState, useEffect, Suspense, type FormEvent, type ChangeEvent } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { PasswordInput } from '@/components/forms';
import { ErrorModal } from '@/components/modals';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLogin } from '@/hooks/useLogin';
import './Login.css';

/**
 * Login Page Component Content
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles UI rendering and user input
 * - Business logic extracted to useLogin hook
 * - Validation handled in hook/schema layer
 */
function LoginPageContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from') ?? '/dashboard';
  const sessionExpired = searchParams.get('session_expired') === 'true';
  
  // Form state (UI only)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSessionAlert, setShowSessionAlert] = useState(sessionExpired);
  
  // Business logic delegated to custom hook
  const {
    loading,
    errorMessage,
    fieldErrors,
    showErrorModal,
    handleLogin,
    closeErrorModal,
    clearFieldError,
  } = useLogin(redirectTo);

  // Auto-dismiss error modal after 3 seconds
  useEffect(() => {
    if (showErrorModal) {
      const timer = setTimeout(() => {
        closeErrorModal();
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showErrorModal, closeErrorModal]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await handleLogin(email, password);
  };

  /**
   * Handle email input change with error clearing
   */
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    if (fieldErrors['email_or_username']) {
      clearFieldError('email_or_username');
    }
  };

  /**
   * Handle password input change with error clearing
   */
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    if (fieldErrors['password']) {
      clearFieldError('password');
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        {/* Left Panel - App Info */}
        <div className="app-info">
          <h1>
            Your Finances
            <br />
            in One Place
          </h1>
          <div className="app-preview" aria-label="Application preview" />
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-form-container">
          <h2>Log In</h2>

          {/* Session Expired Alert */}
          {showSessionAlert && (
            <div className="alert alert-warning alert-dismissible fade show mb-3" role="alert">
              <strong>Session Expired</strong> Your session has expired. Please log in again.
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowSessionAlert(false)}
                aria-label="Close"
              />
            </div>
          )}

          {/* Social Login Buttons - Commented for future implementation */}
          {/* 
          <div className="social-buttons">
            <button className="social-button google" type="button">
              <FaGoogle size={24} />
              Sign in with Google
            </button>
          </div>
          <div className="divider"><span>or</span></div>
          */}

          <Form onSubmit={handleSubmit}>
            {/* Email/Username Field */}
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>E-mail or Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your email or username"
                value={email}
                onChange={handleEmailChange}
                required
                isInvalid={!!fieldErrors['email_or_username']}
                autoComplete="username"
              />
              {fieldErrors['email_or_username'] && (
                <div className="invalid-feedback-custom">
                  {fieldErrors['email_or_username']}
                </div>
              )}
            </Form.Group>

            {/* Password Field */}
            <PasswordInput
              id="password"
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              error={fieldErrors['password']}
              required
              autoComplete="current-password"
            />

            {/* Submit Button */}
            <Button
              className="login-button"
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </Form>

          {/* Register Link */}
          <p className="register-link">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="link-button">
              Sign up
            </Link>
          </p>

          {/* Learn More */}
          <p className="learn-more">
            <button className="link-button" type="button">
              Learn more about how Wallet works
            </button>
          </p>

          {/* Terms and Privacy */}
          <p className="terms">
            By signing up or connecting with the services above you agree to our{' '}
            <button className="link-button" type="button">
              Terms of Service
            </button>{' '}
            and acknowledge our{' '}
            <button className="link-button" type="button">
              Privacy Policy
            </button>{' '}
            describing how we handle your personal data.
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        onHide={closeErrorModal}
        title="Login Failed"
        message={errorMessage}
      />
    </div>
  );
}

/**
 * Login Page with Suspense boundary
 * Required for useSearchParams() in Next.js App Router
 */
export default function LoginPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
