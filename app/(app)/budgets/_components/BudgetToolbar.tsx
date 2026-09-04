import { ReactNode } from 'react';
import { Dropdown, Button } from 'react-bootstrap';
import * as FaIcons from 'react-icons/fa';
import type { SortOption } from '@/components/common/SortDropdown';

export interface BudgetToolbarProps {
  // Sort By
  sortBy?: string;
  onSortByChange?: (v: string) => void;
  sortOptions?: SortOption<string>[];

  // View Mode
  viewMode: 'grouped' | 'flat';
  onViewModeChange: (v: 'grouped' | 'flat') => void;

  // Expand / Collapse
  isAllCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;

  // Left Slot (e.g. Columns dropdown for Table)
  leftSlot?: ReactNode;

  // Search Slot
  searchSlot?: ReactNode;

  // Right Slot (e.g. Save Changes button for Table)
  rightSlot?: ReactNode;
}

export function BudgetToolbar({
  sortBy,
  onSortByChange,
  sortOptions,
  viewMode,
  onViewModeChange,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  leftSlot,
  searchSlot,
  rightSlot
}: BudgetToolbarProps) {
  // Sort toggle icon mirrors the selected option — same icons as the dropdown items.
  const activeSort = sortOptions?.find(opt => opt.value === sortBy);
  const ActiveSortIcon = activeSort?.icon ?? FaIcons.FaSort;

  const ViewIcon = viewMode === 'flat' ? FaIcons.FaList : FaIcons.FaSitemap;
  const viewTitle = viewMode === 'flat' ? 'Flat View' : 'Grouped View';

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center p-3 border-bottom bg-white gap-2 rounded-top">
      {/* Left section — search, sort, view mode */}
      <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
        {searchSlot && (
          <>
            <style dangerouslySetInnerHTML={{__html: `
              .budget-search-slot { max-width: 100%; }
              @media (min-width: 768px) { .budget-search-slot { max-width: 300px; } }
            `}} />
            <div className="d-flex align-items-center bg-white rounded px-2 border border-secondary budget-search-slot" style={{ height: '36px', minWidth: '200px' }}>
              {searchSlot}
            </div>
          </>
        )}

        {sortBy && onSortByChange && sortOptions && (
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center justify-content-center p-0"
              style={{ width: '36px', height: '36px' }}
              title="Sort By"
              aria-label="Sort By"
            >
              <ActiveSortIcon size={12} />
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {sortOptions.map(opt => {
                const Icon = opt.icon;
                return (
                  <Dropdown.Item
                    key={opt.value}
                    onClick={() => onSortByChange(opt.value)}
                    active={sortBy === opt.value}
                    className="d-flex align-items-center gap-2"
                  >
                    <Icon size={12} /> {opt.title}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>
        )}

        <Dropdown>
          <Dropdown.Toggle
            variant={viewMode === 'flat' ? 'primary' : 'outline-secondary'}
            size="sm"
            className="d-flex align-items-center justify-content-center p-0"
            style={{ width: '36px', height: '36px' }}
            title={viewTitle}
            aria-label={viewTitle}
          >
            <ViewIcon size={12} />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item className="d-flex align-items-center" onClick={() => onViewModeChange('grouped')} active={viewMode === 'grouped'}>
              <FaIcons.FaSitemap className="me-2" /> Grouped View
            </Dropdown.Item>
            <Dropdown.Item className="d-flex align-items-center" onClick={() => onViewModeChange('flat')} active={viewMode === 'flat'}>
              <FaIcons.FaList className="me-2" /> Flat View
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>

        {leftSlot}
      </div>

      {/* Right section — expand/collapse all (+ consumer actions) */}
      {(viewMode === 'grouped' || rightSlot) && (
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {viewMode === 'grouped' && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center justify-content-center p-0"
              style={{ width: '36px', height: '36px' }}
              onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
              title={isAllCollapsed ? 'Expand All' : 'Collapse All'}
              aria-label={isAllCollapsed ? 'Expand All' : 'Collapse All'}
            >
              {isAllCollapsed ? <FaIcons.FaExpandAlt size={12} /> : <FaIcons.FaCompressAlt size={12} />}
            </Button>
          )}
          {rightSlot && (
            <div className="d-flex gap-2">
              {rightSlot}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
