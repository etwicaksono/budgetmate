'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { DataGrid, DataGridHandle } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button, Dropdown, Form } from 'react-bootstrap';
import { FaSave, FaUndo, FaColumns } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { CombinedBudgetItem } from '../types';
import { Row } from './budget-table/types';
import { setInitialOverwriteKey } from './budget-table/formatters';
import { useBudgetGridData } from './budget-table/hooks/useBudgetGridData';
import { useBudgetSearch } from './budget-table/hooks/useBudgetSearch';
import { useBudgetPersistence } from './budget-table/hooks/useBudgetPersistence';
import { useBudgetSelection } from './budget-table/hooks/useBudgetSelection';
import { useBudgetColumns } from './budget-table/columns';
import { BudgetToolbar } from './BudgetToolbar';

interface BudgetTableModeProps {
  data: CombinedBudgetItem[];
  onRefresh: () => void;
}

export function BudgetTableMode({ data, onRefresh }: BudgetTableModeProps) {
  const gridRef = useRef<DataGridHandle>(null);
  const dirtyRowsRef = useRef<Record<string, Row>>({});
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const {
    rows,
    setRows,
    originalRows,
    setOriginalRows,
    sortColumns,
    setSortColumns,
    collapsedParents,
    setCollapsedParents,
    processedData,
    buildGridRows,
    expandAll,
    collapseAll
  } = useBudgetGridData(data, dirtyRowsRef, viewMode);

  const {
    searchInput,
    setSearchInput,
    searchQuery,
    searchMatches,
    currentMatchId,
    handleNextMatch,
    handlePrevMatch
  } = useBudgetSearch(processedData, rows, setCollapsedParents, gridRef);

  const {
    isSaving,
    dirtyRowIds,
    setDirtyRowIds,
    hasChanges,
    handleSave,
    handleDiscard
  } = useBudgetPersistence({
    originalRows,
    setOriginalRows,
    setRows,
    dirtyRowsRef,
    onRefresh
  });

  const toggleCollapse = useCallback((rowId: string) => {
    setCollapsedParents(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, [setCollapsedParents]);

  const allColumns = useBudgetColumns({ dirtyRowIds, toggleCollapse });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budgetTableVisibleColumns');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {
      name: true, basicMonthly: true, extendMonthly: true, spentMonthly: true,
      periodicMargin: true, dailyBudget: false, periodicAvailablePercentage: false,
      basicAnnual: true, extendAnnual: false, spentAnnual: false, annualMargin: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('budgetTableVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = allColumns.filter(col => visibleColumns[col.key]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [selectedMetric, setSelectedMetric] = useState<'sum' | 'avg' | 'min' | 'max' | 'count' | 'countNumbers'>('sum');


  const handleRowsChange = useCallback((newRows: Row[], { indexes }: { indexes: number[] }) => {
    const updatedRows = [...newRows];
    indexes.forEach((index) => {
      const row = updatedRows[index];
      if (!row) return;
      row.periodicMargin = row.basicMonthly + row.extendMonthly - Math.abs(row.spentMonthly);
      row.dailyBudget = (row.basicMonthly + row.extendMonthly) / 30;
      row.periodicAvailablePercentage = (row.basicMonthly + row.extendMonthly) > 0 ? (Math.abs(row.spentMonthly) / (row.basicMonthly + row.extendMonthly)) * 100 : 0;
      row.annualMargin = row.basicAnnual + row.extendAnnual - Math.abs(row.spentAnnual);
      
      dirtyRowsRef.current[row.id] = row;
      setDirtyRowIds(prev => new Set(prev).add(row.id));
    });
    setRows(buildGridRows(processedData, collapsedParents, dirtyRowsRef.current, viewMode));
  }, [processedData, collapsedParents, buildGridRows, setDirtyRowIds, setRows, dirtyRowsRef, viewMode]);

  const onCellsChange = useCallback((changedRows: Row[]) => {
    changedRows.forEach(row => {
      row.periodicMargin = row.basicMonthly + row.extendMonthly - Math.abs(row.spentMonthly);
      row.dailyBudget = (row.basicMonthly + row.extendMonthly) / 30;
      row.periodicAvailablePercentage = (row.basicMonthly + row.extendMonthly) > 0 ? (Math.abs(row.spentMonthly) / (row.basicMonthly + row.extendMonthly)) * 100 : 0;
      row.annualMargin = row.basicAnnual + row.extendAnnual - Math.abs(row.spentAnnual);
      dirtyRowsRef.current[row.id] = row;
      setDirtyRowIds(prev => new Set(prev).add(row.id));
    });
    setRows(buildGridRows(processedData, collapsedParents, dirtyRowsRef.current, viewMode));
  }, [processedData, collapsedParents, buildGridRows, setDirtyRowIds, setRows, dirtyRowsRef, viewMode]);

  const {
    selectedCells,
    selectionStats,
    handlePointerDown,
    handlePointerOver,
    handleKeyDown,
    setLastActiveCell,
    isSelectable
  } = useBudgetSelection({ rows, columns, gridRef, onCellsChange });

  useEffect(() => {
    const handleEditorNavigate = (e: Event) => {
      const detail = (e as CustomEvent<{ rowId: string; colKey: string; direction: string }>).detail;
      const { rowId, colKey, direction } = detail;
      const r = rows.findIndex(row => row.id === rowId);
      const c = columns.findIndex(col => col.key === colKey);
      if (r !== -1 && c !== -1) {
        let nextRow = direction === 'up' ? r - 1 : r + 1;
        while (nextRow >= 0 && nextRow < rows.length && !isSelectable(nextRow, c)) {
          nextRow += direction === 'up' ? -1 : 1;
        }
        
        const targetRow = (nextRow >= 0 && nextRow < rows.length) ? nextRow : r;
        setTimeout(() => gridRef.current?.selectCell({ rowIdx: targetRow, idx: c }), 10);
      }
    };
    window.addEventListener('editor-navigate', handleEditorNavigate);
    return () => window.removeEventListener('editor-navigate', handleEditorNavigate);
  }, [rows, columns, isSelectable]);

  const rowClass = (row: Row) => {
    let classes = [];
    if (row.isParent) classes.push('bg-parent');
    if (dirtyRowIds.has(row.id)) classes.push('bg-warning bg-opacity-10');
    if (currentMatchId === row.id) classes.push('row-highlight');
    return classes.join(' ');
  };

  useEffect(() => {
    const gridEl = document.querySelector('.rdg');
    if (!gridEl) return;
    
    const applyStyles = () => {
      const currentSelected = gridEl.querySelectorAll('.multi-selected');
      currentSelected.forEach(el => el.classList.remove('multi-selected'));
      
      selectedCells.forEach(sc => {
        const [id, key] = sc.split(':::');
        const r = rows.findIndex(row => row.id === id);
        const c = columns.findIndex(col => col.key === key);
        
        if (r !== -1 && c !== -1) {
          const ariaRowIndex = r + 2;
          const ariaColIndex = c + 1;
          const cell = gridEl.querySelector(`[aria-rowindex="${ariaRowIndex}"] > [aria-colindex="${ariaColIndex}"]`);
          if (cell) cell.classList.add('multi-selected');
        }
      });
    };

    applyStyles();
    const observer = new MutationObserver(() => applyStyles());
    observer.observe(gridEl, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [selectedCells, rows, columns]);

  return (
    <>
    <div 
      className="d-flex flex-column bg-white border rounded shadow-sm overflow-hidden" 
      onPointerDownCapture={handlePointerDown}
      onPointerOverCapture={handlePointerOver}
      onKeyDownCapture={handleKeyDown}
      tabIndex={-1}
      style={{ outline: 'none', maxHeight: 'calc(100vh - 120px)' }}
    >
      <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <BudgetToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isAllCollapsed={collapsedParents.size > 0}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          leftSlot={
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2">
                <FaColumns size={12} />
                <span className="d-none d-sm-inline">Columns</span>
              </Dropdown.Toggle>
              <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {allColumns.map(col => (
                  <Dropdown.Item key={col.key} as="div" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleColumn(col.key); }}>
                    <Form.Check type="checkbox" id={`col-${col.key}`} label={col.name as string} checked={visibleColumns[col.key]} onChange={() => {}} style={{ cursor: 'pointer' }} />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          }
          searchSlot={
            <>
              <FaIcons.FaSearch className="text-muted me-2 flex-shrink-0" size={12} />
              <Form.Control type="text" size="sm" placeholder="Search category..." className="border-0 bg-transparent shadow-none flex-grow-1 p-0 h-100" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              {searchInput && <Button variant="link" size="sm" className="p-0 text-muted mx-1 d-flex align-items-center" onClick={() => setSearchInput('')}><FaIcons.FaTimes size={12} /></Button>}
              {searchQuery && (
                <div className="d-flex align-items-center border-start ps-2 border-secondary border-opacity-25 ms-1">
                  <span className="text-muted small me-2" style={{ whiteSpace: 'nowrap' }}>
                    {searchMatches.length > 0 ? `${(currentMatchId ? searchMatches.indexOf(currentMatchId) : 0) + 1} of ${searchMatches.length}` : '0 results'}
                  </span>
                  <Button variant="link" size="sm" className="p-0 text-secondary me-1" onClick={handlePrevMatch} disabled={searchMatches.length === 0}><FaIcons.FaChevronUp size={12} /></Button>
                  <Button variant="link" size="sm" className="p-0 text-secondary" onClick={handleNextMatch} disabled={searchMatches.length === 0}><FaIcons.FaChevronDown size={12} /></Button>
                </div>
              )}
            </>
          }
          rightSlot={
            <>
              {hasChanges && <Button variant="outline-secondary" size="sm" onClick={handleDiscard} disabled={isSaving} className="d-flex align-items-center gap-2"><FaUndo size={12} />Discard</Button>}
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!hasChanges || isSaving} className="d-flex align-items-center gap-2 px-3 fw-bold" style={{ transition: 'all 0.2s', opacity: hasChanges ? 1 : 0.6 }}>
                <FaSave size={14} />{isSaving ? 'Saving...' : `Save Changes ${hasChanges ? `(${dirtyRowIds.size})` : ''}`}
              </Button>
            </>
          }
        />
      </div>

      <div className="d-flex flex-column" style={{ position: 'relative' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .rdg {
            border: none;
            height: auto;
            max-height: calc(100vh - 250px);
            --rdg-background-color: #f8f9fa;
            --rdg-header-background-color: #e2e6ea;
            --rdg-row-height: 40px;
            --rdg-header-row-height: 45px;
            --rdg-selection-color: var(--bs-primary);
            user-select: none;
          }
          .rdg input { user-select: text; }
          .rdg-cell.multi-selected { background-color: rgba(13, 110, 253, 0.15) !important; box-shadow: inset 0 0 0 1px #0d6efd !important; }
          .rdg-row.bg-parent { --rdg-background-color: #e2e6ea; }
          .rdg-row.row-highlight { --rdg-background-color: #fff3cd !important; }
          .rdg-row.bg-warning { --rdg-background-color: #fff3cd; }
          .rdg-cell { padding: 0 12px; border-right: 1px solid #dee2e6; border-bottom: 1px solid #dee2e6; background-color: var(--rdg-background-color); }
          .rdg-header-cell { background-color: var(--rdg-header-background-color); font-weight: 600; border-right: 1px solid #dee2e6; border-bottom: 2px solid #dee2e6; }
          .cell-editable { background-color: #ffffff; cursor: cell; }
          .cell-editable:hover { background-color: #f0f7ff; }
          .rdg-row.bg-parent .cell-editable { background-color: #e2e6ea; }
          .header-editable { background-color: #cfe2ff !important; color: #084298; }
          .header-readonly { background-color: #ced4da !important; }
        `}} />
        <DataGrid
          ref={gridRef}
          columns={columns}
          rows={rows}
          onRowsChange={handleRowsChange}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          rowKeyGetter={(row: Row) => row.id}
          rowClass={rowClass}
          className="rdg-light"
          onSelectedCellChange={(args) => {
            const colIdx = columns.findIndex(c => c.key === args.column.key);
            if (colIdx >= 0 && args.rowIdx >= 0) setLastActiveCell({ rowIdx: args.rowIdx, colIdx });
          }}
          onCellKeyDown={(args, event) => {
            const colIdx = columns.findIndex(c => c.key === args.column.key);
            if (args.mode === 'SELECT' && (event.key === 'Delete' || event.key === 'Backspace')) {
              if (isSelectable(args.rowIdx, colIdx)) {
                event.preventGridDefault();
                event.preventDefault();
                const newRows = [...rows];
                newRows[args.rowIdx] = { ...newRows[args.rowIdx], [args.column.key]: 0 } as Row;
                handleRowsChange(newRows, { indexes: [args.rowIdx] });
                return;
              }
            }
            if (args.mode === 'SELECT' && /^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
              if (isSelectable(args.rowIdx, colIdx)) {
                event.preventGridDefault();
                event.preventDefault();
                setInitialOverwriteKey(event.key);
                gridRef.current?.selectCell({ rowIdx: args.rowIdx, idx: colIdx }, { enableEditor: true });
              }
            }
          }}
        />
      </div>
    </div>
    {(() => {
      if (!selectionStats || selectionStats.count <= 1) return null;
      let displayLabel = '';
      let displayValue = '';
      switch (selectedMetric) {
        case 'sum': displayLabel = 'Sum'; displayValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.sum); break;
        case 'avg': displayLabel = 'Avg'; displayValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.avg); break;
        case 'min': displayLabel = 'Min'; displayValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.min); break;
        case 'max': displayLabel = 'Max'; displayValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.max); break;
        case 'count': displayLabel = 'Count'; displayValue = selectionStats.count.toString(); break;
        case 'countNumbers': displayLabel = 'Count Numbers'; displayValue = selectionStats.countNumbers.toString(); break;
      }

      const MenuItem = ({ metric, label, value }: { metric: typeof selectedMetric, label: string, value: string }) => (
        <Dropdown.Item 
          onClick={() => setSelectedMetric(metric)}
          className={`d-flex justify-content-between py-2 align-items-center ${selectedMetric === metric ? 'bg-light' : ''}`}
          style={{ cursor: 'pointer' }}
        >
          <div className="d-flex align-items-center">
            <span style={{ width: '20px', display: 'inline-block' }}>{selectedMetric === metric && <FaIcons.FaCheck size={10} className="text-success" />}</span>
            <span className="text-dark">{label}:</span>
          </div>
          <span className="text-dark fw-medium ms-3">{value}</span>
        </Dropdown.Item>
      );

      return (
        <div style={{ position: 'fixed', bottom: '20px', right: '40px', zIndex: 9999 }}>
          <Dropdown drop="up" align="end">
            <Dropdown.Toggle 
              variant="success" 
              id="selection-stats-dropdown"
              className="d-flex align-items-center gap-2 border-0 shadow-sm"
              style={{
                 backgroundColor: '#d1e7dd', 
                 color: '#0f5132', 
                 borderRadius: '8px', 
                 padding: '4px 12px',
                 fontSize: '13px',
                 fontWeight: 400,
                 boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <span>{displayLabel}: {displayValue}</span>
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow-lg border-0 rounded-3 p-1" style={{ fontSize: '13px', minWidth: '220px' }}>
              <MenuItem metric="sum" label="Sum" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.sum)} />
              <MenuItem metric="avg" label="Avg" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.avg)} />
              <MenuItem metric="min" label="Min" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.min)} />
              <MenuItem metric="max" label="Max" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectionStats.max)} />
              <MenuItem metric="count" label="Count" value={selectionStats.count.toString()} />
              <MenuItem metric="countNumbers" label="Count Numbers" value={selectionStats.countNumbers.toString()} />
            </Dropdown.Menu>
          </Dropdown>
        </div>
      );
    })()}
    </>
  );
}
