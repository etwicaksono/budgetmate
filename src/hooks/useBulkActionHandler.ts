import { useCallback } from 'react';
import Swal from 'sweetalert2';

interface UseBulkActionHandlerProps {
  hasSelection: boolean;
  selectedCount: number;
  entityLabel?: string;
}

type BulkActionType = 'edit' | 'export' | 'delete';

export const useBulkActionHandler = ({
  hasSelection,
  selectedCount,
  entityLabel = 'item',
}: UseBulkActionHandlerProps) => {
  const handleBulkAction = useCallback(
    (action: BulkActionType) => {
      if (!hasSelection) {
        void Swal.fire({
          icon: 'warning',
          title: 'No Selection',
          text: `Please select at least one ${entityLabel} first`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#0d6efd',
        });
        return;
      }

      const pluralLabel = selectedCount === 1 ? entityLabel : `${entityLabel}s`;

      switch (action) {
        case 'edit':
          void Swal.fire({
            icon: 'info',
            title: 'Bulk Edit',
            text: `Bulk editing ${selectedCount} ${pluralLabel} is not yet implemented`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d6efd',
          });
          break;

        case 'export':
          void Swal.fire({
            icon: 'info',
            title: 'Bulk Export',
            text: `Exporting ${selectedCount} ${pluralLabel} is not yet implemented`,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0d6efd',
          });
          break;

        case 'delete':
          void Swal.fire({
            icon: 'warning',
            title: 'Bulk Delete',
            text: `Are you sure you want to delete ${selectedCount} ${pluralLabel}?`,
            showCancelButton: true,
            confirmButtonText: 'Yes, delete',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            reverseButtons: true,
          }).then((result) => {
            if (result.isConfirmed) {
              void Swal.fire({
                icon: 'info',
                title: 'Coming Soon',
                text: 'Bulk delete is not yet implemented',
                confirmButtonText: 'OK',
                confirmButtonColor: '#0d6efd',
              });
            }
          });
          break;

        default:
          break;
      }
    },
    [hasSelection, selectedCount, entityLabel]
  );

  return handleBulkAction;
};
