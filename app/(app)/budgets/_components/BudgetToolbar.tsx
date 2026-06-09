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
  const activeSortTitle = sortOptions?.find(opt => opt.value === sortBy)?.title || 'Sort';

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center p-3 border-bottom bg-white gap-3 rounded-top">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {leftSlot}

        {sortBy && onSortByChange && sortOptions && (
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2">
              <FaIcons.FaSort size={12} />
              <span className="d-none d-sm-inline">{activeSortTitle}</span>
              <span className="d-inline d-sm-none">Sort</span>
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
          <Dropdown.Toggle variant={viewMode === 'flat' ? "primary" : "outline-secondary"} size="sm" className="d-flex align-items-center gap-2">
            {viewMode === 'flat' ? <FaIcons.FaList size={12} /> : <FaIcons.FaSitemap size={12} />}
            <span>{viewMode === 'flat' ? 'Flat View' : 'Grouped View'}</span>
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

        {viewMode === 'grouped' && (
          <Button 
            variant="outline-secondary" 
            size="sm" 
            className="d-flex align-items-center justify-content-center p-0" 
            style={{ width: '31px', height: '31px' }} 
            onClick={isAllCollapsed ? onExpandAll : onCollapseAll} 
            title={isAllCollapsed ? "Expand All" : "Collapse All"}
          >
            {isAllCollapsed ? <FaIcons.FaExpandAlt size={12} /> : <FaIcons.FaCompressAlt size={12} />}
          </Button>
        )}
        
        {searchSlot && (
          <div className="ms-auto d-flex align-items-center bg-light rounded px-2 border flex-grow-1" style={{ maxWidth: '300px', height: '31px' }}>
            {searchSlot}
          </div>
        )}
      </div>

      {rightSlot && (
        <div className="d-flex gap-2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
