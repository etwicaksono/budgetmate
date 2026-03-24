'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { FaSearch, FaEllipsisH } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { ChromePicker, ColorResult } from 'react-color';
import type { Category } from '@/services/categoryService';
import { CategorySelect } from './CategorySelect';
import { getIconComponent, getAllFaIconNames } from '@/utils/iconUtils';
import './CategoryModal.css';

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense' | 'both';
  nature: 'WANT' | 'NEED' | 'MUST';
  icon: string;
  color: string;
  parent_id: string | null;
  is_active: boolean;
}

interface CategoryModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  initialData?: Partial<CategoryFormData>;
  mode: 'add' | 'edit';
  categories: Category[];
  excludeId?: string;
}

const ICON_PRESETS = [
  { value: 'FaGift', Icon: getIconComponent('FaGift') },
  { value: 'FaShoppingCart', Icon: getIconComponent('FaShoppingCart') },
  { value: 'FaUtensils', Icon: getIconComponent('FaUtensils') },
  { value: 'FaCar', Icon: getIconComponent('FaCar') },
  { value: 'FaHome', Icon: getIconComponent('FaHome') },
  { value: 'FaPlane', Icon: getIconComponent('FaPlane') },
  { value: 'FaFilm', Icon: getIconComponent('FaFilm') },
  { value: 'FaHeartbeat', Icon: getIconComponent('FaHeartbeat') },
];

