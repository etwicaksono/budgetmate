/**
 * Reusable Loading Spinner Component
 * Following DRY and SRP - single, reusable loading component
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({
  size = 'md',
  message = 'Loading...',
  fullPage = false
}: LoadingSpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  
  const content = (
    <>
      <div className={`inline-block animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </>
  );
  
  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {content}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-12 text-center">
      {content}
    </div>
  );
}
