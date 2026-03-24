'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { FaWallet, FaUniversity, FaPiggyBank, FaCreditCard, FaMoneyBillWave, FaSearch, FaEllipsisH } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { CurrencyPicker } from '@/components/common/CurrencyPicker';
import { currencyFormatService } from '@/services/currencyFormatService';
import { AmountInput } from '@/components/transaction/AmountInput';
import './AccountModal.css';

interface AccountFormData {
  name: string;
  account_type: string;
  icon: string;
  color: string;
  initial_balance: string; // Changed to string for AmountInput compatibility
  currency: string;
  is_active: boolean;
  is_included_in_total: boolean;
}

interface AccountModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: AccountFormData) => Promise<void>;
  initialData?: Partial<AccountFormData> | undefined;
  mode: 'add' | 'edit';
}

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash', icon: FaMoneyBillWave },
  { value: 'checking', label: 'Checking Account', icon: FaUniversity },
  { value: 'savings', label: 'Savings Account', icon: FaPiggyBank },
  { value: 'credit_card', label: 'Credit Card', icon: FaCreditCard },
  { value: 'investment', label: 'Investment', icon: FaWallet },
];

const ICON_OPTIONS = [
  { value: 'FaWallet', label: 'Wallet', icon: FaWallet },
  { value: 'FaUniversity', label: 'Bank', icon: FaUniversity },
  { value: 'FaPiggyBank', label: 'Piggy Bank', icon: FaPiggyBank },
  { value: 'FaCreditCard', label: 'Credit Card', icon: FaCreditCard },
  { value: 'FaMoneyBillWave', label: 'Cash', icon: FaMoneyBillWave },
];

const COLOR_PRESETS = [
  '#16a34a', // Green
  '#0891b2', // Cyan
  '#ca8a04', // Yellow
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0284c7', // Blue
  '#65a30d', // Lime
];

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
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [tempFormData, setTempFormData] = useState<AccountFormData | null>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (show) {
      if (initialData) {
        setFormData((prev) => ({ ...prev, ...initialData }));
      } else {
        // Reset to defaults for add mode
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

    // Validation
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

  const handleOpenIconPicker = () => {
    // Save current form data
    setTempFormData({ ...formData });
    // Close main modal and open icon picker
    setShowIconPicker(true);
  };

  const handleIconSelect = (iconName: string) => {
    // Update icon in temp form data
    if (tempFormData) {
      const updatedFormData = { ...tempFormData, icon: iconName };
      setFormData(updatedFormData);
      setTempFormData(null);
    }
    // Close icon picker
    setShowIconPicker(false);
    setIconSearch('');
  };

  const handleCloseIconPicker = () => {
    // Restore temp form data if user cancels
    if (tempFormData) {
      setFormData(tempFormData);
      setTempFormData(null);
    }
    setShowIconPicker(false);
    setIconSearch('');
  };

  const getIconComponent = (iconName: string): IconType => {
    const iconOption = ICON_OPTIONS.find((opt) => opt.value === iconName);
    if (iconOption) return iconOption.icon;
    
    // Try to get from all FA icons
    const icon = FaIcons[iconName as keyof typeof FaIcons];
    if (icon && typeof icon === 'function') {
      return icon as IconType;
    }
    
    return FaWallet;
  };

  // Get all available FA icons (exclude non-icon exports)
  const allFaIcons = useMemo(() => {
    const iconKeys = Object.keys(FaIcons).filter(
      (key) => key.startsWith('Fa') && key !== 'FaIconLibrary' && key !== 'FaLayers' && key !== 'FaLayersText'
    );
    return iconKeys;
  }, []);

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return allFaIcons;
    const search = iconSearch.toLowerCase();
    return allFaIcons.filter((iconName) =>
      iconName.toLowerCase().includes(search)
    );
  }, [allFaIcons, iconSearch]);

  return (
    <>
      <Modal show={show && !showIconPicker} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{mode === 'add' ? 'Add New Account' : 'Edit Account'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Account Name */}
          <Form.Group className="mb-3">
            <Form.Label>Account Name *</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter account name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              disabled={loading}
              autoFocus
            />
          </Form.Group>

          <Row>
            {/* Account Type */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Account Type</Form.Label>
                <Form.Select
                  value={formData.account_type}
                  onChange={(e) => handleChange('account_type', e.target.value)}
                  disabled={loading}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            {/* Currency */}
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Currency</Form.Label>
                <CurrencyPicker
                  value={formData.currency}
                  onChange={(currency) => handleChange('currency', currency)}
                  disabled={loading}
                  showPopular={true}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Initial Balance */}
          <Row>
            <Col md={6}>
            <Form.Group className="mb-3">
            <Form.Label>
              Initial Balance
              {formData.currency && (
                <span className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
                  ({formData.currency})
                </span>
              )}
            </Form.Label>
            <AmountInput
              value={formData.initial_balance}
              onChange={(value) => handleChange('initial_balance', value)}
              type="income"
              placeholder="Enter amount (e.g., 1,000.00)"
              disabled={loading}
            />
            <Form.Text className="text-muted">
              The starting balance of this account
            </Form.Text>
          </Form.Group>
            </Col>
          </Row>

          {/* Icon Selection */}
          <Form.Group className="mb-3">
            <Form.Label>Icon</Form.Label>
            <div className="d-flex gap-2 flex-wrap">
              {ICON_OPTIONS.map((option) => {
                const IconComponent = option.icon;
                return (
                  <Button
                    key={option.value}
                    variant={formData.icon === option.value ? 'primary' : 'outline-secondary'}
                    onClick={() => handleChange('icon', option.value)}
                    disabled={loading}
                    style={{ width: '60px', height: '60px' }}
                    type="button"
                  >
                    <IconComponent size={24} />
                  </Button>
                );
              })}
              {/* Custom Icon Picker Trigger */}
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
          </Form.Group>

          {/* Options */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Active account"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted d-block">
              Inactive accounts are hidden from most views
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Include in total balance"
              checked={formData.is_included_in_total}
              onChange={(e) => handleChange('is_included_in_total', e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted d-block">
              Include this account's balance in statistics and totals
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
              {React.createElement(getIconComponent(formData.icon), { size: 32 })}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {formData.name || 'Account Name'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  {currencyFormatService.formatCurrency(parseFloat(formData.initial_balance) || 0, formData.currency)}
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
            {loading ? <Spinner as="span" animation="border" size="sm" /> : mode === 'add' ? 'Add Account' : 'Save Changes'}
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
        dialogClassName="modal-same-size"
      >
        <Modal.Header closeButton>
          <Modal.Title>Choose Icon</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Search Box */}
          <InputGroup className="mb-3">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search icons... (e.g., wallet, money, bank)"
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              autoFocus
            />
          </InputGroup>

          {/* Icon Grid */}
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
                const IconComponent = FaIcons[iconName as keyof typeof FaIcons] as IconType;
                if (!IconComponent || typeof IconComponent !== 'function') return null;
                
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
                    <IconComponent size={24} />
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

export default AccountModal;
