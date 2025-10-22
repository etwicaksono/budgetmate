import React, { type ReactElement } from 'react';
import { Navigate, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PublicRouteProps {
  children: ReactElement;
}

interface PublicRouteLocationState {
  from?: Location;
}

const PublicRoute = ({ children }: PublicRouteProps): ReactElement => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // If user is already logged in, redirect to dashboard or the page they were trying to access
    const from =
      (location.state as PublicRouteLocationState | null)?.from?.pathname ??
      '/';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicRoute;
