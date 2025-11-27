'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Dropdown, Badge, Form } from 'react-bootstrap';
import { FaTimes, FaTags } from 'react-icons/fa';
import type { Label } from '@/services/labelService';

interface LabelMultiSelectProps {
  labels: Label[];
  selectedLabelIds: string[];
  onChange: (labelIds: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LabelMultiSelect({
  labels,
  selectedLabelIds,
  onChange,
  disabled = false,
  placeholder = 'Select labels',
}: LabelMultiSelectProps): React.JSX.Element {
  const [show, setShow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabels = labels.filter((label) => selectedLabelIds.includes(label.id));
  const visibleCount = 2;
  const hiddenCount = selectedLabels.length - visibleCount;

  const filteredLabels = labels.filter((label) =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (labelId: string) => {
    const newSelection = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    
    onChange(newSelection);
  };

  const handleRemove = (labelId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedLabelIds.filter((id) => id !== labelId));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  useEffect(() => {
    if (!show) {
      setSearchTerm('');
    }
  }, [show]);

  if (labels.length === 0) {
    return (
      <div className="text-muted small" style={{ padding: '0.5rem' }}>
        No labels available. Create labels in Settings.
      </div>
    );
  }

  return (
    <Dropdown
      show={show}
      onToggle={setShow}
      ref={dropdownRef}
      className="w-100"
    >
      <Dropdown.Toggle
        as="div"
        className="form-control d-flex align-items-center justify-content-between"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={() => !disabled && setShow(!show)}
      >
        <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
          <FaTags className="text-muted" />
          {selectedLabels.length === 0 ? (
            <span className="text-muted">{placeholder}</span>
          ) : (
            <>
              {selectedLabels.slice(0, visibleCount).map((label) => (
                <Badge
                  key={label.id}
                  bg=""
                  className="d-flex align-items-center gap-1"
                  style={{
                    backgroundColor: label.color,
                    color: '#fff',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {label.name}
                  <FaTimes
                    size={12}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(label.id, e);
                    }}
                  />
                </Badge>
              ))}
              {hiddenCount > 0 && (
                <Badge bg="secondary" style={{ fontSize: '0.875rem' }}>
                  +{hiddenCount} more
                </Badge>
              )}
            </>
          )}
        </div>
        {selectedLabels.length > 0 && (
          <span
            className="text-primary small"
            style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={handleClearAll}
          >
            Clear selected
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="w-100" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <div className="px-3 py-2">
          <Form.Control
            type="text"
            placeholder="Search labels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>

        {selectedLabels.length > 0 && (
          <>
            <Dropdown.Header className="d-flex justify-content-between align-items-center">
              <span>{selectedLabels.length} label{selectedLabels.length !== 1 ? 's' : ''} selected</span>
            </Dropdown.Header>
            <Dropdown.Divider />
          </>
        )}

        {filteredLabels.length === 0 ? (
          <div className="px-3 py-2 text-muted">No labels found</div>
        ) : (
          filteredLabels.map((label) => {
            const isSelected = selectedLabelIds.includes(label.id);
            return (
              <Dropdown.Item
                key={label.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggle(label.id);
                }}
                className="d-flex align-items-center gap-2"
                style={{ cursor: 'pointer' }}
              >
                <Form.Check
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={(e) => e.stopPropagation()}
                  style={{ pointerEvents: 'none' }}
                />
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: label.color,
                    borderRadius: '2px',
                  }}
                />
                <span>{label.name}</span>
              </Dropdown.Item>
            );
          })
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}
