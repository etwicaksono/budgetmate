'use client';

import React from 'react';
import { Spinner } from 'react-bootstrap';

/**
 * Loading Components - Reusable loading states
 * 
 * Provides:
 * - LoadingSpinner: Centered spinner for full page/section loading
 * - WidgetSkeleton: Skeleton loader for widget cards
 * - CardSkeleton: Skeleton loader for account cards
 */

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const spinnerSize = size === 'sm' ? '1rem' : size === 'lg' ? '3rem' : '2rem';
  
  return (
    <div className="text-center py-5">
      <Spinner 
        animation="border" 
        role="status" 
        style={{ width: spinnerSize, height: spinnerSize }}
      >
        <span className="visually-hidden">{message}</span>
      </Spinner>
      {message && <p className="text-muted mt-3 mb-0">{message}</p>}
    </div>
  );
};

interface WidgetSkeletonProps {
  height?: number;
}

export const WidgetSkeleton: React.FC<WidgetSkeletonProps> = ({ height = 350 }) => {
  return (
    <div 
      className="widget-skeleton" 
      style={{ 
        height: `${height}px`,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '8px',
        padding: '1rem',
      }}
    >
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      
      {/* Header skeleton */}
      <div 
        style={{
          height: '20px',
          width: '40%',
          backgroundColor: '#d0d0d0',
          borderRadius: '4px',
          marginBottom: '1rem',
        }}
      />
      
      {/* Content skeleton */}
      <div 
        style={{
          height: `${height - 80}px`,
          backgroundColor: '#e8e8e8',
          borderRadius: '8px',
        }}
      />
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div 
      className="card-skeleton"
      style={{
        height: '84px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        borderRadius: '0.8rem',
        padding: '0.9rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      
      {/* Icon skeleton */}
      <div
        style={{
          width: '34px',
          height: '34px',
          backgroundColor: '#d0d0d0',
          borderRadius: '0.75rem',
        }}
      />
      
      {/* Text skeleton */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: '14px',
            width: '60%',
            backgroundColor: '#d0d0d0',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
        <div
          style={{
            height: '12px',
            width: '80%',
            backgroundColor: '#d0d0d0',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
};

interface LoadingOverlayProps {
  show: boolean;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ show, children }) => {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            zIndex: 10,
          }}
        >
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      )}
    </div>
  );
};
