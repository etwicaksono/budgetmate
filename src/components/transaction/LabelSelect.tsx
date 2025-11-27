'use client';

import React from 'react';
import { Badge } from 'react-bootstrap';
import type { Label } from '@/services/labelService';

interface LabelSelectProps {
  labels: Label[];
  selectedLabelIds: string[];
  onToggle: (labelId: string) => void;
  disabled?: boolean;
}

export function LabelSelect({
  labels,
  selectedLabelIds,
  onToggle,
  disabled = false,
}: LabelSelectProps): React.JSX.Element {
  if (!labels || labels.length === 0) {
    return (
      <div className="text-muted small">
        {disabled ? 'Loading labels...' : 'No labels available. Create labels in Settings.'}
      </div>
    );
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {labels.map((label) => {
        const isSelected = selectedLabelIds.includes(label.id);
        return (
          <Badge
            key={label.id}
            bg=""
            style={{
              backgroundColor: isSelected ? label.color : 'transparent',
              color: isSelected ? '#fff' : label.color,
              border: `2px solid ${label.color}`,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onClick={() => !disabled && onToggle(label.id)}
            onMouseEnter={(e) => {
              if (!disabled && !isSelected) {
                e.currentTarget.style.backgroundColor = label.color;
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled && !isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = label.color;
              }
            }}
          >
            {label.name}
          </Badge>
        );
      })}
    </div>
  );
}
