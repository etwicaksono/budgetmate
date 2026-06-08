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

  // Selection State
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [lastActiveCell, setLastActiveCell] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const updateSelectionRectangle = (start: { rowIdx: number, colIdx: number }, end: { rowIdx: number, colIdx: number }, add: boolean = false) => {
    const minRow = Math.min(start.rowIdx, end.rowIdx);
    const maxRow = Math.max(start.rowIdx, end.rowIdx);
    const minCol = Math.min(start.colIdx, end.colIdx);
    const maxCol = Math.max(start.colIdx, end.colIdx);

    const newSelection = add ? new Set(selectedCells) : new Set<string>();

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (isSelectable(r, c)) {
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

    if (!isSelectable(coords.rowIdx, coords.colIdx)) {
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
    const changes = Array.from(dirtyRowIds)
      .map(id => rows.find(r => r.id === id))
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
        
        // On success, remove from dirty set
        newDirtyRowIds.delete(row.id);
        
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
        />
      </div>
    </div>
  );
}
