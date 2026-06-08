'use client';
import { useState, useEffect, useRef, useMemo } from 'react';

import { DataGrid, Column, RenderEditCellProps, SortColumn, DataGridHandle } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button, Dropdown, Form } from 'react-bootstrap';
import { FaSave, FaUndo, FaColumns } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { CombinedBudgetItem } from '../types';
import { budgetService } from '@/services/budgetService';
import Swal from 'sweetalert2';

interface BudgetTableModeProps {
  data: CombinedBudgetItem[];
  currency: string;
  onRefresh: () => void;
}

// Flat item for the grid
interface Row extends CombinedBudgetItem {
  id: string;
  isParent: boolean;
  parentId: string | null;
  hasChildren: boolean;
  isSummary?: boolean;
  // Read-only calculated fields
  periodicMargin: number;
  dailyBudget: number;
  periodicAvailablePercentage: number;
  annualMargin: number;
}

// Custom cell editors
const numberEditor = (props: RenderEditCellProps<Row, any>) => {
  return (
    <input
      type="number"
      className="w-100 h-100 px-2 border-0 bg-transparent text-end"
      style={{ outline: 'none' }}
      autoFocus
      value={props.row[props.column.key as keyof Row] as number}
      onChange={(e) => {
        const val = e.target.value === '' ? 0 : Number(e.target.value);
        props.onRowChange({ ...props.row, [props.column.key]: val }, true);
      }}
      onBlur={() => props.onClose(true, false)}
    />
  );
};

