'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { AccountForm, type AccountFormData } from './AccountForm';

interface AccountModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: AccountFormData) => Promise<void>;
  initialData?: Partial<AccountFormData> | undefined;
  mode: 'add' | 'edit';
}

const AccountModal: React.FC<AccountModalProps> = ({
  show,
  onHide,
  onSave,
  initialData,
  mode,
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    account_type: 'checking',
    icon: 'FaUniversity',
    color: '#0891b2',
    initial_balance: '',
    currency: 'IDR',
    is_active: true,
    is_included_in_total: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (show) {
      if (initialData) {
        setFormData((prev) => ({ ...prev, ...initialData }));
      } else {
        setFormData({
          name: '',
          account_type: 'checking',
          icon: 'FaUniversity',
          color: '#0891b2',
          initial_balance: '',
          currency: 'IDR',
          is_active: true,
          is_included_in_total: true,
        });
      }
      setError(null);
    }
  }, [show, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Account name is required');
      return;
    }

    if (formData.name.trim().length < 3) {
      setError('Account name must be at least 3 characters');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof AccountFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'add' ? 'Add New Account' : 'Edit Account'}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <AccountForm
            formData={formData}
            onChange={handleChange}
            loading={loading}
            error={error}
            setError={setError}
          />
        </Modal.Body>

        <Modal.Footer className="d-flex flex-column-reverse flex-md-row align-items-stretch align-items-md-center gap-2">
          <Button variant="secondary" onClick={onHide} disabled={loading} className="me-md-auto">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="d-flex align-items-center justify-content-center">
            {loading ? (
              <Spinner as="span" animation="border" size="sm" />
            ) : mode === 'add' ? (
              'Add Account'
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AccountModal;
