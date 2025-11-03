'use client';

import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import ToastAlert from '../components/ToastAlert';

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, severity?: 'success' | 'error') => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastState, setToastState] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = useCallback((message: string, severity: 'success' | 'error' = 'success') => {
    setToastState({
      open: true,
      message,
      severity,
    });
  }, []);

  const handleCloseToast = useCallback((_: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setToastState((prev) => ({
      ...prev,
      open: false,
    }));
  }, []);

  const value: ToastContextValue = {
    showToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      <ToastAlert
        open={toastState.open}
        onClose={handleCloseToast}
        severity={toastState.severity}
        message={toastState.message || 'Action completed successfully'}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </ToastContext.Provider>
  );
};
