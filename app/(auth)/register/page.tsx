'use client';

import React, { useState, useEffect, Suspense, type FormEvent, type ChangeEvent } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import { useRegister } from '@/hooks/useRegister';
import { PasswordInput } from '@/components/forms';
import { ErrorModal, SuccessModal } from '@/components/modals';
import './Register.css';

/**
 * Register Page Component Content
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Only handles UI rendering and user input
 * - Business logic extracted to useRegister hook
 * - Validation handled in hook/schema layer
 */
function RegisterPageContent(): React.ReactElement {
  // Form state (UI only)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Business logic delegated to custom hook
  const {
    loading,
    errorMessage,
    fieldErrors,
    showErrorModal,
    showSuccessModal,
    handleRegister,
    closeErrorModal,
    closeSuccessModal,
    clearFieldError,
  } = useRegister('/dashboard');

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
    await handleRegister(email, username, password, confirmPassword, fullName);
  };

  /**
   * Handle input changes with error clearing
   */
  const handleFullNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setFullName(e.target.value);
    if (fieldErrors['full_name']) {
      clearFieldError('full_name');
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    if (fieldErrors['email']) {
      clearFieldError('email');
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
    if (fieldErrors['username']) {
      clearFieldError('username');
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
    if (fieldErrors['password']) {
      clearFieldError('password');
    }
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setConfirmPassword(e.target.value);
    if (fieldErrors['confirmPassword']) {
      clearFieldError('confirmPassword');
    }
  };

  return (
    <div className="register-page">
      <div className="register-content">
        {/* Left Panel - App Info */}
        <div className="app-info">
          <h1>
            Join Us
            <br />
            Start Managing
            <br />
            Your Finances
          </h1>
          <div className="app-preview" aria-label="Application preview" />
        </div>

        {/* Right Panel - Register Form */}
        <div className="register-form-container">
          <h2>Sign Up</h2>

          {/* Social Registration Buttons - Commented for future implementation */}
          {/* 
          <div className="social-buttons">
            <button className="social-button google" type="button">
              <FaGoogle size={24} />
              Sign up with Google
            </button>
          </div>
          <div className="divider"><span>or</span></div>
          */}

          <Form onSubmit={handleSubmit}>
            {/* Full Name Field */}
            <Form.Group className="mb-3" controlId="fullName">
              <Form.Label>Full Name (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={handleFullNameChange}
                isInvalid={!!fieldErrors['full_name']}
                autoComplete="name"
              />
              {fieldErrors['full_name'] && (
                <div className="invalid-feedback-custom">
                  {fieldErrors['full_name']}
                </div>
              )}
            </Form.Group>

            {/* Email Field */}
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={handleEmailChange}
                required
                isInvalid={!!fieldErrors['email']}
                autoComplete="email"
              />
              {fieldErrors['email'] && (
                <div className="invalid-feedback-custom">
                  {fieldErrors['email']}
                </div>
              )}
            </Form.Group>

            {/* Username Field */}
            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Username *</Form.Label>
              <Form.Control
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={handleUsernameChange}
                required
                isInvalid={!!fieldErrors['username']}
                autoComplete="username"
              />
              {fieldErrors['username'] && (
                <div className="invalid-feedback-custom">
                  {fieldErrors['username']}
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
              helperText="Must contain: 8+ characters, uppercase, lowercase, number, special character (!@#$%^&* etc.)"
              required
              autoComplete="new-password"
            />

            {/* Confirm Password Field */}
            <PasswordInput
              id="confirmPassword"
              label="Confirm Password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm your password"
              error={fieldErrors['confirmPassword']}
              required
              autoComplete="new-password"
            />

            {/* Submit Button */}
            <Button
              className="register-button"
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </Form>

          {/* Login Link */}
          <p className="login-link">
            Already have an account?{' '}
            <Link href="/login" className="link-button">
              Log in
            </Link>
          </p>

          {/* Learn More */}
          <p className="learn-more">
            <button className="link-button" type="button">
              Learn more about how BudgetMate works
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

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        onHide={closeSuccessModal}
        title="Registration Successful!"
        message="Your account has been created successfully. Redirecting to dashboard..."
      />

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        onHide={closeErrorModal}
        title="Registration Failed"
        message={errorMessage}
      />
    </div>
  );
}

/**
 * Register Page with Suspense boundary
 * Required for Next.js App Router
 */
export default function RegisterPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div className="register-page">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <Spinner animation="border" variant="primary" />
        </div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
