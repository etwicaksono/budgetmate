import React, { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
