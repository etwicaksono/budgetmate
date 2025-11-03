'use client';

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

interface AuthStateContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

interface AuthStateProviderProps {
  children: ReactNode;
}

const AuthStateContext = createContext<AuthStateContextValue | undefined>(undefined);

/**
 * Hook to access auth state
 * Optimized with useMemo to prevent unnecessary re-renders
 */
export const useAuthState = (): AuthStateContextValue => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthStateProvider');
  }
  return context;
};

/**
 * Provides authentication state management
 * Separated from business logic for better performance
 */
export const AuthStateProvider: React.FC<AuthStateProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const value = useMemo<AuthStateContextValue>(
    () => ({
      isAuthenticated,
      setIsAuthenticated,
      loading,
      setLoading,
    }),
    [isAuthenticated, loading]
  );

  return (
    <AuthStateContext.Provider value={value}>
      {children}
    </AuthStateContext.Provider>
  );
};
