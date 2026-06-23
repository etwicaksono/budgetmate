'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { CategoryForm, type CategoryFormData } from './CategoryForm';

import type { Category } from '@/services/categoryService';

interface CategoryModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  initialData?: Partial<CategoryFormData>;
  mode: 'add' | 'edit';
  categories: Category[];
  excludeId?: string;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  show,
  onHide,
  onSave,
  initialData,
  mode,
  categories,
  excludeId,
}) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    analytic_flag: 'expense',
    nature: 'WANT',
    icon: 'FaGift',
    color: '#dc3545',
    parent_id: null,
    is_active: true,
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
          type: 'expense',
          nature: 'WANT',
          icon: 'FaGift',
          color: '#dc3545',
          parent_id: null,
          is_active: true,
        });
      }
      setError(null);
    }
  }, [show, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    if (formData.name.trim().length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    try {
      setLoading(true);
      await onSave(formData);
      onHide();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CategoryFormData, value: string | boolean | null) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // If parent is selected, inherit its color and type
      if (field === 'parent_id' && value) {
        const parent = categories.find(cat => cat.id === value);
        if (parent) {
          updated.color = parent.color || prev.color;
          updated.type = parent.type;
        }
      }

      // If type changes and parent is set, clear parent
      if (field === 'type' && prev.parent_id) {
        const parent = categories.find(cat => cat.id === prev.parent_id);
        if (parent && parent.type !== value) {
          updated.parent_id = null;
        }
      }

      return updated;
    });
  };



  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'add' ? 'Add New Category' : 'Edit Category'}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <CategoryForm
            formData={formData}
            onChange={handleChange}
            categories={categories}
            {...(excludeId ? { excludeId } : {})}
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
            {loading ? <Spinner as="span" animation="border" size="sm" /> : mode === 'add' ? 'Add Category' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CategoryModal;
