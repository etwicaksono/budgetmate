import { useState } from 'react';
import { Row } from '../types';
import { budgetService } from '@/services/budgetService';
import Swal from 'sweetalert2';

interface UseBudgetPersistenceProps {
  originalRows: Row[];
  setOriginalRows: React.Dispatch<React.SetStateAction<Row[]>>;
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  dirtyRowsRef: React.MutableRefObject<Record<string, Row>>;
  onRefresh: () => void;
}

export function useBudgetPersistence({
  originalRows,
  setOriginalRows,
  setRows,
  dirtyRowsRef,
  onRefresh
}: UseBudgetPersistenceProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyRowIds, setDirtyRowIds] = useState<Set<string>>(new Set());

  const hasChanges = dirtyRowIds.size > 0;

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
      } catch (error: unknown) {
        console.error(`Failed to save budget for ${row.category.name}`, error);
        let msg = 'Failed to save changes';
        const err = error as { response?: { data?: { error?: { message?: string } } } };
        if (err?.response?.data?.error?.message) {
          msg = err.response.data.error.message;
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

  return {
    isSaving,
    dirtyRowIds,
    setDirtyRowIds,
    hasChanges,
    handleSave,
    handleDiscard
  };
}
