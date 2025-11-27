import React, { useState, useMemo } from 'react';
import { Dropdown, Form, InputGroup } from 'react-bootstrap';
import { FaSearch, FaTimes, FaTag } from 'react-icons/fa';
import type { IconType } from 'react-icons';
import './CategoryDropdown.css';

export interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelDropdownProps {
  selectedLabels: string[];
  setSelectedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  labels: Label[];
  labelColors?: Record<string, string>;
  leadingIcon?: IconType;
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  isSingleSelect?: boolean;
}

export const LabelDropdown: React.FC<LabelDropdownProps> = ({
  selectedLabels,
  setSelectedLabels,
  labels,
  labelColors = {},
  leadingIcon: LeadingIcon = FaTag,
  entityLabelSingular = 'label',
  entityLabelPlural = 'labels',
  searchPlaceholder = 'Search labels',
  clearSelectedLabel = 'Clear labels',
  isSingleSelect = false,
}) => {
  const [show, setShow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter labels based on search
  const filteredLabels = useMemo(() => {
    if (!searchTerm) return labels;
    const lowerSearch = searchTerm.toLowerCase();
    return labels.filter((label) => label.name.toLowerCase().includes(lowerSearch));
  }, [labels, searchTerm]);

  const handleToggleLabel = (labelName: string) => {
    if (isSingleSelect) {
      setSelectedLabels([labelName]);
      setShow(false);
    } else {
      setSelectedLabels((prev) =>
        prev.includes(labelName) ? prev.filter((l) => l !== labelName) : [...prev, labelName]
      );
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLabels([]);
  };

  const getDisplayText = () => {
    if (selectedLabels.length === 0) {
      return `All ${entityLabelPlural}`;
    }
    if (selectedLabels.length === 1) {
      return selectedLabels[0];
    }
    return `${selectedLabels.length} ${entityLabelPlural}`;
  };

  const getColorForLabel = (labelName: string): string => {
    const label = labels.find((l) => l.name === labelName);
    return label?.color || labelColors[labelName] || '#6c757d';
  };

  return (
    <Dropdown show={show} onToggle={setShow} className="w-100">
      <Dropdown.Toggle
        variant="outline-secondary"
        className="category-dropdown-toggle d-flex align-items-center justify-content-between w-100"
      >
        <span className="d-flex align-items-center gap-2">
          <LeadingIcon size={16} />
          <span>{getDisplayText()}</span>
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="category-dropdown-menu w-100">
        {/* Search */}
        <div className="p-2">
          <InputGroup size="sm">
            <InputGroup.Text style={{ backgroundColor: '#fff', borderRight: 'none' }}>
              <FaSearch size={12} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{ borderLeft: 'none' }}
            />
            {searchTerm && (
              <InputGroup.Text
                style={{ 
                  backgroundColor: '#fff', 
                  borderLeft: 'none', 
                  cursor: 'pointer' 
                }}
                onClick={() => setSearchTerm('')}
              >
                <FaTimes size={12} />
              </InputGroup.Text>
            )}
          </InputGroup>
        </div>

        {/* Selection count and clear */}
        {selectedLabels.length > 0 && (
          <div className="px-3 py-2 d-flex justify-content-between align-items-center border-bottom">
            <small className="text-muted">
              {selectedLabels.length} {entityLabelSingular}
              {selectedLabels.length !== 1 ? 's' : ''} selected
            </small>
            <small
              className="text-primary"
              style={{ cursor: 'pointer' }}
              onClick={handleClearAll}
            >
              {clearSelectedLabel}
            </small>
          </div>
        )}

        {/* Label list */}
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {filteredLabels.length === 0 ? (
            <div className="px-3 py-2 text-muted text-center">
              <small>No {entityLabelPlural} found</small>
            </div>
          ) : (
            filteredLabels.map((label) => {
              const isSelected = selectedLabels.includes(label.name);
              return (
                <Dropdown.Item
                  key={label.id}
                  as="button"
                  type="button"
                  onClick={() => handleToggleLabel(label.name)}
                  className="category-dropdown-item d-flex align-items-center gap-2"
                >
                  <Form.Check
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    onClick={(e) => e.stopPropagation()}
                    style={{ pointerEvents: 'none' }}
                  />
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      backgroundColor: getColorForLabel(label.name),
                      flexShrink: 0,
                    }}
                  />
                  <span className="flex-grow-1 text-start text-truncate">{label.name}</span>
                </Dropdown.Item>
              );
            })
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};
