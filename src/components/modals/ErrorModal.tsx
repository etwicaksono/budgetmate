'use client';

import React from 'react';
import { Modal } from 'react-bootstrap';

/**
 * ErrorModal Component
 * 
 * Reusable modal for displaying error messages
 * Follows Single Responsibility Principle
 * 
 * @example
 * <ErrorModal
 *   show={showError}
 *   onHide={closeError}
 *   title="Login Failed"
 *   message="Invalid credentials"
 * />
 */

interface ErrorModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  message: string;
  className?: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  show,
  onHide,
  title = 'Error',
  message,
  className = 'error-modal'
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className={className}
    >
      <Modal.Body className="text-center p-4">
        <div className="error-icon mb-3">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="32" fill="#dc3545" />
            <path
              d="M24 24L40 40M40 24L24 40"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h4 className="mb-3">{title}</h4>
        <p className="mb-4">{message}</p>
      </Modal.Body>
    </Modal>
  );
};
