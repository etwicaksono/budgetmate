'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

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
  isCollapsed?: boolean;
  isSummary?: boolean;
  // Read-only calculated fields
  periodicMargin: number;
  dailyBudget: number;
  periodicAvailablePercentage: number;
  annualMargin: number;
}

let initialOverwriteKey: string | null = null;

// Custom cell editors
const numberEditor = (props: RenderEditCellProps<Row, any>) => {
  const overwriteKey = initialOverwriteKey;
  initialOverwriteKey = null; // consume immediately

  return (
    <input
      type="number"
      className="w-100 h-100 px-2 border-0 bg-transparent text-end"
      style={{ outline: 'none' }}
      autoFocus
      defaultValue={overwriteKey !== null ? overwriteKey : String(props.row[props.column.key as keyof Row])}
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
        props.onRowChange({ ...props.row, [props.column.key]: parsed }, false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          props.onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: props.row.id, colKey: props.column.key, direction: e.shiftKey ? 'up' : 'down' } 
          }));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          props.onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: props.row.id, colKey: props.column.key, direction: 'up' } 
          }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          props.onClose(true, true);
          window.dispatchEvent(new CustomEvent('editor-navigate', { 
            detail: { rowId: props.row.id, colKey: props.column.key, direction: 'down' } 
          }));
        }
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
  
  const dirtyRowsRef = useRef<Record<string, Row>>({});

  const gridRef = useRef<DataGridHandle>(null);
  const lastQueryForExpandRef = useRef<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchMatches, setSearchMatches] = useState<string[]>([]);
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);

  // Selection State
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [lastActiveCell, setLastActiveCell] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Compute selection summary (sum/avg/count) from selectedCells
  const selectionStats = useMemo(() => {
    if (selectedCells.size === 0) return null;
    const values: number[] = [];
    selectedCells.forEach(sc => {
      const [id, key] = sc.split(':::');
      const row = rows.find(r => r.id === id);
      if (row) {
        const val = row[key as keyof Row];
        if (typeof val === 'number') values.push(val);
      }
    });
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    return { sum, avg, count: values.length };
  }, [selectedCells, rows]);

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

  const buildGridRows = useCallback((pData: CombinedBudgetItem[], collapsed: Set<string>, dirtyData: Record<string, Row>) => {
    const flattened: Row[] = [];
    
    let summaryBasicMonthly = 0;
    let summaryExtendMonthly = 0;
    let summarySpentMonthly = 0;
    let summaryBasicAnnual = 0;
    let summaryExtendAnnual = 0;
    let summarySpentAnnual = 0;

    pData.forEach((parent: CombinedBudgetItem) => {
      let pBasicMonthly = 0;
      let pExtendMonthly = 0;
      let pSpentMonthly = 0;
      let pBasicAnnual = 0;
      let pExtendAnnual = 0;
      let pSpentAnnual = 0;

      if (parent.children && parent.children.length > 0) {
        parent.children.forEach(child => {
          const cRow = dirtyData[child.category.id] || child;
          pBasicMonthly += cRow.basicMonthly || 0;
          pExtendMonthly += cRow.extendMonthly || 0;
          pSpentMonthly += cRow.spentMonthly || 0;
          pBasicAnnual += cRow.basicAnnual || 0;
          pExtendAnnual += cRow.extendAnnual || 0;
          pSpentAnnual += cRow.spentAnnual || 0;
        });
      } else {
        const pRow = dirtyData[parent.category.id] || parent;
        pBasicMonthly = pRow.basicMonthly || 0;
        pExtendMonthly = pRow.extendMonthly || 0;
        pSpentMonthly = pRow.spentMonthly || 0;
        pBasicAnnual = pRow.basicAnnual || 0;
        pExtendAnnual = pRow.extendAnnual || 0;
        pSpentAnnual = pRow.spentAnnual || 0;
      }

      summaryBasicMonthly += pBasicMonthly;
      summaryExtendMonthly += pExtendMonthly;
      summarySpentMonthly += pSpentMonthly;
      summaryBasicAnnual += pBasicAnnual;
      summaryExtendAnnual += pExtendAnnual;
      summarySpentAnnual += pSpentAnnual;

      const pRow: Row = {
        ...(dirtyData[parent.category.id] || parent),
        id: parent.category.id,
        isParent: true,
        parentId: null,
        hasChildren: !!parent.children && parent.children.length > 0,
        basicMonthly: pBasicMonthly,
        extendMonthly: pExtendMonthly,
        spentMonthly: pSpentMonthly,
        basicAnnual: pBasicAnnual,
        extendAnnual: pExtendAnnual,
        spentAnnual: pSpentAnnual,
        periodicMargin: pBasicMonthly + pExtendMonthly - Math.abs(pSpentMonthly),
        dailyBudget: (pBasicMonthly + pExtendMonthly) / 30,
        periodicAvailablePercentage: (pBasicMonthly + pExtendMonthly) > 0 ? (Math.abs(pSpentMonthly) / (pBasicMonthly + pExtendMonthly)) * 100 : 0,
        annualMargin: pBasicAnnual + pExtendAnnual - Math.abs(pSpentAnnual),
        isCollapsed: collapsed.has(parent.category.id),
      };
      flattened.push(pRow);

      if (parent.children && !collapsed.has(parent.category.id)) {
        parent.children.forEach((child: CombinedBudgetItem) => {
          const cData = dirtyData[child.category.id] || child;
          const cRow: Row = {
            ...child,
            ...cData,
            id: child.category.id,
            isParent: false,
            parentId: parent.category.id,
            hasChildren: false,
            periodicMargin: cData.basicMonthly + cData.extendMonthly - Math.abs(cData.spentMonthly),
            dailyBudget: (cData.basicMonthly + cData.extendMonthly) / 30,
            periodicAvailablePercentage: (cData.basicMonthly + cData.extendMonthly) > 0 ? (Math.abs(cData.spentMonthly) / (cData.basicMonthly + cData.extendMonthly)) * 100 : 0,
            annualMargin: cData.basicAnnual + cData.extendAnnual - Math.abs(cData.spentAnnual),
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
      basicMonthly: summaryBasicMonthly,
      extendMonthly: summaryExtendMonthly,
      spentMonthly: summarySpentMonthly,
      periodicMargin: summaryBasicMonthly + summaryExtendMonthly - Math.abs(summarySpentMonthly),
      dailyBudget: (summaryBasicMonthly + summaryExtendMonthly) / 30,
      periodicAvailablePercentage: (summaryBasicMonthly + summaryExtendMonthly) > 0 ? (Math.abs(summarySpentMonthly) / (summaryBasicMonthly + summaryExtendMonthly)) * 100 : 0,
      basicAnnual: summaryBasicAnnual,
      extendAnnual: summaryExtendAnnual,
      spentAnnual: summarySpentAnnual,
      annualMargin: summaryBasicAnnual + summaryExtendAnnual - Math.abs(summarySpentAnnual),
    };

    return [...flattened, summary as unknown as Row];
  }, []);

  useEffect(() => {
    const newRows = buildGridRows(processedData, collapsedParents, dirtyRowsRef.current);
    setRows(newRows);
    setOriginalRows(JSON.parse(JSON.stringify(newRows)));
  }, [processedData, collapsedParents, buildGridRows]);

  const getCellCoords = (e: React.PointerEvent<HTMLDivElement> | PointerEvent): { rowIdx: number, colIdx: number } | null => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.rdg-cell');
    const row = target.closest('.rdg-row');
    if (!cell || !row) return null;

    const ariaRowIndex = parseInt(row.getAttribute('aria-rowindex') || '0', 10);
    const ariaColIndex = parseInt(cell.getAttribute('aria-colindex') || '0', 10);

    const rowIdx = ariaRowIndex - 2;
    const colIdx = ariaColIndex - 1;

    if (rowIdx < 0 || colIdx < 0 || rowIdx >= rows.length || colIdx >= columns.length) return null;
    return { rowIdx, colIdx };
  };

  const isSelectable = (rowIdx: number, colIdx: number) => {
    const row = rows[rowIdx];
    const col = columns[colIdx];
    if (!row || !col) return false;
    if (row.isSummary || row.isParent) return false;
    const editableColumns = new Set(['basicMonthly', 'extendMonthly', 'basicAnnual', 'extendAnnual']);
    return editableColumns.has(col.key);
  };

  // Any cell with a numeric value (editable + readonly) can be included in selection for sum display
  const isNumeric = (rowIdx: number, colIdx: number) => {
    const row = rows[rowIdx];
    const col = columns[colIdx];
    if (!row || !col) return false;
    if (row.isSummary) return false; // exclude total summary row
    const numericColumns = new Set([
      'basicMonthly', 'extendMonthly', 'basicAnnual', 'extendAnnual',
      'spentMonthly', 'spentAnnual', 'periodicMargin', 'annualMargin',
      'dailyBudget', 'periodicAvailablePercentage'
    ]);
    return numericColumns.has(col.key);
  };


  const updateSelectionRectangle = (start: { rowIdx: number, colIdx: number }, end: { rowIdx: number, colIdx: number }, add: boolean = false) => {
    const minRow = Math.min(start.rowIdx, end.rowIdx);
    const maxRow = Math.max(start.rowIdx, end.rowIdx);
    const minCol = Math.min(start.colIdx, end.colIdx);
    const maxCol = Math.max(start.colIdx, end.colIdx);

    const newSelection = add ? new Set(selectedCells) : new Set<string>();

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (isNumeric(r, c)) {  // include all numeric cells, not just editable
          if (columns[c] && rows[r]) newSelection.add(`${rows[r]!.id}:::${columns[c]!.key}`);
        }
      }
    }
    setSelectedCells(newSelection);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const coords = getCellCoords(e);
    if (!coords) return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    // Allow selection on any numeric cell (editable + readonly)
    if (!isNumeric(coords.rowIdx, coords.colIdx)) {
      if (!e.ctrlKey && !e.shiftKey) setSelectedCells(new Set());
      return;
    }

    setIsDragging(true);
    setLastActiveCell(coords);

    if (e.shiftKey && selectionStart) {
      updateSelectionRectangle(selectionStart, coords, e.ctrlKey);
    } else {
      setSelectionStart(coords);
      updateSelectionRectangle(coords, coords, e.ctrlKey);
    }
  };

  const handlePointerOver = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !selectionStart) return;
    const coords = getCellCoords(e);
    if (!coords) return;
    if (lastActiveCell && coords.rowIdx === lastActiveCell.rowIdx && coords.colIdx === lastActiveCell.colIdx) return;
    
    setLastActiveCell(coords);
    updateSelectionRectangle(selectionStart, coords, e.ctrlKey);
  };

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  const handleCopy = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (selectedCells.size === 0) return;

    const coords = Array.from(selectedCells).map(sc => {
      const [id, key] = sc.split(':::');
      const r = rows.findIndex(row => row.id === id);
      const c = columns.findIndex(col => col.key === key);
      return { r, c };
    }).filter(pos => pos.r !== -1 && pos.c !== -1);

    if (coords.length === 0) return;

    const minR = Math.min(...coords.map(pos => pos.r));
    const maxR = Math.max(...coords.map(pos => pos.r));
    const minC = Math.min(...coords.map(pos => pos.c));
    const maxC = Math.max(...coords.map(pos => pos.c));

    let tsv = '';
    for (let r = minR; r <= maxR; r++) {
      let rowTsv = [];
      for (let c = minC; c <= maxC; c++) {
        const id = columns[c] && rows[r] ? `${rows[r]!.id}:::${columns[c]!.key}` : '';
        if (id && selectedCells.has(id)) {
           rowTsv.push(String(rows[r]![columns[c]!.key as keyof Row] ?? '0'));
        } else {
           rowTsv.push('');
        }
      }
      tsv += rowTsv.join('\t') + '\n';
    }

    try {
      await navigator.clipboard.writeText(tsv);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Copied to clipboard', showConfirmButton: false, timer: 1500 });
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePaste = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!lastActiveCell) return;
    if (document.activeElement?.tagName === 'INPUT') return;
    e.preventDefault();

    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.length > 0);
      const matrix = lines.map(line => line.split('\t'));

      let minR = lastActiveCell.rowIdx;
      let minC = lastActiveCell.colIdx;

      if (selectedCells.size > 0) {
        const coords = Array.from(selectedCells).map(sc => {
          const [id, key] = sc.split(':::');
          const r = rows.findIndex(row => row.id === id);
          const c = columns.findIndex(col => col.key === key);
          return { r, c };
        }).filter(pos => pos.r !== -1 && pos.c !== -1);
        if (coords.length > 0) {
          minR = Math.min(...coords.map(pos => pos.r));
          minC = Math.min(...coords.map(pos => pos.c));
        }
      }

      const singleValue = matrix.length === 1 && matrix[0] && matrix[0].length === 1 ? matrix[0][0] : null;

      let changed = false;
      const newRows = [...rows];
      const newDirtyIds = new Set(dirtyRowIds);

      const processCell = (r: number, c: number, rawVal: string) => {
        if (r < rows.length && c < columns.length && isSelectable(r, c)) {
          let cleanStr = rawVal.replace(/[^\d.,-]/g, '');
          if (cleanStr.includes('.') && cleanStr.includes(',')) {
            const lastDot = cleanStr.lastIndexOf('.');
            const lastComma = cleanStr.lastIndexOf(',');
            if (lastComma > lastDot) cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
            else cleanStr = cleanStr.replace(/,/g, '');
          } else if (cleanStr.includes(',')) {
            if (/,(\d{1,2})$/.test(cleanStr)) cleanStr = cleanStr.replace(',', '.');
            else cleanStr = cleanStr.replace(/,/g, '');
          } else {
            if (/\.(\d{3})$/.test(cleanStr) && cleanStr.length > 4) cleanStr = cleanStr.replace(/\./g, '');
          }
          
          const numVal = parseFloat(cleanStr) || 0;
          const finalVal = Math.round(numVal);
          
          if (!isNaN(finalVal)) {
            const row = newRows[r];
            if (row && columns[c]) {
              const colKey = columns[c].key as keyof Row;
              (row as any)[colKey] = finalVal;
            
              row.periodicMargin = row.basicMonthly + row.extendMonthly - Math.abs(row.spentMonthly);
              row.dailyBudget = (row.basicMonthly + row.extendMonthly) / 30;
              row.periodicAvailablePercentage = (row.basicMonthly + row.extendMonthly) > 0 ? (Math.abs(row.spentMonthly) / (row.basicMonthly + row.extendMonthly)) * 100 : 0;
              row.annualMargin = row.basicAnnual + row.extendAnnual - Math.abs(row.spentAnnual);

              newDirtyIds.add(row.id);
              changed = true;
            }
          }
        }
      };

      if (singleValue !== null && selectedCells.size > 1) {
         Array.from(selectedCells).forEach(sc => {
            const [id, key] = sc.split(':::');
            const r = rows.findIndex(row => row.id === id);
            const c = columns.findIndex(col => col.key === key);
            if (r !== -1 && c !== -1 && singleValue !== undefined) processCell(r, c, singleValue);
         });
      } else {
         for (let i = 0; i < matrix.length; i++) {
           const rowMatrix = matrix[i];
           if (!rowMatrix) continue;
           for (let j = 0; j < rowMatrix.length; j++) {
             const val = rowMatrix[j];
             if (val !== undefined) processCell(minR + i, minC + j, val);
           }
         }
      }

      if (changed) {
        setRows(newRows);
        setDirtyRowIds(newDirtyIds);
      }
    } catch (err) {
      console.error('Failed to paste', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Only act when NOT in an input (edit mode already handled by onCellKeyDown)
    if (document.activeElement?.tagName === 'INPUT') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      handleCopy(e);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      handlePaste(e);
      return;
    }

    if (e.shiftKey && e.key.startsWith('Arrow')) {
      if (!lastActiveCell || !selectionStart) return;
      e.preventDefault();
      let { rowIdx, colIdx } = lastActiveCell;
      if (e.key === 'ArrowUp') rowIdx = Math.max(0, rowIdx - 1);
      if (e.key === 'ArrowDown') rowIdx = Math.min(rows.length - 1, rowIdx + 1);
      if (e.key === 'ArrowLeft') colIdx = Math.max(0, colIdx - 1);
      if (e.key === 'ArrowRight') colIdx = Math.min(columns.length - 1, colIdx + 1);
      
      const newCoords = { rowIdx, colIdx };
      setLastActiveCell(newCoords);
      updateSelectionRectangle(selectionStart, newCoords, false);
      gridRef.current?.scrollToCell({ rowIdx: newCoords.rowIdx, idx: newCoords.colIdx });
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedCells.size > 0) {
        e.preventDefault();
        let changed = false;
        const newRows = [...rows];
        const newDirtyIds = new Set(dirtyRowIds);

        selectedCells.forEach(sc => {
          const [id, key] = sc.split(':::');
          const r = newRows.findIndex(row => row.id === id);
          const c = columns.findIndex(col => col.key === key);
          
          if (r !== -1 && c !== -1 && isSelectable(r, c)) {
            const row = newRows[r];
            if (row) {
              const colKey = key as keyof Row;
              (row as any)[colKey] = 0;
              
              row.periodicMargin = row.basicMonthly + row.extendMonthly - Math.abs(row.spentMonthly);
              row.dailyBudget = (row.basicMonthly + row.extendMonthly) / 30;
              row.periodicAvailablePercentage = (row.basicMonthly + row.extendMonthly) > 0 ? (Math.abs(row.spentMonthly) / (row.basicMonthly + row.extendMonthly)) * 100 : 0;
              row.annualMargin = row.basicAnnual + row.extendAnnual - Math.abs(row.spentAnnual);

              newDirtyIds.add(row.id);
              changed = true;
            }
          }
        });

        if (changed) {
          setRows(newRows);
          setDirtyRowIds(newDirtyIds);
        }
      }
    }
  };


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
      
      dirtyRowsRef.current[row.id] = row;
      setDirtyRowIds(prev => new Set(prev).add(row.id));
    });
    setRows(buildGridRows(processedData, collapsedParents, dirtyRowsRef.current));
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
        dirtyRowsRef.current = {};
        setDirtyRowIds(new Set());
        // Temporarily trigger an update using setRows from originalRows,
        // but to handle correctly un-collapsed parents without edits,
        // we trigger a re-flatten by slightly toggling and un-toggling a fake state, or just call setRows.
        // Wait, since we clear dirtyRowsRef, we can just rebuild the rows manually here or let originalRows restore it.
        // Restoring originalRows is safe enough since it preserves the exact visible state before edits.
        setRows(JSON.parse(JSON.stringify(originalRows)));
      }
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    const changes = Array.from(dirtyRowIds)
      .map(id => dirtyRowsRef.current[id])
      .filter((r): r is Row => r !== undefined);
      
    const newDirtyRowIds = new Set(dirtyRowIds);
    const newOriginalRows = [...originalRows];
    const errors: { categoryName: string, message: string }[] = [];
    
    // Update each changed budget sequentially
    for (const row of changes) {
      try {
        await budgetService.setCategoryBudget(row.id, {
          basic_monthly_amount: row.basicMonthly,
          extend_monthly_amount: row.extendMonthly,
          basic_annual_amount: row.basicAnnual,
          extend_annual_amount: row.extendAnnual,
        });
        
        // On success, remove from dirty set and ref
        newDirtyRowIds.delete(row.id);
        delete dirtyRowsRef.current[row.id];
        
        // Update originalRows with the new saved state
        const origIdx = newOriginalRows.findIndex(r => r.id === row.id);
        if (origIdx !== -1) {
          newOriginalRows[origIdx] = JSON.parse(JSON.stringify(row));
        }
      } catch (error: any) {
        console.error(`Failed to save budget for ${row.category.name}`, error);
        let msg = 'Failed to save changes';
        if (error?.response?.data?.error?.message) {
          msg = error.response.data.error.message;
        }
        errors.push({ categoryName: row.category.name, message: msg });
      }
    }

    setDirtyRowIds(newDirtyRowIds);
    setOriginalRows(newOriginalRows);
    
    setIsSaving(false);
    
    if (errors.length === 0) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Changes saved successfully',
        showConfirmButton: false,
        timer: 3000
      });
      onRefresh();
    } else {
      const errorHtml = `
        <div class="text-start" style="font-size: 0.9rem;">
          <p class="mb-2">Beberapa kategori gagal disimpan:</p>
          <ul class="text-danger ps-3 mb-0">
            ${errors.map(e => `<li><strong>${e.categoryName}</strong>: ${e.message}</li>`).join('')}
          </ul>
        </div>
      `;
      Swal.fire({
        title: 'Sebagian Data Gagal',
        html: errorHtml,
        icon: 'warning',
        confirmButtonText: 'Tutup'
      });
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
      <div 
        className={`d-flex align-items-center h-100 ${row.isParent ? 'fw-bold' : ''}`} 
        style={{ 
          paddingLeft: row.isParent ? '0' : '2rem',
          cursor: row.hasChildren ? 'pointer' : 'default'
        }}
        onClick={row.hasChildren ? toggleCollapse : undefined}
      >
        {row.hasChildren ? (
          <div 
             className="me-2 text-muted d-flex align-items-center justify-content-center flex-shrink-0" 
             style={{ width: '20px' }}
          >
             {row.isCollapsed ? <FaIcons.FaChevronRight size={12} /> : <FaIcons.FaChevronDown size={12} />}
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

  const getEditableCellClass = (row: Row) => {
    if (row.isSummary) return 'fw-bold bg-light';
    if (row.isParent) return 'text-muted'; // inherits .bg-parent background
    return 'cell-editable';
  };

  const allColumns: Column<Row>[] = useMemo(() => [
    { 
      key: 'name', 
      name: 'Category Name', 
      width: 250, 
      frozen: true,
      sortable: true,
      headerCellClass: 'header-readonly',
      renderCell: (props) => props.row.isSummary ? <div className="fw-bold text-end pe-2">Total</div> : <NameFormatter row={props.row} />,
    },
    { 
      key: 'basicMonthly', 
      name: 'Monthly Basic', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.basicMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendMonthly', 
      name: 'Monthly Extend', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.extendMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentMonthly', 
      name: 'Monthly Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={Math.abs(props.row.spentMonthly)} />,
    },
    { 
      key: 'periodicMargin', 
      name: 'Monthly Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
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
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={props.row.dailyBudget} />,
    },
    { 
      key: 'periodicAvailablePercentage', 
      name: 'Monthly % Used', 
      width: 130, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <PercentageFormatter value={props.row.periodicAvailablePercentage} />,
    },
    { 
      key: 'basicAnnual', 
      name: 'Annual Basic', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.basicAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendAnnual', 
      name: 'Annual Extend', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter value={props.row.extendAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentAnnual', 
      name: 'Annual Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter value={Math.abs(props.row.spentAnnual)} />,
    },
    { 
      key: 'annualMargin', 
      name: 'Annual Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => (
        <div className={`text-end h-100 d-flex align-items-center justify-content-end ${props.row.annualMargin < 0 ? 'text-danger fw-bold' : 'text-success'}`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(props.row.annualMargin)}
        </div>
      ),
    },
  ], [dirtyRowIds, currency]); // allColumns now memoized without selectedCells to keep DOM stable

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

  const columns = useMemo(() => allColumns.filter(col => visibleColumns[col.key]), [allColumns, visibleColumns]);

  useEffect(() => {
    const handleEditorNavigate = (e: any) => {
      const { rowId, colKey, direction } = e.detail;
      const r = rows.findIndex(row => row.id === rowId);
      const c = columns.findIndex(col => col.key === colKey);
      if (r !== -1 && c !== -1) {
        let nextRow = direction === 'up' ? r - 1 : r + 1;
        while (nextRow >= 0 && nextRow < rows.length && !isSelectable(nextRow, c)) {
          nextRow += direction === 'up' ? -1 : 1;
        }
        
        const targetRow = (nextRow >= 0 && nextRow < rows.length) ? nextRow : r; // fallback to current if at bounds
        setTimeout(() => {
          gridRef.current?.selectCell({ rowIdx: targetRow, idx: c });
        }, 10);
      }
    };
    window.addEventListener('editor-navigate', handleEditorNavigate);
    return () => window.removeEventListener('editor-navigate', handleEditorNavigate);
  }, [rows, columns, isSelectable]);

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

  // Apply selected styles manually to avoid re-rendering react-data-grid cells and breaking double-click
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

    // Use MutationObserver to reapply styles when virtualized rows are rendered
    const observer = new MutationObserver(() => {
      applyStyles();
    });
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
      style={{ 
        outline: 'none', 
        maxHeight: 'calc(100vh - 120px)'
      }}
    >
      
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
            --rdg-header-background-color: #e2e6ea; /* Distinct gray for headers */
            --rdg-row-height: 40px;
            --rdg-header-row-height: 45px;
            --rdg-selection-color: var(--bs-primary);
            user-select: none;
          }
          .rdg input {
            user-select: text;
          }
          .rdg-cell.multi-selected {
            background-color: rgba(13, 110, 253, 0.15) !important;
            box-shadow: inset 0 0 0 1px #0d6efd !important;
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
            background-color: #e2e6ea;
          }
          .header-editable {
            background-color: #cfe2ff !important; /* Blue tint for editable headers */
            color: #084298;
          }
          .header-readonly {
            background-color: #ced4da !important;
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
          onSelectedCellChange={(args) => {
            // Keep lastActiveCell in sync when user navigates with keyboard arrows
            const colIdx = columns.findIndex(c => c.key === args.column.key);
            if (colIdx >= 0 && args.rowIdx >= 0) {
              setLastActiveCell({ rowIdx: args.rowIdx, colIdx });
            }
          }}
          onCellKeyDown={(args, event) => {
            const colIdx = columns.findIndex(c => c.key === args.column.key);
            
            // Handle Enter on SELECT mode
            if (args.mode === 'SELECT' && event.key === 'Enter') {
              if (!isSelectable(args.rowIdx, colIdx)) {
                // Prevent Enter on non-editable cells from opening a blank editor
                event.preventGridDefault();
                // Navigate up or down
                const direction = event.shiftKey ? 'up' : 'down';
                let nextRow = direction === 'up' ? args.rowIdx - 1 : args.rowIdx + 1;
                while (nextRow >= 0 && nextRow < rows.length && !isSelectable(nextRow, colIdx)) {
                  nextRow += direction === 'up' ? -1 : 1;
                }
                const targetRow = (nextRow >= 0 && nextRow < rows.length) ? nextRow : args.rowIdx;
                gridRef.current?.selectCell({ rowIdx: targetRow, idx: colIdx });
                return;
              }
            }

            // Handle Delete/Backspace on SELECT mode
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

            // Only trigger overwrite in SELECT mode (not when already editing)
            if (args.mode === 'SELECT' && /^[0-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
              if (isSelectable(args.rowIdx, colIdx)) {
                event.preventGridDefault();
                event.preventDefault(); // prevent the key from also being typed into the newly-opened input
                initialOverwriteKey = event.key;
                gridRef.current?.selectCell({ rowIdx: args.rowIdx, idx: colIdx }, { enableEditor: true });
              }
            }
          }}
        />
      </div>
    </div>

    {/* Excel-like selection summary bar — fixed bottom-right of viewport */}
    {selectionStats && selectionStats.count > 1 && (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          color: '#f1f5f9',
          borderRadius: '10px',
          padding: '8px 18px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#94a3b8', fontSize: '12px' }}>
          {selectionStats.count} {selectionStats.count === 1 ? 'cell' : 'cells'} selected
        </span>
        <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />
        <span>
          <span style={{ color: '#94a3b8', marginRight: '4px' }}>Sum</span>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>
            {new Intl.NumberFormat('id-ID').format(selectionStats.sum)}
          </span>
        </span>
        <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.15)' }} />
        <span>
          <span style={{ color: '#94a3b8', marginRight: '4px' }}>Avg</span>
          <span style={{ color: '#e2e8f0' }}>
            {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(selectionStats.avg)}
          </span>
        </span>
      </div>
    )}
    </>
  );
}
