import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';
import Link from 'next/link';
import { authService } from '../../services';
import type { AuthFormData } from '../../services';
import './Register.css';
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';

// Type definitions
interface FieldError {
  message: string;
}

interface FieldErrors {
  [fieldName: string]: FieldError | undefined;
}

interface RegisterFormData extends AuthFormData {
  email: string;
  name: string;
  username: string;
  password: string;
}

interface ApiError {
  response?: {
    data?: {
      errors?: Record<string, string>;
      message?: string;
    };
  };
  message?: string;
}

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [validated, setValidated] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [passwordValid, setPasswordValid] = useState<boolean>(false);
  const [passwordsMatchValid, setPasswordsMatchValid] = useState<boolean>(false);

  // Auto-dismiss error modal after 3 seconds
  useEffect(() => {
    if (showErrorModal) {
      const timer = setTimeout(() => {
        setShowErrorModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showErrorModal]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    const form = e.currentTarget;
    const isValid = form.checkValidity();
    
    // Additional custom validation for password match and length
    const passwordValidCheck = password.length >= 6;
    const passwordsMatch = password === confirmPassword;

    // Prevent form submission if validation fails
    e.preventDefault();
    e.stopPropagation();

    // Set validated state to show Bootstrap validation feedback
    setValidated(true);

    // Check if form is valid with our custom validations
    if (!isValid || !passwordValidCheck || !passwordsMatch) {
      return;
    }

    setLoading(true);

    try {
      const userData: RegisterFormData = {
        email,
        name,
        username,
        password,
      };

      await authService.register(userData);
      
      setShowSuccessModal(true);
      setValidated(false); // Reset validation state on success
      setFieldErrors({}); // Clear field errors on success
      setPasswordValid(false); // Reset password validation
      setPasswordsMatchValid(false); // Reset password match validation
      // Reset form after successful registration
      setName('');
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const error = err as ApiError;
      console.error('Registration failed:', error);

      const apiError = error.response?.data;

      if (apiError?.errors && typeof apiError.errors === 'object') {
        const formattedFields = Object.entries(apiError.errors).reduce((acc, [field, message]) => {
          acc[field] = { message };
          return acc;
        }, {} as FieldErrors);

        setFieldErrors(formattedFields);

        const fieldNames = Object.keys(apiError.errors);
        const fieldList = fieldNames.length > 1
          ? `${fieldNames.slice(0, -1).join(', ')} and ${fieldNames[fieldNames.length - 1]}`
          : fieldNames[0];

        setErrorMessage(apiError.message || `Please fix the errors in the ${fieldList} field${fieldNames.length > 1 ? 's' : ''}`);
      } else {
        setFieldErrors({});
        setErrorMessage(apiError?.message || error.message || 'Registration failed. Please check your information and try again.');
      }

      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setName(e.target.value);
    // Clear name field error when user starts typing
    if (fieldErrors.name) {
      setFieldErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setUsername(e.target.value);
    // Clear username field error when user starts typing
    if (fieldErrors.username) {
      setFieldErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
    // Clear email field error when user starts typing
    if (fieldErrors.email) {
      setFieldErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    // Clear password field error when user starts typing
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: undefined }));
    }
    // Update validation state
    setPasswordValid(newPassword.length >= 6);
    // Update password match validation if confirm password exists
    if (confirmPassword) {
      setPasswordsMatchValid(newPassword === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    // Clear confirmPassword field error when user starts typing
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
    }
    // Update password match validation
    setPasswordsMatchValid(newConfirmPassword === password);
  };

  const handlePasswordToggle = (): void => {
    setShowPassword(!showPassword);
  };

  const handleConfirmPasswordToggle = (): void => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSuccessModalClose = (): void => {
    setShowSuccessModal(false);
  };

  const handleErrorModalClose = (): void => {
    setShowErrorModal(false);
  };

  return (
    <div className="register-page">
      <div className="register-content">
        <div className="app-info">
          <h1>Join Us<br />Start Managing<br />Your Finances</h1>
          <div className="app-preview">
            <img
              src="/images/app-preview.webp"
              alt="Finance App Preview"
              className="preview-image"
            />
          </div>
        </div>

        <div className="register-form-container">
          <h2>Sign Up</h2>

          <div className="social-buttons">
            <button className="social-button google" type="button">
              <FaGoogle size={24} aria-hidden="true" />
              Sign up with Google
            </button>
            <button className="social-button facebook" type="button">
              <FaFacebook size={24} aria-hidden="true" />
              Sign up with Facebook
            </button>
            <button className="social-button apple" type="button">
              <FaApple size={24} aria-hidden="true" />
              Sign up with Apple
            </button>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={handleNameChange}
                required
                isInvalid={!!fieldErrors.name}
              />
              {fieldErrors.name && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.name.message}
                </div>
              )}
              {!fieldErrors.name && validated && (
                <Form.Control.Feedback type="invalid">
                  Please provide your full name.
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={handleUsernameChange}
                required
                isInvalid={!!fieldErrors.username}
              />
              {fieldErrors.username && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.username.message}
                </div>
              )}
              {!fieldErrors.username && validated && (
                <Form.Control.Feedback type="invalid">
                  Please provide a username.
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>E-mail</Form.Label>
              <Form.Control
                type="email"
                placeholder="john.doe@budgetbakers.com"
                value={email}
                onChange={handleEmailChange}
                required
                isInvalid={!!fieldErrors.email}
              />
              {fieldErrors.email && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.email.message}
                </div>
              )}
              {!fieldErrors.email && validated && (
                <Form.Control.Feedback type="invalid">
                  Please provide a valid email address.
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  isValid={passwordValid && !fieldErrors.password}
                  isInvalid={!!fieldErrors.password}
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
              {fieldErrors.password && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.password.message}
                </div>
              )}
              {!fieldErrors.password && password.length > 0 && !passwordValid && (
                <Form.Control.Feedback type="invalid">
                  Password must be at least 6 characters long.
                </Form.Control.Feedback>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="confirmPassword">
              <Form.Label>Confirm Password</Form.Label>
              <div className="password-input-container">
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  className={confirmPassword && password !== confirmPassword ? 'is-invalid-custom' : ''}
                  isValid={passwordsMatchValid && confirmPassword.length > 0 && !fieldErrors.confirmPassword}
                  isInvalid={!!fieldErrors.confirmPassword}
                />
                <Button
                  variant="outline-secondary"
                  className="password-toggle"
                  onClick={handleConfirmPasswordToggle}
                  type="button"
                >
                  {showConfirmPassword ? (
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
              {fieldErrors.confirmPassword && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.confirmPassword.message}
                </div>
              )}
              {!fieldErrors.confirmPassword && confirmPassword && password !== confirmPassword && (
                <div className="invalid-feedback-custom">
                  Passwords do not match.
                </div>
              )}
            </Form.Group>

            <Button
              className="register-button"
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </Form>

          <p className="login-link">
            Already have an account? <Link href="/login" className="link-button">Log in</Link>
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

      {/* Success Modal */}
      <Modal
        show={showSuccessModal}
        onHide={handleSuccessModalClose}
        centered
        className="success-modal"
      >
        <Modal.Body className="text-center p-4">
          <div className="success-icon mb-3">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#28a745"/>
              <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h4 className="mb-3">Registration Successful!</h4>
          <p className="mb-4">
            Your account has been created successfully. You can now log in with your credentials.
          </p>
          <Button
            variant="primary"
            onClick={handleSuccessModalClose}
          >
            Got it!
          </Button>
        </Modal.Body>
      </Modal>

      {/* Error Modal */}
      <Modal
        show={showErrorModal}
        onHide={handleErrorModalClose}
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
          <h4 className="mb-3">Registration Failed</h4>
          <p className="mb-4">
            {errorMessage}
          </p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Register;
