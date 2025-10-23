'use client';
import React, { useEffect, type ReactNode } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

type Props = { children: ReactNode };

export default function RequireAuth({ children }: Props): JSX.Element {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const from = encodeURIComponent(pathname);
      router.replace(`/login?from=${from}`);
    }
  }, [loading, isAuthenticated, pathname, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}