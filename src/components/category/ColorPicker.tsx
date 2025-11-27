import React from 'react';
import { Row, Col, Form } from 'react-bootstrap';

// Predefined colors for categories
const PRESET_COLORS = [
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#6366f1', // Indigo
  '#0891b2', // Cyan
  '#10b981', // Green
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#ef4444', // Red
  '#f97316', // Dark Orange
  '#a855f7', // Light Purple
  '#06b6d4', // Light Cyan
  '#14b8a6', // Teal
  '#22c55e', // Light Green
  '#f43f5e', // Rose
  '#d946ef', // Fuchsia
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#c026d3', // Magenta
  '#db2777', // Dark Pink
  '#dc2626', // Dark Red
  '#ea580c', // Red Orange
  '#ca8a04', // Dark Yellow
  '#65a30d', // Olive
  '#16a34a', // Dark Green
  '#059669', // Emerald
  '#0d9488', // Dark Teal
  '#0891b2', // Dark Cyan
  '#0284c7', // Sky Blue
  '#2563eb', // Dark Blue
  '#4f46e5', // Dark Indigo
  '#7c3aed', // Dark Violet
  '#9333ea', // Dark Purple
  '#6b7280', // Gray
];

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  disabled = false,
}) => {
  const normalizedSelectedColor = selectedColor.toLowerCase();

  return (
    <div>
      {/* Selected Color Preview */}
      <div className="mb-3 d-flex align-items-center gap-3">
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            backgroundColor: selectedColor,
            border: '2px solid #dee2e6',
          }}
        />
        <div className="flex-grow-1">
          <Form.Label className="mb-1 small">Custom Color</Form.Label>
          <Form.Control
            type="color"
            value={selectedColor}
            onChange={(e) => onColorSelect(e.target.value)}
            disabled={disabled}
            style={{ height: '38px', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Preset Colors Grid */}
      <Form.Label className="small">Preset Colors</Form.Label>
      <div
        style={{
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid #dee2e6',
          borderRadius: '0.375rem',
          padding: '0.75rem',
        }}
      >
        <Row className="g-2">
          {PRESET_COLORS.map((color) => {
            const isSelected = normalizedSelectedColor === color.toLowerCase();
            
            return (
              <Col key={color} xs={3} sm={2}>
                <div
                  onClick={() => !disabled && onColorSelect(color)}
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    backgroundColor: color,
                    borderRadius: '0.375rem',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: isSelected ? '3px solid #000' : '1px solid #dee2e6',
                    opacity: disabled ? 0.5 : 1,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                  title={color}
                >
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }}
                    >
                      <path
                        d="M13.5 4L6 11.5L2.5 8"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      <div className="mt-2 small text-muted">
        {PRESET_COLORS.length} preset colors available
      </div>
    </div>
  );
};
