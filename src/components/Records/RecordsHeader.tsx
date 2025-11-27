import React from 'react';
import { Button, Form } from 'react-bootstrap';
import './Records.css';

interface RecordsHeaderProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onBulkEdit?: () => void;
  onBulkExport?: () => void;
  onBulkDelete?: () => void;
  summaryText?: string;
  showBulkActions?: boolean;
}

export const RecordsHeader: React.FC<RecordsHeaderProps> = ({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onBulkEdit,
  onBulkExport,
  onBulkDelete,
  summaryText,
  showBulkActions = true,
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <div className={`records-header ${hasSelection ? 'records-header--active' : ''}`}>
      <div className="records-header__info">
        <div className="d-flex flex-column">
          <span className="fw-bold">Found {totalCount} records</span>
          <Form.Check
            className="records-header__select-all"
            type="checkbox"
            id="select-all-records"
            checked={allSelected && totalCount > 0}
            onChange={onSelectAll}
            label="Select all"
          />
        </div>
      </div>
      {showBulkActions && (
        <div className="records-header__bulk-actions">
          {onBulkEdit && (
            <Button
              variant={hasSelection ? "success" : "outline-secondary"}
              size="sm"
              className="me-2"
              onClick={onBulkEdit}
              disabled={!hasSelection}
            >
              Edit
            </Button>
          )}
          {onBulkExport && (
            <Button
              variant={hasSelection ? "warning" : "outline-secondary"}
              size="sm"
              className="me-2"
              onClick={onBulkExport}
              disabled={!hasSelection}
            >
              Export
            </Button>
          )}
          {onBulkDelete && (
            <Button
              variant={hasSelection ? "danger" : "outline-secondary"}
              size="sm"
              onClick={onBulkDelete}
              disabled={!hasSelection}
            >
              Delete
            </Button>
          )}
        </div>
      )}
      <div className="records-header__summary">
        {summaryText && (() => {
          // Split by " | " to handle multiple currencies
          const parts = summaryText.split(' | ');
          
          return (
            <span className="records-header__total fw-bold">
              {parts.map((part, index) => {
                const trimmedPart = part.trim();
                const firstChar = trimmedPart[0];
                
                const colorClass = 
                  firstChar === '-' || firstChar === '−' ? 'text-danger' : 
                  firstChar === '+' ? 'text-success' : 
                  '';
                
                return (
                  <React.Fragment key={index}>
                    {index > 0 && <span> | </span>}
                    <span className={colorClass}>{trimmedPart}</span>
                  </React.Fragment>
                );
              })}
            </span>
          );
        })()}
      </div>
    </div>
  );
};
