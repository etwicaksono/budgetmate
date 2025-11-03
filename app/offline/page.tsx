'use client';

import React from 'react';
import { Container } from 'react-bootstrap';

export default function OfflinePage() {
  return (
    <Container className="d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="text-center">
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 text-muted"
        >
          <path d="M20 16.2A11 11 0 0 0 12 1a11 11 0 0 0-8 15.2" />
          <path d="m2 2 20 20" />
          <circle cx="12" cy="21" r="1" />
        </svg>
        
        <h1 className="h2 mb-3">You're Offline</h1>
        <p className="text-muted mb-4">
          It looks like you've lost your internet connection.
          <br />
          Please check your connection and try again.
        </p>
        
        <button
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </Container>
  );
}
