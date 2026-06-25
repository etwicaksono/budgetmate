import { useState, useMemo, useEffect } from 'react';
import { Row } from '../types';
import { Column, DataGridHandle } from 'react-data-grid';
import Swal from 'sweetalert2';
import { logError } from '@/lib/logger';

interface UseBudgetSelectionProps {
  rows: Row[];
  columns: Column<Row>[];
  gridRef: React.RefObject<DataGridHandle | null>;
  onCellsChange: (changedRows: Row[]) => void;
}

export function useBudgetSelection({ rows, columns, gridRef, onCellsChange }: UseBudgetSelectionProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selectionStart, setSelectionStart] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [lastActiveCell, setLastActiveCell] = useState<{ rowIdx: number, colIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { sum, avg, min, max, count: selectedCells.size, countNumbers: values.length };
  }, [selectedCells, rows]);

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

  const isNumeric = (rowIdx: number, colIdx: number) => {
    const row = rows[rowIdx];
    const col = columns[colIdx];
    if (!row || !col) return false;
    if (row.isSummary) return false;
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
        if (isNumeric(r, c)) {
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
      logError('Failed to copy', err);
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

      const changedRows: Row[] = [];

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
            const row = { ...rows[r] } as Row; // Copy row
            if (row && columns[c]) {
              const colKey = columns[c].key as keyof Row;
              (row as unknown as Record<string, unknown>)[colKey as string] = finalVal;
              changedRows.push(row);
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

      if (changedRows.length > 0) {
        onCellsChange(changedRows);
      }
    } catch (err) {
      logError('Failed to paste', err);
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

    if (e.key === 'Enter') {
      if (!lastActiveCell) return;
      e.preventDefault();
      e.stopPropagation();

      let { rowIdx, colIdx } = lastActiveCell;
      rowIdx = e.shiftKey ? Math.max(0, rowIdx - 1) : Math.min(rows.length - 1, rowIdx + 1);
      
      const newCoords = { rowIdx, colIdx };
      setLastActiveCell(newCoords);
      updateSelectionRectangle(newCoords, newCoords, false);
      
      setTimeout(() => {
        gridRef.current?.selectCell({ rowIdx: newCoords.rowIdx, idx: newCoords.colIdx });
      }, 0);
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
        const changedRows: Row[] = [];

        selectedCells.forEach(sc => {
          const [id, key] = sc.split(':::');
          const r = rows.findIndex(row => row.id === id);
          const c = columns.findIndex(col => col.key === key);
          
          if (r !== -1 && c !== -1 && isSelectable(r, c)) {
            const row = { ...rows[r] } as Row;
            if (row) {
              const colKey = key as keyof Row;
              (row as unknown as Record<string, unknown>)[colKey as string] = 0;
              changedRows.push(row);
            }
          }
        });

        if (changedRows.length > 0) {
          onCellsChange(changedRows);
        }
      }
    }
  };

  return {
    selectedCells,
    selectionStats,
    handlePointerDown,
    handlePointerOver,
    handleKeyDown,
    setLastActiveCell,
    isSelectable
  };
}
