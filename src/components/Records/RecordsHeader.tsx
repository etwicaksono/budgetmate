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
  isGlobalSelectAll?: boolean;
  onSelectGlobal?: (isGlobal: boolean) => void;
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
  isGlobalSelectAll = false,
  onSelectGlobal,
}) => {
  const hasSelection = selectedCount > 0 || isGlobalSelectAll;

  return (
    <div className={`records-header ${hasSelection ? 'records-header--active flex-column align-items-start gap-2' : 'flex-row align-items-center'}`}>
      {!hasSelection ? (
        <div className="d-flex justify-content-between align-items-center w-100">
          <div className="records-header__info">
            <span className="fw-bold">{totalCount} Records</span>
          </div>
          <div className="records-header__summary m-0 p-0">
            {summaryText && (() => {
              // Split by " | " to handle multiple currencies
              const parts = summaryText.split(' | ');

              return (
                <span className="records-header__total fw-bold text-end">
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
                        <span className={colorClass}>{trimmedPart.replace(/\.00$/, '')}</span>
                      </React.Fragment>
                    );
                  })}
                </span>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column w-100">

          {/* Global Select All Banner */}
          {(selectedCount > 0 || isGlobalSelectAll) && totalCount > selectedCount && (
            <div className="d-flex w-100 justify-content-center pt-2 pb-1 border-bottom mb-2" style={{ fontSize: '0.85rem' }}>
              {!isGlobalSelectAll ? (
                <span>
                  {selectedCount} loaded record{selectedCount !== 1 ? 's' : ''} selected. {' '}
                  <span
                    className="text-primary fw-bold"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => onSelectGlobal?.(true)}
                  >
                    Select all {totalCount} matching records instead
                  </span>
                </span>
              ) : (
                <span>
                  All {totalCount} matching records are selected. {' '}
                  <span
                    className="text-primary fw-bold"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => onSelectGlobal?.(false)}
                  >
                    Clear selection
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Row 2 (mobile only): action buttons centered */}
          {showBulkActions && (
            <div className="records-header__bulk-actions justify-content-center w-100 d-flex d-md-none">
              {onBulkEdit && (
                <Button variant="success" size="sm" className="me-2" onClick={onBulkEdit}>Edit</Button>
              )}
              {onBulkExport && (
                <Button variant="warning" size="sm" className="me-2" onClick={onBulkExport}>Export</Button>
              )}
              {onBulkDelete && (
                <Button variant="danger" size="sm" onClick={onBulkDelete}>Delete</Button>
              )}
            </div>
          )}

          {/* Row 3 (mobile): Checkbox + Summary | Row 2 (desktop): Checkbox + Buttons + Summary */}
          <div className="d-flex align-items-center justify-content-between w-100">
            {/* Checkbox — always visible */}
            <div className="records-header__info m-0" style={{ minWidth: '100px' }}>
              <Form.Check
                className="records-header__select-all m-0"
                type="checkbox"
                id="select-all-records"
                checked={(allSelected && totalCount > 0) || isGlobalSelectAll}
                onChange={onSelectAll}
                label={isGlobalSelectAll ? `All ${totalCount} Selected` : `${selectedCount} Selected`}
              />
            </div>

            {/* Action buttons — inline on desktop, hidden here on mobile (shown in Row 2) */}
            {showBulkActions && (
              <div className="records-header__bulk-actions justify-content-center w-auto flex-grow-1 d-none d-md-flex">
                {onBulkEdit && (
                  <Button variant="success" size="sm" className="me-2" onClick={onBulkEdit}>Edit</Button>
                )}
                {onBulkExport && (
                  <Button variant="warning" size="sm" className="me-2" onClick={onBulkExport}>Export</Button>
                )}
                {onBulkDelete && (
                  <Button variant="danger" size="sm" onClick={onBulkDelete}>Delete</Button>
                )}
              </div>
            )}

            {/* Summary — always on right */}
            <div className="records-header__summary m-0 p-0 text-end" style={{ minWidth: '100px' }}>
              {summaryText && (() => {
                const parts = summaryText.split(' | ');
                return (
                  <span className="records-header__total fw-bold text-end">
                    {parts.map((part, index) => {
                      const trimmedPart = part.trim();
                      const firstChar = trimmedPart[0];
                      const colorClass =
                        firstChar === '-' || firstChar === '−' ? 'text-danger' :
                          firstChar === '+' ? 'text-success' : '';
                      return (
                        <React.Fragment key={index}>
                          {index > 0 && <span> | </span>}
                          <span className={colorClass}>{trimmedPart.replace(/\.00$/, '')}</span>
                        </React.Fragment>
                      );
                    })}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
