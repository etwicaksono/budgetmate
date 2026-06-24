import React from 'react';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { Row } from './types';
import { RenderEditCellProps } from 'react-data-grid';

export const getIconComponent = (iconKey: string): IconType => {
  const IconComponent = (FaIcons as Record<string, IconType>)[iconKey];
  return IconComponent || FaIcons.FaGift;
};

interface NameFormatterProps {
  row: Row;
  toggleCollapse: (rowId: string) => void;
}

export const NameFormatter = ({ row, toggleCollapse }: NameFormatterProps) => {
  const Icon = getIconComponent(row.category.icon || 'FaGift');
  
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollapse(row.id);
  };

  const isFlatMode = typeof row.parentName !== 'undefined';
  const hasParent = isFlatMode && row.parentName !== '';

  return (
    <div 
      className={`d-flex align-items-center h-100 ${row.isParent && !isFlatMode ? 'fw-bold' : ''}`} 
      style={{ 
        paddingLeft: (row.isParent || isFlatMode) ? '0' : '2rem',
        cursor: (row.hasChildren && !isFlatMode) ? 'pointer' : 'default'
      }}
      onClick={(row.hasChildren && !isFlatMode) ? onClick : undefined}
    >
      {(!isFlatMode && row.hasChildren) ? (
        <div 
           className="me-2 text-muted d-flex align-items-center justify-content-center flex-shrink-0" 
           style={{ width: '20px' }}
        >
           {row.isCollapsed ? <FaIcons.FaChevronRight size={12} /> : <FaIcons.FaChevronDown size={12} />}
        </div>
      ) : (!isFlatMode && row.isParent) ? (
        <div className="me-2 flex-shrink-0" style={{ width: '20px' }} />
      ) : !isFlatMode ? (
        <span className="text-muted me-2" style={{ opacity: 0.5 }}>↳</span>
      ) : null}
      
      <div 
        className="me-2 d-flex align-items-center justify-content-center flex-shrink-0" 
        style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: row.category.color || '#ccc', color: 'white' }}
      >
        <Icon size={10} />
      </div>
      <div className="d-flex align-items-center text-truncate" style={{ minWidth: 0 }}>
        {hasParent ? (
          <>
            <span className="text-muted fw-normal me-1 text-truncate" title={row.parentName} style={{ maxWidth: '40%' }}>
              {row.parentName}
            </span>
            <FaIcons.FaChevronRight size={8} className="text-muted me-1 opacity-50 flex-shrink-0" />
            <span className="fw-medium text-truncate" title={row.category.name}>
              {row.category.name}
            </span>
          </>
        ) : (
          <span className="text-truncate" title={row.category.name}>{row.category.name}</span>
        )}
      </div>
    </div>
  );
};

export const CurrencyFormatter = ({ value, isDirty }: { value: number, isDirty?: boolean }) => {
  return (
    <div className={`text-end h-100 d-flex align-items-center justify-content-end ${isDirty ? 'text-primary fw-bold' : ''}`}>
      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)}
    </div>
  );
};

export const PercentageFormatter = ({ value }: { value: number }) => {
  const isOver = value > 100;
  return (
    <div className={`text-end h-100 d-flex align-items-center justify-content-end ${isOver ? 'text-danger fw-bold' : ''}`}>
      {value.toFixed(1)}%
    </div>
  );
};

let initialOverwriteKey: string | null = null;

export const setInitialOverwriteKey = (key: string | null) => {
  initialOverwriteKey = key;
};

export const NumberEditor = ({ onRowChange, row, column, onClose }: RenderEditCellProps<Row, unknown>) => {
  const overwriteKey = initialOverwriteKey;
  initialOverwriteKey = null; // consume immediately

  React.useEffect(() => {
    if (overwriteKey !== null) {
      const parsed = overwriteKey === '' ? 0 : Number(overwriteKey);
      onRowChange({ ...row, [column.key]: parsed }, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <input
      type="number"
      className="w-100 h-100 px-2 border-0 bg-transparent text-end"
      style={{ outline: 'none' }}
      autoFocus
      defaultValue={overwriteKey !== null ? overwriteKey : String(row[column.key as keyof Row])}
      onFocus={(e) => {
        // Move cursor to end
        const v = e.target.value;
        e.target.value = '';
        e.target.value = v;
        // If overwrite mode, select-all so next char replaces
        if (overwriteKey === null) return;
      }}
      onChange={(e) => {
        const parsed = e.target.value === '' ? 0 : Number(e.target.value);
        onRowChange({ ...row, [column.key]: parsed }, false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: row.id, colKey: column.key, direction: e.shiftKey ? 'up' : 'down' } 
          }));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: row.id, colKey: column.key, direction: 'up' } 
          }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: row.id, colKey: column.key, direction: 'down' } 
          }));
        }
      }}
      onBlur={() => onClose(true, false)}
    />
  );
};
