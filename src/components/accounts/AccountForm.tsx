'use client';

import React, { useState, useMemo } from 'react';
import { Form, Row, Col, Button, Alert, InputGroup, Modal } from 'react-bootstrap';
import { FaWallet, FaUniversity, FaPiggyBank, FaCreditCard, FaMoneyBillWave, FaSearch, FaEllipsisH } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { AmountInput } from '@/components/transaction/AmountInput';

export interface AccountFormData {
  name: string;
  account_type: string;
  icon: string;
  color: string;
  initial_balance: string;
  is_active: boolean;
  is_included_in_total: boolean;
}

interface AccountFormProps {
  formData: AccountFormData;
  onChange: (field: keyof AccountFormData, value: string | boolean) => void;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
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
  '#16a34a', '#0891b2', '#ca8a04', '#dc2626',
  '#7c3aed', '#ea580c', '#0284c7', '#65a30d',
];

function getIconComponent(iconName: string): IconType {
  const iconOption = ICON_OPTIONS.find((opt) => opt.value === iconName);
  if (iconOption) return iconOption.icon;
  const icon = FaIcons[iconName as keyof typeof FaIcons];
  if (icon && typeof icon === 'function') return icon as IconType;
  return FaWallet;
}

export function AccountForm({
  formData,
  onChange,
  loading,
  error,
  setError,
}: AccountFormProps): React.JSX.Element {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [tempIcon, setTempIcon] = useState<string | null>(null);

  const allFaIcons = useMemo(() => {
    return Object.keys(FaIcons).filter(
      (key) => key.startsWith('Fa') && key !== 'FaIconLibrary' && key !== 'FaLayers' && key !== 'FaLayersText'
    );
  }, []);

  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) return allFaIcons;
    const search = iconSearch.toLowerCase();
    return allFaIcons.filter((iconName) => iconName.toLowerCase().includes(search));
  }, [allFaIcons, iconSearch]);

  const handleOpenIconPicker = () => {
    setTempIcon(formData.icon);
    setShowIconPicker(true);
  };

  const handleIconSelect = (iconName: string) => {
    onChange('icon', iconName);
    setTempIcon(null);
    setShowIconPicker(false);
    setIconSearch('');
  };

  const handleCloseIconPicker = () => {
    if (tempIcon) {
      onChange('icon', tempIcon);
      setTempIcon(null);
    }
    setShowIconPicker(false);
    setIconSearch('');
  };

  const IconPreview = getIconComponent(formData.icon);
  const initialBalance = Number.parseFloat(formData.initial_balance) || 0;

  return (
    <>
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
          onChange={(e) => onChange('name', e.target.value)}
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
              onChange={(e) => onChange('account_type', e.target.value)}
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

      </Row>

      {/* Initial Balance */}
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>
              Initial Balance
              <span className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
                (IDR)
              </span>
            </Form.Label>
            <AmountInput
              value={formData.initial_balance}
              onChange={(value) => onChange('initial_balance', value)}
              type="income"
              placeholder="Enter amount (e.g., 1,000.00)"
              disabled={loading}
            />
            <Form.Text className="text-muted">The starting balance of this account</Form.Text>
          </Form.Group>
        </Col>
      </Row>

      {/* Icon Selection */}
      <Form.Group className="mb-3">
        <Form.Label>Icon</Form.Label>
        <div className="d-flex gap-2 flex-wrap">
          {ICON_OPTIONS.map((option) => {
            const IconComp = option.icon;
            return (
              <Button
                key={option.value}
                variant={formData.icon === option.value ? 'primary' : 'outline-secondary'}
                onClick={() => onChange('icon', option.value)}
                disabled={loading}
                style={{ width: '60px', height: '60px' }}
                type="button"
              >
                <IconComp size={24} />
              </Button>
            );
          })}
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
              onClick={() => onChange('color', color)}
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
            onChange={(e) => onChange('color', e.target.value)}
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
          onChange={(e) => onChange('is_active', e.target.checked)}
          disabled={loading}
        />
        <Form.Text className="text-muted d-block">Inactive accounts are hidden from most views</Form.Text>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Check
          type="checkbox"
          label="Include in total balance"
          checked={formData.is_included_in_total}
          onChange={(e) => onChange('is_included_in_total', e.target.checked)}
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
          {React.createElement(IconPreview, { size: 32 })}
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              {formData.name || 'Account Name'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Rp {initialBalance.toLocaleString('id-ID')}
            </div>
          </div>
        </div>
      </div>

      {/* Icon Picker Modal */}
      <Modal show={showIconPicker} onHide={handleCloseIconPicker} size="lg" centered dialogClassName="modal-same-size">
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
              placeholder="Search icons... (e.g., wallet, money, bank)"
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
}
