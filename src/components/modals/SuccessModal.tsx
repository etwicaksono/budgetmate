'use client';

import React from 'react';
import { Modal } from 'react-bootstrap';

/**
 * SuccessModal Component
 * 
 * Reusable modal for displaying success messages
 * Follows Single Responsibility Principle
 * 
 * @example
 * <SuccessModal
 *   show={showSuccess}
 *   onHide={closeSuccess}
 *   title="Registration Successful!"
 *   message="Your account has been created"
 * />
 */

interface SuccessModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  message: string;
  className?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  show,
  onHide,
  title = 'Success',
  message,
  className = 'success-modal'
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className={className}
    >
      <Modal.Body className="text-center p-4">
        <div className="success-icon mb-3">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="32" fill="#28a745" />
            <path
              d="M20 32L28 40L44 24"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h4 className="mb-3">{title}</h4>
        <p className="mb-4">{message}</p>
      </Modal.Body>
    </Modal>
  );
};
