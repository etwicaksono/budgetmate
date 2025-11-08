import { useCallback } from 'react';
import Swal from 'sweetalert2';

export type BulkActionType = 'edit' | 'export' | 'delete';

interface UseBulkActionHandlerOptions {
  hasSelection: boolean;
  selectedCount: number;
  entityLabel?: string;
}

export function useBulkActionHandler({
  hasSelection,
  selectedCount,
  entityLabel = 'record',
}: UseBulkActionHandlerOptions) {
  const handleBulkAction = useCallback(
    (action: BulkActionType) => {
      if (!hasSelection) {
        return;
      }

      const pluralizedEntity =
        selectedCount === 1 ? entityLabel : `${entityLabel}s`;

      void Swal.fire({
        icon: 'info',
        title: 'Bulk action coming soon',
        text: `Bulk ${action} for ${selectedCount} ${pluralizedEntity} will be available in a future update.`,
        confirmButtonColor: '#00a86b',
      });
    },
    [entityLabel, hasSelection, selectedCount]
  );

  return handleBulkAction;
}