export function BudgetTableMode({ data, currency, onRefresh }: BudgetTableModeProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [originalRows, setOriginalRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());

  // Sorting, Collapsing, Searching
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

  const gridRef = useRef<DataGridHandle>(null);
  const lastQueryForExpandRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Memoize sorted data
  const processedData = useMemo(() => {
    let pData = [...data];

    if (sortColumns.length > 0 && sortColumns[0]) {
      const sortCol = sortColumns[0];
      const dir = sortCol.direction === 'ASC' ? 1 : -1;
      const key = sortCol.columnKey;

      const getVal = (item: CombinedBudgetItem) => {
        if (key === 'name') return item.category.name.toLowerCase();
        if (key === 'periodicMargin') return item.basicMonthly + item.extendMonthly - Math.abs(item.spentMonthly);
        if (key === 'dailyBudget') return (item.basicMonthly + item.extendMonthly) / 30;
        if (key === 'periodicAvailablePercentage') return (item.basicMonthly + item.extendMonthly) > 0 ? (Math.abs(item.spentMonthly) / (item.basicMonthly + item.extendMonthly)) * 100 : 0;
        if (key === 'annualMargin') return item.basicAnnual + item.extendAnnual - Math.abs(item.spentAnnual);
        return item[key as keyof CombinedBudgetItem] ?? 0;
      };

      const compare = (a: CombinedBudgetItem, b: CombinedBudgetItem) => {
        const vA = getVal(a);
        const vB = getVal(b);
        if (typeof vA === 'string' && typeof vB === 'string') return vA.localeCompare(vB) * dir;
        return ((vA as number) - (vB as number)) * dir;
      };

      pData.sort(compare);
      pData = pData.map(parent => {
        if (parent.children) {
          return { ...parent, children: [...parent.children].sort(compare) };
        }
        return parent;
      });
    }
    return pData;
  }, [data, sortColumns]);

  // Flatten the data on mount or when data changes
  useEffect(() => {
    const flattened: Row[] = [];
    processedData.forEach((parent: CombinedBudgetItem) => {
      const pRow: Row = {
        ...parent,
        id: parent.category.id,
        isParent: true,
        parentId: null,
        hasChildren: !!parent.children && parent.children.length > 0,
        periodicMargin: parent.basicMonthly + parent.extendMonthly - Math.abs(parent.spentMonthly),
        dailyBudget: (parent.basicMonthly + parent.extendMonthly) / 30,
        periodicAvailablePercentage: (parent.basicMonthly + parent.extendMonthly) > 0 ? (Math.abs(parent.spentMonthly) / (parent.basicMonthly + parent.extendMonthly)) * 100 : 0,
        annualMargin: parent.basicAnnual + parent.extendAnnual - Math.abs(parent.spentAnnual),
      };
      flattened.push(pRow);

      if (parent.children && !collapsedParents.has(parent.category.id)) {
        parent.children.forEach((child: CombinedBudgetItem) => {
          const cRow: Row = {
            ...child,
            id: child.category.id,
            isParent: false,
            parentId: parent.category.id,
            hasChildren: false,
            periodicMargin: child.basicMonthly + child.extendMonthly - Math.abs(child.spentMonthly),
            dailyBudget: (child.basicMonthly + child.extendMonthly) / 30,
            periodicAvailablePercentage: (child.basicMonthly + child.extendMonthly) > 0 ? (Math.abs(child.spentMonthly) / (child.basicMonthly + child.extendMonthly)) * 100 : 0,
            annualMargin: child.basicAnnual + child.extendAnnual - Math.abs(child.spentAnnual),
          };
          flattened.push(cRow);
        });
      }
    });

    const summary = {
      id: 'summary-row',
      isParent: false,
      parentId: null,
      hasChildren: false,
      isSummary: true,
      category: { id: 'summary-row', name: 'Total', color: '#6c757d' } as any,
      basicMonthly: 0,
      extendMonthly: 0,
      spentMonthly: 0,
      periodicMargin: 0,
      dailyBudget: 0,
      periodicAvailablePercentage: 0,
      basicAnnual: 0,
      extendAnnual: 0,
      spentAnnual: 0,
      annualMargin: 0
    };

    data.forEach(parent => {
      summary.basicMonthly += parent.basicMonthly || 0;
      summary.extendMonthly += parent.extendMonthly || 0;
      summary.spentMonthly += parent.spentMonthly || 0;
      summary.basicAnnual += parent.basicAnnual || 0;
      summary.extendAnnual += parent.extendAnnual || 0;
      summary.spentAnnual += parent.spentAnnual || 0;
    });

    summary.periodicMargin = summary.basicMonthly + summary.extendMonthly - Math.abs(summary.spentMonthly);
    summary.dailyBudget = (summary.basicMonthly + summary.extendMonthly) / 30;
    summary.periodicAvailablePercentage = (summary.basicMonthly + summary.extendMonthly) > 0 ? (Math.abs(summary.spentMonthly) / (summary.basicMonthly + summary.extendMonthly)) * 100 : 0;
    summary.annualMargin = summary.basicAnnual + summary.extendAnnual - Math.abs(summary.spentAnnual);

    setRows([...flattened, summary as unknown as Row]);
    // Only deep copy original rows if not saving/reloading, or if it's the first time
    // Actually, onRefresh will trigger this, so we should always refresh originalRows
    setOriginalRows(JSON.parse(JSON.stringify(flattened)));
  }, [processedData, collapsedParents, data]);


  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      setCurrentMatchId(null);
      lastQueryForExpandRef.current = '';
      return;
    }
    const query = searchQuery.toLowerCase();
    
    // Find all matches in the data tree
    const matches: string[] = [];
    processedData.forEach((parent: CombinedBudgetItem) => {
      if (parent.category.name.toLowerCase().includes(query)) {
        matches.push(parent.category.id);
      }
      if (parent.children) {
        parent.children.forEach((child: CombinedBudgetItem) => {
          if (child.category.name.toLowerCase().includes(query)) {
            matches.push(child.category.id);
          }
        });
      }
    });

    setSearchMatches(matches);

    // Auto-expand and select first match if query changed
    if (matches.length > 0) {
      if (lastQueryForExpandRef.current !== query) {
         lastQueryForExpandRef.current = query;
         setCurrentMatchId(matches[0] || null);
         
         setCollapsedParents(prev => {
           const next = new Set(prev);
           let changed = false;
           processedData.forEach((parent: CombinedBudgetItem) => {
             if (parent.children && parent.children.some((c: CombinedBudgetItem) => c.category.name.toLowerCase().includes(query))) {
               if (next.has(parent.category.id)) {
                 next.delete(parent.category.id);
                 changed = true;
               }
             }
           });
           return changed ? next : prev;
         });
      } else {
         setCurrentMatchId(prev => (prev && matches.includes(prev) ? prev : matches[0] || null));
      }
    } else {
      setCurrentMatchId(null);
    }
  }, [searchQuery, processedData]);

  // Scroll effect
  useEffect(() => {
    if (!currentMatchId) return;
    const rowIdx = rows.findIndex(r => r.id === currentMatchId);
    if (rowIdx !== -1) {
      gridRef.current?.scrollToCell({ rowIdx, idx: 0 });
    }
  }, [currentMatchId, rows]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const currentIndex = currentMatchId ? searchMatches.indexOf(currentMatchId) : -1;
    const nextIdx = (currentIndex + 1) % searchMatches.length;
    const nextId = searchMatches[nextIdx];
    if (nextId) navigateToMatch(nextId);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const currentIndex = currentMatchId ? searchMatches.indexOf(currentMatchId) : -1;
    const prevIdx = (currentIndex - 1 + searchMatches.length) % searchMatches.length;
    const prevId = searchMatches[prevIdx];
    if (prevId) navigateToMatch(prevId);
  };

  const navigateToMatch = (matchId: string) => {
    setCurrentMatchId(matchId);
    setCollapsedParents(prev => {
      let changed = false;
      const next = new Set(prev);
      processedData.forEach((parent: CombinedBudgetItem) => {
        if (parent.children && parent.children.some((c: CombinedBudgetItem) => c.category.id === matchId)) {
          if (next.has(parent.category.id)) {
            next.delete(parent.category.id);
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  };

  const expandAll = () => setCollapsedParents(new Set());
  const collapseAll = () => setCollapsedParents(new Set(data.map(d => d.category.id)));

  const hasChanges = dirtyRowIds.size > 0;

  const handleRowsChange = (newRows: Row[], { indexes }: { indexes: number[] }) => {
    // Recalculate margins for edited rows
    const updatedRows = [...newRows];
    indexes.forEach((index) => {
      const row = updatedRows[index];
      if (!row) return;
      row.periodicMargin = row.basicMonthly + row.extendMonthly - Math.abs(row.spentMonthly);
      row.dailyBudget = (row.basicMonthly + row.extendMonthly) / 30;
      row.periodicAvailablePercentage = (row.basicMonthly + row.extendMonthly) > 0 ? (Math.abs(row.spentMonthly) / (row.basicMonthly + row.extendMonthly)) * 100 : 0;
      row.annualMargin = row.basicAnnual + row.extendAnnual - Math.abs(row.spentAnnual);
      
      setDirtyRowIds(prev => new Set(prev).add(row.id));
    });
    setRows(updatedRows);
  };

  const handleDiscard = () => {
    Swal.fire({
      title: 'Discard Changes?',
      text: "All your unsaved edits will be lost.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, discard'
    }).then((result) => {
      if (result.isConfirmed) {
        setRows(JSON.parse(JSON.stringify(originalRows)));
        setDirtyRowIds(new Set());
      }
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      const changes = Array.from(dirtyRowIds)
        .map(id => rows.find(r => r.id === id))
        .filter((r): r is Row => r !== undefined);
      
      // Update each changed budget sequentially (since we don't have a bulk endpoint in budgetService)
      for (const row of changes) {
        await budgetService.setCategoryBudget(row.id, {
          basic_monthly_amount: row.basicMonthly,
          extend_monthly_amount: row.extendMonthly,
          basic_annual_amount: row.basicAnnual,
          extend_annual_amount: row.extendAnnual,
        });
      }

      setDirtyRowIds(new Set());
      setOriginalRows(JSON.parse(JSON.stringify(rows)));
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Changes saved successfully',
        showConfirmButton: false,
        timer: 3000
      });
      
      onRefresh();
    } catch (error) {
      console.error('Failed to save budgets', error);
      Swal.fire('Error', 'Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getIconComponent = (iconKey: string): IconType => {
    const IconComponent = (FaIcons as Record<string, IconType>)[iconKey];
    return IconComponent || FaIcons.FaGift;
  };

  const NameFormatter = ({ row }: { row: Row }) => {
    const Icon = getIconComponent(row.category.icon || 'FaGift');
    
    const toggleCollapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCollapsedParents(prev => {
        const next = new Set(prev);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
    };

    return (
      <div className={`d-flex align-items-center h-100 ${row.isParent ? 'fw-bold' : ''}`} style={{ paddingLeft: row.isParent ? '0' : '2rem' }}>
        {row.hasChildren ? (
          <div 
             className="me-2 text-muted d-flex align-items-center justify-content-center flex-shrink-0" 
             style={{ width: '20px', cursor: 'pointer' }}
             onClick={toggleCollapse}
          >
             {collapsedParents.has(row.id) ? <FaIcons.FaChevronRight size={12} /> : <FaIcons.FaChevronDown size={12} />}
          </div>
        ) : row.isParent ? (
          <div className="me-2 flex-shrink-0" style={{ width: '20px' }} />
        ) : (
          <span className="text-muted me-2" style={{ opacity: 0.5 }}>↳</span>
        )}
        <div 
          className="me-2 d-flex align-items-center justify-content-center flex-shrink-0" 
          style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: row.category.color || '#ccc', color: 'white' }}
        >
          <Icon size={10} />
        </div>
        <span className="text-truncate">{row.category.name}</span>
      </div>
    );
  };

  const CurrencyFormatter = ({ value, isDirty }: { value: number, isDirty?: boolean }) => {
    return (
      <div className={`text-end h-100 d-flex align-items-center justify-content-end ${isDirty ? 'text-primary fw-bold' : ''}`}>
        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(value)}
      </div>
    );
  };

  const PercentageFormatter = ({ value }: { value: number }) => {
    const isOver = value > 100;
    return (
      <div className={`text-end h-100 d-flex align-items-center justify-content-end ${isOver ? 'text-danger fw-bold' : ''}`}>
        {value.toFixed(1)}%
      </div>
    );
  };

  const allColumns: Column<Row>[] = [
    { 
      key: 'name', 
      name: 'Category Name', 
      width: 250, 
      frozen: true,
      sortable: true,
      renderCell: (props) => props.row.isSummary ? <div className="fw-bold text-end pe-2">Total</div> : <NameFormatter row={props.row} />,
    },
    { 
      key: 'basicMonthly', 
      name: 'Monthly Basic', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : 'cell-editable',
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.basicMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendMonthly', 
      name: 'Monthly Extend', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : 'cell-editable',
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.extendMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentMonthly', 
      name: 'Monthly Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={Math.abs(props.row.spentMonthly)} />,
    },
    { 
      key: 'periodicMargin', 
      name: 'Monthly Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => (
        <div className={`text-end h-100 d-flex align-items-center justify-content-end ${props.row.periodicMargin < 0 ? 'text-danger fw-bold' : 'text-success'}`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(props.row.periodicMargin)}
        </div>
      ),
    },
    { 
      key: 'dailyBudget', 
      name: 'Daily Budget (Est)', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={props.row.dailyBudget} />,
    },
    { 
      key: 'periodicAvailablePercentage', 
      name: 'Monthly % Used', 
      width: 130, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => <PercentageFormatter value={props.row.periodicAvailablePercentage} />,
    },
    { 
      key: 'basicAnnual', 
      name: 'Annual Basic', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : 'cell-editable',
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.basicAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendAnnual', 
      name: 'Annual Extend', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : 'cell-editable',
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.extendAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentAnnual', 
      name: 'Annual Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={Math.abs(props.row.spentAnnual)} />,
    },
    { 
      key: 'annualMargin', 
      name: 'Annual Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      sortable: true,
      renderCell: (props) => (
        <div className={`text-end h-100 d-flex align-items-center justify-content-end ${props.row.annualMargin < 0 ? 'text-danger fw-bold' : 'text-success'}`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(props.row.annualMargin)}
        </div>
      ),
    },
  ];

  // Configurable Columns State with LocalStorage
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budgetTableVisibleColumns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse budgetTableVisibleColumns', e);
        }
      }
    }
    return {
      name: true,
      basicMonthly: true,
      extendMonthly: true,
      spentMonthly: true,
      periodicMargin: true,
      dailyBudget: false,
      periodicAvailablePercentage: false,
      basicAnnual: true,
      extendAnnual: false,
      spentAnnual: false,
      annualMargin: false,
    };
  });

  useEffect(() => {
    localStorage.setItem('budgetTableVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columns = allColumns.filter(col => visibleColumns[col.key]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const rowClass = (row: Row) => {
    let classes = [];
    if (row.isParent) classes.push('bg-parent');
    if (dirtyRowIds.has(row.id)) classes.push('bg-warning bg-opacity-10');
    if (currentMatchId === row.id) {
      classes.push('row-highlight');
    }
    return classes.join(' ');
  };

  return (
    <div className="d-flex flex-column bg-white border rounded shadow-sm overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      
      {/* Sticky Toolbar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center p-3 border-bottom bg-white gap-3" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2">
              <FaColumns size={12} />
              <span>Columns</span>
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {allColumns.map(col => (
                <Dropdown.Item 
                  key={col.key} 
                  as="div" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleColumn(col.key);
                  }}
                >
                  <Form.Check 
                    type="checkbox"
                    id={`col-${col.key}`}
                    label={col.name as string}
                    checked={visibleColumns[col.key]}
                    onChange={() => {}} // Handled by div onClick
                    style={{ cursor: 'pointer' }}
                  />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <div className="ms-3 d-flex align-items-center bg-light rounded px-2 py-1 border">
            <FaIcons.FaSearch className="text-muted me-2" size={12} />
            <Form.Control
              type="text"
              size="sm"
              placeholder="Search category..."
              className="border-0 bg-transparent shadow-none"
              style={{ minWidth: '150px' }}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <Button variant="link" size="sm" className="p-0 text-muted mx-1 d-flex align-items-center" onClick={() => setSearchInput('')}>
                <FaIcons.FaTimes size={12} />
              </Button>
            )}
            {searchQuery && (
              <div className="d-flex align-items-center border-start ps-2 border-secondary border-opacity-25 ms-1">
                <span className="text-muted small me-2" style={{ whiteSpace: 'nowrap' }}>
                  {searchMatches.length > 0 ? `${(currentMatchId ? searchMatches.indexOf(currentMatchId) : 0) + 1} of ${searchMatches.length}` : '0 results'}
                </span>
                <Button variant="link" size="sm" className="p-0 text-secondary me-1" onClick={handlePrevMatch} disabled={searchMatches.length === 0}>
                  <FaIcons.FaChevronUp size={12} />
                </Button>
                <Button variant="link" size="sm" className="p-0 text-secondary" onClick={handleNextMatch} disabled={searchMatches.length === 0}>
                  <FaIcons.FaChevronDown size={12} />
                </Button>
              </div>
            )}
          </div>
          
          <div className="ms-2 d-none d-lg-flex gap-1">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              className="p-1 px-2 d-flex align-items-center gap-1" 
              onClick={collapsedParents.size === 0 ? collapseAll : expandAll} 
              title={collapsedParents.size === 0 ? "Collapse All" : "Expand All"}
            >
              {collapsedParents.size === 0 ? <FaIcons.FaCompressAlt size={12} /> : <FaIcons.FaExpandAlt size={12} />}
            </Button>
          </div>
        </div>

        <div className="d-flex gap-2">
          {hasChanges && (
            <Button variant="outline-secondary" size="sm" onClick={handleDiscard} disabled={isSaving} className="d-flex align-items-center gap-2">
              <FaUndo size={12} />
              Discard
            </Button>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="d-flex align-items-center gap-2 px-3 fw-bold"
            style={{ transition: 'all 0.2s', opacity: hasChanges ? 1 : 0.6 }}
          >
            <FaSave size={14} />
            {isSaving ? 'Saving...' : `Save Changes ${hasChanges ? `(${dirtyRowIds.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Grid container with custom styling for spreadsheet look */}
      <div className="d-flex flex-column" style={{ position: 'relative' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .rdg {
            border: none;
            height: auto;
            max-height: calc(100vh - 250px);
            --rdg-background-color: #f8f9fa; /* Dark gray for readonly cells */
            --rdg-header-background-color: #e9ecef; /* Slightly darker for headers */
            --rdg-row-height: 40px;
            --rdg-header-row-height: 45px;
            --rdg-selection-color: var(--bs-primary);
          }
          .rdg-row.bg-parent {
            --rdg-background-color: #e2e6ea; /* Distinct gray for parent rows */
          }
          .rdg-row.row-highlight {
            --rdg-background-color: #fff3cd !important;
          }
          .rdg-row.bg-warning {
            --rdg-background-color: #fff3cd;
          }
          .rdg-cell {
            padding: 0 12px;
            border-right: 1px solid #dee2e6;
            border-bottom: 1px solid #dee2e6;
            background-color: var(--rdg-background-color);
          }
          .rdg-header-cell {
            background-color: var(--rdg-header-background-color);
            font-weight: 600;
            border-right: 1px solid #dee2e6;
            border-bottom: 2px solid #dee2e6;
          }
          .cell-editable {
            background-color: #ffffff; /* Contrast white for editable */
            cursor: cell;
          }
          .cell-editable:hover {
            background-color: #f0f7ff;
          }
          /* Override editable background on parent rows */
          .rdg-row.bg-parent .cell-editable {
            background-color: #f8f9fa;
          }
          .header-editable {
            background-color: #cfe2ff !important; /* Blue tint for editable headers */
            color: #084298;
          }
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
        />
      </div>
    </div>
  );
}
