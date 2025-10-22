import React, { useState } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { APP_CONFIG } from '../../config';
import './Login.css';
import googleIcon from '../../images/google-icon.png';
import facebookIcon from '../../images/facebook-icon.png';
import appleIcon from '../../images/apple-icon.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // Auto-dismiss error modal after 3 seconds
  React.useEffect(() => {
    if (showErrorModal) {
      const timer = setTimeout(() => {
        setShowErrorModal(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showErrorModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Login attempt with:', { email, password });
      
      // Make actual API call using centralized service
      const response = await authService.login({
        email_or_username: email,
        password,
      });
      
      // Debug: Log the actual response structure
      console.log('Full API response:', response);
      
      // Store token and navigate with new response format
      if (response.data?.access_token) {
        // Clear any existing field errors on successful login
        setFieldErrors({});
        
        // Call login with full response data for proper token storage
        await login(response);
        
        // Store user data if available
        if (response.data?.user) {
          localStorage.setItem(APP_CONFIG.storageKeys.userData, JSON.stringify(response.data.user));
        }
        
        navigate(from, { replace: true });
      } else {
        throw new Error('No access token received from server');
      }
    } catch (err) {
      console.error('Login failed:', err);
      
      // Handle validation errors with specific field information
      if (err.response?.data?.error?.fields) {
        const fields = err.response.data.error.fields;
        setFieldErrors(fields);
        
        // Create a generic error message that mentions which fields have errors
        const fieldNames = Object.keys(fields);
        const fieldList = fieldNames.length > 1 
          ? fieldNames.slice(0, -1).join(', ') + ' and ' + fieldNames[fieldNames.length - 1]
          : fieldNames[0];
        
        const errorMsg = `Please check your ${fieldList} field${fieldNames.length > 1 ? 's' : ''}`;
        setErrorMessage(errorMsg);
      } else {
        // Handle general authentication errors - show as field errors for better UX
        const errorMessage = err.response?.data?.error?.message || err.message || 'Invalid credentials';
        
        // For UNAUTHORIZED errors, show as field errors on both fields
        if (err.response?.data?.error?.code === 'UNAUTHORIZED') {
          setFieldErrors({
            email_or_username: {
              field: 'email_or_username',
              message: errorMessage
            },
            password: {
              field: 'password', 
              message: errorMessage
            }
          });
          setErrorMessage('Invalid email/username or password');
        } else {
          // Handle other general errors
          setFieldErrors({});
          setErrorMessage(errorMessage);
        }
      }
      
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-content">
        <div className="app-info">
          <h1>Your Finances<br />in One Place</h1>
          <div className="app-preview">
            {/* App preview image will be added via CSS */}
          </div>
        </div>

        <div className="login-form-container">
          <h2>Log In</h2>

          <div className="social-buttons">
            <button className="social-button google">
              <img src={googleIcon} alt="Google" />
              Sign in with Google
            </button>
            <button className="social-button facebook">
              <img src={facebookIcon} alt="Facebook" />
              Sign in with Facebook
            </button>
            <button className="social-button apple">
              <img src={appleIcon} alt="Apple" />
              Sign in with Apple
            </button>
          </div>

          <div className="divider">
            <span>or</span>
          </div>

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="email">
              <Form.Label>E-mail or Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Clear field errors when user starts typing
                  if (fieldErrors.email_or_username) {
                    setFieldErrors(prev => ({ ...prev, email_or_username: undefined }));
                  }
                }}
                required
                isInvalid={!!fieldErrors.email_or_username}
              />
              {fieldErrors.email_or_username && (
                <div className="invalid-feedback-custom">
                  {fieldErrors.email_or_username.message}
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="password">
              <Form.Label>Password</Form.Label>
              <div className="password-input-container">
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                  setPassword(e.target.value);
                  // Clear field errors when user starts typing
                  if (fieldErrors.password) {
                    setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                  required
                  isInvalid={!!fieldErrors.password}
                />
                <Button
                  variant="outline-secondary"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
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
            </Form.Group>

            <Button
              className="login-button"
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </Form>

          <p className="register-link">
            Don't have an account? <Link to="/register" className="link-button">Sign up</Link>
          </p>

          <p className="learn-more">
            <button className="link-button">Learn more about how Wallet works</button>
          </p>

          <p className="terms">
            By signing up or connecting with the services above you agree to our{' '}
            <button className="link-button">Terms of Service</button> and acknowledge our{' '}
            <button className="link-button">Privacy Policy</button> describing how we handle your personal data.
          </p>
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        show={showErrorModal}
        onHide={() => setShowErrorModal(false)}
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