const COLOR_PRESETS = [
  '#dc3545', // Red
  '#fd7e14', // Orange
  '#ffc107', // Yellow
  '#28a745', // Green
  '#20c997', // Teal
  '#17a2b8', // Cyan
  '#007bff', // Blue
  '#6f42c1', // Purple
];

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
    nature: 'WANT',
    icon: 'FaGift',
    color: '#dc3545',
    parent_id: null,
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const colorPickerRef = useRef<HTMLDivElement>(null);

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
      setShowColorPicker(false);
    }
  }, [show, initialData]);

  // Close color picker when clicking outside
  useEffect(() => {
    if (!showColorPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);



  // Get all available FA icons
  const allFaIcons = useMemo(() => getAllFaIconNames(), []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return allFaIcons;
    const search = iconSearch.toLowerCase();
    return allFaIcons.filter(iconName => 
      iconName.toLowerCase().includes(search)
    );
  }, [allFaIcons, iconSearch]);

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

  const handleOpenIconPicker = () => {
    setShowIconPicker(true);
  };

  const handleIconSelect = (iconName: string) => {
    setFormData(prev => ({ ...prev, icon: iconName }));
    setShowIconPicker(false);
    setIconSearch('');
  };

  const handleCloseIconPicker = () => {
    setShowIconPicker(false);
    setIconSearch('');
  };

  const IconComponent = getIconComponent(formData.icon);

  return (
    <>
      <Modal show={show && !showIconPicker} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{mode === 'add' ? 'Add New Category' : 'Edit Category'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Category Name */}
            <Form.Group className="mb-3">
              <Form.Label>Category Name *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={loading}
                autoFocus
              />
            </Form.Group>

            <Row>
              {/* Category Type */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    disabled={loading || !!formData.parent_id}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="both">Both</option>
                  </Form.Select>
                  {formData.parent_id && (
                    <Form.Text className="text-muted d-block">
                      Inherited from parent
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              {/* Nature of Spending */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Nature</Form.Label>
                  <Form.Select
                    value={formData.nature}
                    onChange={(e) => handleChange('nature', e.target.value)}
                    disabled={loading}
                  >
                    <option value="WANT">Want</option>
                    <option value="NEED">Need</option>
                    <option value="MUST">Must</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Parent Category */}
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Parent</Form.Label>
                  <CategorySelect
                    selectedCategoryId={formData.parent_id}
                    onSelect={(parentId) => handleChange('parent_id', parentId)}
                    categories={categories}
                    placeholder="None"
                    searchPlaceholder="Search categories..."
                    disabled={loading}
                    filterType={formData.type}
                    {...(excludeId ? { excludeId } : {})}
                    onlyParents={true}
                  />
                  {formData.parent_id && (
                    <Form.Text className="text-muted d-block">
                      Inherits parent's color
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            {/* Icon Selection */}
            <Form.Group className="mb-3">
              <Form.Label>Icon</Form.Label>
              <div className="d-flex gap-2 flex-wrap">
                {ICON_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={formData.icon === preset.value ? 'primary' : 'outline-secondary'}
                    onClick={() => handleChange('icon', preset.value)}
                    disabled={loading}
                    style={{ width: '60px', height: '60px' }}
                    type="button"
                  >
                    <preset.Icon size={24} />
                  </Button>
                ))}
                <Button
                  variant="outline-secondary"
                  onClick={handleOpenIconPicker}
                  disabled={loading}
                  style={{ width: '60px', height: '60px' }}
                  title="Choose custom icon"
                  type="button"
                >
                  <FaEllipsisH size={24} />
                </Button>
              </div>
            </Form.Group>

            {/* Color Selection */}
            <Form.Group className="mb-3">
              <Form.Label>Color</Form.Label>
              {formData.parent_id ? (
                <div className="text-muted small">
                  Color is inherited from parent category
                </div>
              ) : (
                <>
                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleChange('color', color)}
                        disabled={loading}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          border: formData.color === color ? '3px solid #000' : '2px solid #ddd',
                          cursor: 'pointer',
                        }}
                        title={color}
                      />
                    ))}
                    <Form.Control
                      type="color"
                      value={formData.color}
                      onChange={(e) => handleChange('color', e.target.value)}
                      disabled={loading}
                      style={{ width: '60px', height: '40px', cursor: 'pointer' }}
                      title="Custom color"
                    />
                  </div>
                  
                  {showColorPicker && (
                    <div className="mt-3" ref={colorPickerRef}>
                      <ChromePicker
                        color={formData.color}
                        onChange={(color: ColorResult) => handleChange('color', color.hex)}
                        disableAlpha
                      />
                    </div>
                  )}
                </>
              )}
            </Form.Group>

            {/* Options */}
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Hide this category"
                checked={!formData.is_active}
                onChange={(e) => handleChange('is_active', !e.target.checked)}
                disabled={loading}
              />
              <Form.Text className="text-muted d-block">
                Hidden categories won't appear in transaction forms
              </Form.Text>
            </Form.Group>

            {/* Preview */}
            <div className="mt-4 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
              <Form.Label>Preview</Form.Label>
              <div
                className="p-3 rounded"
                style={{
                  backgroundColor: formData.color,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {formData.name || 'Category Name'}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    {formData.nature} • {formData.type === 'income' ? 'Income' : formData.type === 'both' ? 'Both' : 'Expense'}
                    {formData.parent_id && (() => {
                      const parent = categories.find(cat => cat.id === formData.parent_id);
                      return parent ? ` • ${parent.name}` : '';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner as="span" animation="border" size="sm" /> : mode === 'add' ? 'Add Category' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal 
        show={showIconPicker} 
        onHide={handleCloseIconPicker} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Choose Icon</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <InputGroup className="mb-3">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search icons... (e.g., gift, shopping, food)"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              autoFocus
            />
          </InputGroup>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: '8px',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          >
            {filteredIcons.length === 0 ? (
              <div className="text-center text-muted py-4" style={{ gridColumn: '1 / -1' }}>
                No icons found
              </div>
            ) : (
              filteredIcons.map((iconName) => {
                const Icon = FaIcons[iconName as keyof typeof FaIcons] as IconType;
                if (!Icon || typeof Icon !== 'function') return null;
                
                return (
                  <Button
                    key={iconName}
                    variant={formData.icon === iconName ? 'primary' : 'outline-secondary'}
                    onClick={() => handleIconSelect(iconName)}
                    style={{
                      width: '60px',
                      height: '60px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={iconName}
                    type="button"
                  >
                    <Icon size={24} />
                  </Button>
                );
              })
            )}
          </div>

          <div className="mt-3 text-muted small">
            Showing {filteredIcons.length} of {allFaIcons.length} icons
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseIconPicker}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CategoryModal;
