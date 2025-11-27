'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthStateContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
}

const AuthStateContext = createContext<AuthStateContextValue | undefined>(undefined);

export function AuthStateProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  return (
    <AuthStateContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        loading,
        setLoading
      }}
    >
      {children}
    </AuthStateContext.Provider>
  );
}

export function useAuthState(): AuthStateContextValue {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}
