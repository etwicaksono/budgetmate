import React from 'react';
import { Button, Form } from 'react-bootstrap';

interface RecordsHeaderProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  onBulkExport?: () => void;
  onBulkDelete?: () => void;
  summaryText?: string;
  showBulkActions?: boolean;
}

const RecordsHeader: React.FC<RecordsHeaderProps> = ({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onClearSelection,
  onBulkEdit,
  onBulkExport,
  onBulkDelete,
  summaryText,
  showBulkActions = true,
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <>
      {hasSelection ? (
        <div className="account-detail-records__header account-detail-records__header--active">
          <div className="account-detail-records__info">
            <Form.Check
              className="account-detail-records__select-all"
              type="checkbox"
              id="select-all-records"
              checked={allSelected && totalCount > 0}
              onChange={onSelectAll}
              label={`Selected ${selectedCount} item(s)`}
            />
          </div>
          {showBulkActions && (
            <div className="account-detail-records__bulk-actions">
              {onBulkEdit && (
                <Button
                  variant="success"
                  size="sm"
                  className="account-detail-records__bulk-btn"
                  onClick={onBulkEdit}
                >
                  Edit ({selectedCount})
                </Button>
              )}
              {onBulkExport && (
                <Button
                  variant="info"
                  size="sm"
                  className="account-detail-records__bulk-btn"
                  onClick={onBulkExport}
                >
                  Export ({selectedCount})
                </Button>
              )}
              {onBulkDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  className="account-detail-records__bulk-btn"
                  onClick={onBulkDelete}
                >
                  Delete ({selectedCount})
                </Button>
              )}
            </div>
          )}
          <div className="account-detail-records__header-close">
            <Button
              variant="link"
              className="account-detail-records__header-close-btn"
              onClick={onClearSelection}
            >
              ✕
            </Button>
          </div>
        </div>
      ) : (
        <div className="account-detail-records__header">
          <div className="account-detail-records__info">
            <Form.Check
              className="account-detail-records__select-all"
              type="checkbox"
              id="select-all-records"
              checked={allSelected && totalCount > 0}
              onChange={onSelectAll}
              label={`Found ${totalCount} records`}
            />
          </div>
          {summaryText && (
            <div className="account-detail-records__summary">
              <span className="account-detail-records__total">
                {summaryText}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default RecordsHeader;
