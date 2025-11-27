'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import type { Label } from '@/services/labelService';

interface LabelModalProps {
  show: boolean;
  mode: 'add' | 'edit';
  label: Label | null;
  onHide: () => void;
  onSave: (data: { name: string; color: string }) => Promise<void>;
}

const PRESET_COLORS = [
  '#e74c3c', // Red
  '#e67e22', // Orange
  '#f39c12', // Yellow
  '#2ecc71', // Green
  '#1abc9c', // Turquoise
  '#3498db', // Blue
  '#9b59b6', // Purple
  '#34495e', // Dark Gray
  '#95a5a6', // Gray
  '#c0392b', // Dark Red
];

export function LabelModal({
  show,
  mode,
  label,
  onHide,
  onSave,
}: LabelModalProps): React.ReactElement {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3498db');
  const [errors, setErrors] = useState<{ name?: string; color?: string }>({});
  const [saving, setSaving] = useState(false);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) {
      if (mode === 'edit' && label) {
        setName(label.name);
        setColor(label.color);
      } else {
        setName('');
        setColor('#3498db');
      }
      setErrors({});
    }
  }, [show, mode, label]);

  const validate = (): boolean => {
    const newErrors: { name?: string; color?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Label name is required';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Label name must be 50 characters or less';
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      newErrors.color = 'Please select a valid color';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        color,
      });
      onHide();
    } catch (error) {
      console.error('Failed to save label:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{mode === 'edit' ? 'Edit Label' : 'Add Label'}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Name */}
          <Form.Group className="mb-3">
            <Form.Label>Label Name *</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isInvalid={!!errors.name}
              placeholder="Enter label name"
              maxLength={50}
            />
            {errors.name && (
              <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
            )}
          </Form.Group>

          {/* Color Picker */}
          <Form.Group className="mb-3">
            <Form.Label>Color *</Form.Label>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: presetColor,
                    border: color === presetColor ? '3px solid #000' : '2px solid #dee2e6',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  aria-label={`Select color ${presetColor}`}
                />
              ))}
              <div className="d-flex align-items-center gap-2">
                <Form.Control
                  ref={colorInputRef}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '60px', height: '40px', padding: 0, border: '2px solid #dee2e6', borderRadius: '8px', cursor: 'pointer' }}
                />
                <Form.Control
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  onFocus={() => colorInputRef.current?.click()}
                  placeholder="#3498db"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  isInvalid={!!errors.color}
                  style={{ width: '100px' }}
                />
              </div>
            </div>
            {errors.color && (
              <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                {errors.color}
              </Form.Control.Feedback>
            )}
          </Form.Group>

          {/* Preview */}
          <div className="d-flex align-items-center gap-2 p-3 bg-light rounded">
            <span
              className="badge"
              style={{
                backgroundColor: color,
                fontSize: '0.875rem',
                padding: '0.5rem 1rem',
              }}
            >
              {name.trim() || 'Label Preview'}
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Label'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
