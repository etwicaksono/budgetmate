import React, { useState } from 'react';
import { Card, Dropdown, Form, Button } from 'react-bootstrap';
import { RiListSettingsLine } from 'react-icons/ri';
import { FaPlus } from 'react-icons/fa';
import { renderIcon } from './FilterSidebar.utils';
import type { FilterSidebarProps } from './FilterSidebar.types';

type FilterHeaderProps = Pick<
  FilterSidebarProps,
  | 'title'
  | 'filterVisibility'
  | 'onFilterVisibilityChange'
  | 'showAddTransactionButton'
  | 'onShowTransactionModal'
>;

export const FilterHeader: React.FC<FilterHeaderProps> = ({
  title,
  filterVisibility = {
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    labels: true,
    amountRange: true,
    currencies: true,
    transfers: true,
    debts: true,
  },
  onFilterVisibilityChange,
  showAddTransactionButton,
  onShowTransactionModal,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  return (
    <Card.Header className="d-flex align-items-center justify-content-between bg-white border-bottom">
      <span className="h4 mb-0 fw-bold">{title}</span>
      <div className="d-flex gap-2">
        <Dropdown
          show={showFilterPanel}
          onToggle={(isOpen: boolean | null) => {
            setShowFilterPanel(isOpen ?? false);
          }}
        >
          <Dropdown.Toggle
            as="button"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Configure filters"
            title="Configure filters"
          >
            {renderIcon(RiListSettingsLine, { size: 20, color: '#6b7280' })}
          </Dropdown.Toggle>

          <Dropdown.Menu
            align="end"
            style={{
              minWidth: '280px',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              marginTop: '8px',
            }}
          >
            <div style={{ marginBottom: '12px' }}>
              <h6 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                Filter Settings
              </h6>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                Configure visible filters
              </p>
            </div>
            <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
            <div>
              {[
                { id: 'search', label: 'Search' },
                { id: 'sortBy', label: 'Sort By' },
                { id: 'categories', label: 'Categories' },
                { id: 'accounts', label: 'Accounts' },
                { id: 'labels', label: 'Labels' },
                { id: 'amountRange', label: 'Amount Range' },
                { id: 'currencies', label: 'Currencies' },
                { id: 'transfers', label: 'Transfers', defaultState: true },
                { id: 'debts', label: 'Debts', defaultState: true },
                { id: 'drafts', label: 'Drafts', defaultState: true },
              ].map((item) => (
                <Form.Check
                  key={item.id}
                  type="checkbox"
                  id={`filter-${item.id}`}
                  label={item.label}
                  checked={
                    filterVisibility[item.id as keyof typeof filterVisibility] ??
                    item.defaultState ??
                    false
                  }
                  onChange={() => {
                    if (onFilterVisibilityChange) {
                      onFilterVisibilityChange((prev) => ({
                        ...prev,
                        [item.id]: !(
                          prev[item.id as keyof typeof prev] ??
                          item.defaultState ??
                          false
                        ),
                      }));
                    }
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
              ))}
            </div>
          </Dropdown.Menu>
        </Dropdown>
        {showAddTransactionButton && (
          <Button
            type="button"
            variant="light"
            className="transactions-add-record-btn"
            onClick={onShowTransactionModal}
            aria-label="Add transaction"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {renderIcon(FaPlus, { size: 16 })}
          </Button>
        )}
      </div>
    </Card.Header>
  );
};
