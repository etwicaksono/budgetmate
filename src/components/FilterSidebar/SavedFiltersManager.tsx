import React, { useState, useMemo } from 'react';
import { Dropdown, Form, Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { FaFilter, FaSave, FaBookmark, FaInfoCircle, FaGripVertical } from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { renderIcon } from './FilterSidebar.utils';
import { ClearButton } from '@/components/common/ClearButton';
import type { FilterSidebarProps, SortValue } from './FilterSidebar.types';
import type { TransferOption, DebtOption } from '@/hooks/useFilterData';
import type { SavedFilter } from '@/services/savedFilterService';

type SavedFiltersManagerProps = Pick<
  FilterSidebarProps,
  | 'savedFilters'
  | 'activeFilterId'
  | 'savedFiltersLoading'
  | 'onSaveFilter'
  | 'onUpdateFilter'
  | 'onLoadFilter'
  | 'onDeleteFilter'
  | 'onRenameFilter'
  | 'onClearActiveFilter'
  | 'onReorderFilter'
  | 'selectedCategories'
  | 'selectedAccounts'
  | 'selectedLabelIds'
  | 'excludedLabelIds'
  | 'selectedCurrencies'
  | 'sortOption'
  | 'transferOption'
  | 'debtOption'
> & {
  handleResetFilters: () => void;
};

// Snapshot of filter state at the moment a saved filter is loaded
type FilterSnapshot = {
  selectedCategories: string[];
  selectedAccounts: string[];
  selectedLabelIds: string[];
  excludedLabelIds: string[];
  selectedCurrencies: string[];
  sortOption: SortValue;
  transferOption: TransferOption;
  debtOption: DebtOption;
};

export const SavedFiltersManager: React.FC<SavedFiltersManagerProps> = ({
  savedFilters = [],
  activeFilterId = null,
  savedFiltersLoading = false,
  onSaveFilter = async () => ({ success: false, duplicateName: false }),
  onUpdateFilter,
  onLoadFilter = () => {},
  onDeleteFilter = () => {},
  onRenameFilter = async () => ({ success: false, duplicateName: false }),
  onClearActiveFilter = () => {},
  onReorderFilter = () => {},
  selectedCategories = [],
  selectedAccounts = [],
  selectedLabelIds = [],
  excludedLabelIds = [],
  selectedCurrencies = [],
  sortOption = 'timeDesc',
  transferOption = 'include',
  debtOption = 'include',
  handleResetFilters,
}) => {
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [renameState, setRenameState] = useState<{ id: string; value: string } | null>(null);

  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveModalError, setSaveModalError] = useState<string | null>(null);
  const [saveModalLoading, setSaveModalLoading] = useState(false);

  const [loadedSnapshot, setLoadedSnapshot] = useState<FilterSnapshot | null>(null);

  const captureSnapshot = (filter: SavedFilter) => ({
    selectedCategories: filter.filters.selectedCategoryIds ?? [],
    selectedAccounts: filter.filters.selectedAccountIds ?? [],
    selectedLabelIds: filter.filters.selectedLabelIds ?? [],
    excludedLabelIds: filter.filters.excludedLabelIds ?? [],
    selectedCurrencies: filter.filters.selectedCurrencies ?? [],
    sortOption: (filter.filters.sortOption as SortValue) ?? 'timeDesc',
    transferOption: (filter.filters.transferOption as TransferOption) ?? 'include',
    debtOption: (filter.filters.debtOption as DebtOption) ?? 'include',
  });

  const handleLoadFilter = (filter: SavedFilter) => {
    onLoadFilter(filter);
    setLoadedSnapshot(captureSnapshot(filter));
  };

  const hasFilterChanged = useMemo(() => {
    if (!activeFilterId || !loadedSnapshot) return false;
    const arrEq = (a: string[], b: string[]) =>
      a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    return (
      !arrEq(selectedCategories, loadedSnapshot.selectedCategories) ||
      !arrEq(selectedAccounts, loadedSnapshot.selectedAccounts) ||
      !arrEq(selectedLabelIds, loadedSnapshot.selectedLabelIds) ||
      !arrEq(excludedLabelIds, loadedSnapshot.excludedLabelIds) ||
      !arrEq(selectedCurrencies, loadedSnapshot.selectedCurrencies) ||
      sortOption !== loadedSnapshot.sortOption ||
      transferOption !== loadedSnapshot.transferOption ||
      debtOption !== loadedSnapshot.debtOption
    );
  }, [
    activeFilterId,
    loadedSnapshot,
    selectedCategories,
    selectedAccounts,
    selectedLabelIds,
    excludedLabelIds,
    selectedCurrencies,
    sortOption,
    transferOption,
    debtOption,
  ]);

  const saveButtonEnabled = true;
  const canUpdateFilter = !!activeFilterId && hasFilterChanged;
  const activeFilterName = activeFilterId
    ? savedFilters.find((f) => f.id === activeFilterId)?.name ?? ''
    : '';

  return (
    <>
      <div className="mb-3">
        <Form.Label className="fw-semibold text-muted small d-flex align-items-center gap-1">
          My filter
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id="my-filter-tooltip">
                My filters can be saved and reused later.
              </Tooltip>
            }
          >
            <span style={{ cursor: 'default', lineHeight: 1 }}>
              {renderIcon(FaInfoCircle, { size: 12, color: '#9ca3af' })}
            </span>
          </OverlayTrigger>
        </Form.Label>
        <div className="d-flex align-items-stretch gap-2">
          {/* Filter selector dropdown */}
          <Dropdown
            show={showSavedFilters}
            onToggle={(isOpen: boolean | null) => {
              setShowSavedFilters(isOpen ?? false);
            }}
            className="flex-grow-1"
          >
            <Dropdown.Toggle
              variant="outline-secondary"
              className="w-100 d-flex align-items-center justify-content-between filter-selector-toggle filter-selector-no-caret position-relative"
              style={{
                textAlign: 'left',
                fontSize: '14px',
                borderColor: activeFilterId ? 'var(--bs-primary)' : undefined,
                color: activeFilterId ? 'var(--bs-primary)' : undefined,
                paddingRight: activeFilterId ? '2rem' : undefined,
              }}
            >
              <span className="d-flex align-items-center gap-2 text-truncate">
                {renderIcon(FaFilter, { size: 14, color: activeFilterId ? 'var(--bs-primary)' : '#6b7280' })}
                <span className="text-truncate">
                  {activeFilterId
                    ? savedFilters.find((f) => f.id === activeFilterId)?.name ?? 'Select filter'
                    : 'Select filter'}
                </span>
              </span>
              {activeFilterId && (
                <span
                  className="position-absolute end-0 top-50 translate-middle-y me-1"
                  style={{ zIndex: 5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ClearButton
                    onClick={() => {
                      handleResetFilters();
                      onClearActiveFilter();
                      setLoadedSnapshot(null);
                    }}
                  />
                </span>
              )}
            </Dropdown.Toggle>

            <Dropdown.Menu className="w-100 p-2" style={{ minWidth: '220px' }}>
              {savedFiltersLoading ? (
                <div className="text-center text-muted small py-2">Loading…</div>
              ) : savedFilters.length === 0 ? (
                <div className="text-center text-muted small py-2">No saved filters yet</div>
              ) : (
                savedFilters.map((filter) => {
                  const isActive = filter.id === activeFilterId;
                  return (
                    <div
                      key={filter.id}
                      className={`d-flex align-items-center gap-1 px-2 py-1 rounded mb-1 ${
                        isActive ? 'bg-primary bg-opacity-10' : ''
                      }`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (isActive) {
                          handleResetFilters();
                          onClearActiveFilter();
                          setLoadedSnapshot(null);
                        } else {
                          handleLoadFilter(filter);
                        }
                        setShowSavedFilters(false);
                      }}
                    >
                      {/* Active check */}
                      <span style={{ width: '16px', flexShrink: 0, color: 'var(--bs-primary)', fontSize: '12px' }}>
                        {isActive ? '✓' : ''}
                      </span>
                      {/* Filter name */}
                      <span className="flex-grow-1 text-truncate" style={{ fontSize: '14px' }}>
                        {filter.name}
                      </span>
                    </div>
                  );
                })
              )}

              {savedFilters.length > 0 && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    as="button"
                    type="button"
                    className="d-flex align-items-center gap-2 text-muted"
                    style={{ fontSize: '14px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSavedFilters(false);
                      setShowManageModal(true);
                    }}
                  >
                    {renderIcon(RiListSettingsLine, { size: 14 })}
                    Manage filters
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>

          {/* Save button with dropdown */}
          <Dropdown
            show={showSaveDropdown}
            onToggle={(isOpen: boolean | null) => {
              if (saveButtonEnabled) setShowSaveDropdown(isOpen ?? false);
            }}
            drop="down"
            align="end"
          >
            <Dropdown.Toggle
              as="button"
              id="saved-filter-save-btn"
              disabled={!saveButtonEnabled}
              title="Save filter"
              aria-label="Save filter"
              style={{
                width: '38px',
                height: '38px',
                flexShrink: 0,
                borderRadius: '8px',
                border: `1px solid ${saveButtonEnabled ? 'var(--bs-primary)' : '#dee2e6'}`,
                backgroundColor: saveButtonEnabled ? 'var(--bs-primary)' : '#f8f9fa',
                color: saveButtonEnabled ? '#fff' : '#adb5bd',
                cursor: saveButtonEnabled ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                if (saveButtonEnabled) setShowSaveDropdown((v) => !v);
              }}
            >
              {renderIcon(FaSave, { size: 16 })}
            </Dropdown.Toggle>

            <Dropdown.Menu
              align="end"
              style={{
                minWidth: '200px',
                borderRadius: '10px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                border: '1px solid #e5e7eb',
                padding: '6px',
                marginTop: '4px',
              }}
            >
              {/* Save as new */}
              <Dropdown.Item
                as="button"
                type="button"
                className="d-flex align-items-center gap-2 save-action-item"
                style={{ fontSize: '14px', borderRadius: '6px', padding: '8px 10px' }}
                onClick={() => {
                  setShowSaveDropdown(false);
                  setSaveModalName('');
                  setSaveModalError(null);
                  setShowSaveAsNewModal(true);
                }}
              >
                {renderIcon(FaSave, { size: 14 })}
                Save as new
              </Dropdown.Item>

              {/* Update existing */}
              {canUpdateFilter && (
                <Dropdown.Item
                  as="button"
                  type="button"
                  className="d-flex align-items-center gap-2 save-action-item save-action-item--update"
                  style={{ fontSize: '14px', borderRadius: '6px', padding: '8px 10px' }}
                  onClick={() => {
                    setShowSaveDropdown(false);
                    setSaveModalName(activeFilterName);
                    setSaveModalError(null);
                    setShowUpdateModal(true);
                  }}
                >
                  {renderIcon(FaBookmark, { size: 14 })}
                  <span style={{ fontWeight: 500 }}>
                    Update {activeFilterName}
                  </span>
                </Dropdown.Item>
              )}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {/* Save As New Modal */}
      <Modal
        show={showSaveAsNewModal}
        onHide={() => {
          setShowSaveAsNewModal(false);
          setSaveModalName('');
          setSaveModalError(null);
        }}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600 }}>Save Filter</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: '14px', fontWeight: 500 }}>Name</Form.Label>
            <Form.Control
              autoFocus
              type="text"
              placeholder="e.g. Food & Dining"
              value={saveModalName}
              isInvalid={!!saveModalError}
              onChange={(e) => {
                setSaveModalName(e.target.value);
                setSaveModalError(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && saveModalName.trim()) {
                  setSaveModalLoading(true);
                  const result = await onSaveFilter(saveModalName.trim());
                  setSaveModalLoading(false);
                  if (result?.duplicateName) {
                    setSaveModalError(`"${saveModalName.trim()}" already exists`);
                  } else if (!result?.success) {
                    setSaveModalError('Failed to save filter. Please try again.');
                  } else {
                    setShowSaveAsNewModal(false);
                    setSaveModalName('');
                    setSaveModalError(null);
                  }
                }
              }}
            />
            {saveModalError && (
              <Form.Control.Feedback type="invalid">{saveModalError}</Form.Control.Feedback>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="primary"
            className="w-100"
            disabled={!saveModalName.trim() || saveModalLoading}
            style={{ fontWeight: 500 }}
            onClick={async () => {
              if (!saveModalName.trim()) return;
              setSaveModalLoading(true);
              const result = await onSaveFilter(saveModalName.trim());
              setSaveModalLoading(false);
              if (result?.duplicateName) {
                setSaveModalError(`"${saveModalName.trim()}" already exists`);
              } else if (!result?.success) {
                setSaveModalError('Failed to save filter. Please try again.');
              } else {
                setShowSaveAsNewModal(false);
                setSaveModalName('');
                setSaveModalError(null);
              }
            }}
          >
            {saveModalLoading ? 'Saving…' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update Existing Modal */}
      <Modal
        show={showUpdateModal}
        onHide={() => {
          setShowUpdateModal(false);
          setSaveModalName('');
          setSaveModalError(null);
        }}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600 }}>
            Update {activeFilterName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: '14px', fontWeight: 500 }}>Name</Form.Label>
            <Form.Control
              autoFocus
              type="text"
              placeholder="Filter name…"
              value={saveModalName}
              isInvalid={!!saveModalError}
              onChange={(e) => {
                setSaveModalName(e.target.value);
                setSaveModalError(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && saveModalName.trim() && activeFilterId) {
                  setSaveModalLoading(true);
                  const result = onUpdateFilter
                    ? await onUpdateFilter(activeFilterId, saveModalName.trim())
                    : { success: false };
                  setSaveModalLoading(false);
                  if (result?.duplicateName) {
                    setSaveModalError(`"${saveModalName.trim()}" already exists`);
                  } else if (!result?.success) {
                    setSaveModalError('Failed to save filter. Please try again.');
                  } else {
                    setShowUpdateModal(false);
                    setSaveModalName('');
                    setSaveModalError(null);
                    setLoadedSnapshot({
                      selectedCategories,
                      selectedAccounts,
                      selectedLabelIds,
                      excludedLabelIds,
                      selectedCurrencies,
                      sortOption,
                      transferOption,
                      debtOption,
                    });
                  }
                }
              }}
            />
            {saveModalError && (
              <Form.Control.Feedback type="invalid">{saveModalError}</Form.Control.Feedback>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="primary"
            className="w-100"
            disabled={!saveModalName.trim() || saveModalLoading}
            style={{ fontWeight: 500 }}
            onClick={async () => {
              if (!saveModalName.trim() || !activeFilterId) return;
              setSaveModalLoading(true);
              const result = onUpdateFilter
                ? await onUpdateFilter(activeFilterId, saveModalName.trim())
                : { success: false };
              setSaveModalLoading(false);
              if (result?.duplicateName) {
                setSaveModalError(`"${saveModalName.trim()}" already exists`);
              } else if (!result?.success) {
                setSaveModalError('Failed to save filter. Please try again.');
              } else {
                setShowUpdateModal(false);
                setSaveModalName('');
                setSaveModalError(null);
                setLoadedSnapshot({
                  selectedCategories,
                  selectedAccounts,
                  selectedLabelIds,
                  excludedLabelIds,
                  selectedCurrencies,
                  sortOption,
                  transferOption,
                  debtOption,
                });
              }
            }}
          >
            {saveModalLoading ? 'Saving…' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ManageFiltersModal
        show={showManageModal}
        onHide={() => setShowManageModal(false)}
        savedFilters={savedFilters}
        renameState={renameState}
        setRenameState={setRenameState}
        onRenameFilter={onRenameFilter}
        onDeleteFilter={onDeleteFilter}
        onReorderFilter={onReorderFilter}
      />
    </>
  );
};

// --- Subcomponents for Manage Filters Modal ---

interface ManageFiltersModalProps {
  show: boolean;
  onHide: () => void;
  savedFilters: SavedFilter[];
  renameState: { id: string; value: string } | null;
  setRenameState: (state: { id: string; value: string } | null) => void;
  onRenameFilter: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onDeleteFilter: (id: string) => void;
  onReorderFilter: (newOrderIds: string[]) => void;
}

const ManageFiltersModal: React.FC<ManageFiltersModalProps> = ({
  show,
  onHide,
  savedFilters,
  renameState,
  setRenameState,
  onRenameFilter,
  onDeleteFilter,
  onReorderFilter,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = savedFilters.findIndex((f) => f.id === active.id);
      const newIndex = savedFilters.findIndex((f) => f.id === over.id);
      const newOrderIds = arrayMove(savedFilters, oldIndex, newIndex).map(f => f.id);
      onReorderFilter(newOrderIds);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage Saved Filters</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {savedFilters.length === 0 ? (
          <div className="p-4 text-center text-muted">No saved filters.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={savedFilters.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="list-group list-group-flush">
                {savedFilters.map((filter) => (
                  <SortableFilterItem
                    key={filter.id}
                    filter={filter}
                    renameState={renameState}
                    setRenameState={setRenameState}
                    onRenameFilter={onRenameFilter}
                    onDeleteFilter={onDeleteFilter}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

interface SortableFilterItemProps {
  filter: SavedFilter;
  renameState: { id: string; value: string } | null;
  setRenameState: (state: { id: string; value: string } | null) => void;
  onRenameFilter: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onDeleteFilter: (id: string) => void;
}

const SortableFilterItem: React.FC<SortableFilterItemProps> = ({
  filter,
  renameState,
  setRenameState,
  onRenameFilter,
  onDeleteFilter,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: filter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    boxShadow: isDragging ? '0 5px 15px rgba(0, 0, 0, 0.15)' : 'none',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`list-group-item d-flex align-items-center justify-content-between p-3 bg-white ${isDragging ? 'opacity-75' : ''}`}
    >
      <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
        <div
          {...attributes}
          {...listeners}
          className="me-3 text-muted d-flex align-items-center justify-content-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', width: '20px', height: '100%', outline: 'none' }}
          title="Drag to reorder"
        >
          <FaGripVertical />
        </div>
        {renameState?.id === filter.id ? (
          <Form.Control
            autoFocus
            size="sm"
            type="text"
            value={renameState.value}
            onChange={(e) => setRenameState({ id: filter.id, value: e.target.value })}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && renameState.value.trim()) {
                const result = await onRenameFilter(filter.id, renameState.value.trim());
                if (result.duplicateName) {
                  Swal.fire({ icon: 'error', title: 'Name already exists', text: `You already have a filter named "${renameState.value.trim()}".`, confirmButtonColor: '#0d6efd' });
                } else {
                  setRenameState(null);
                }
              }
              if (e.key === 'Escape') setRenameState(null);
            }}
            onBlur={(e) => {
              const listItem = e.currentTarget.closest('li');
              if (listItem && !listItem.contains(e.relatedTarget as Node)) {
                setRenameState(null);
              }
            }}
            className="me-3"
          />
        ) : (
          <span className="fw-medium text-truncate me-3" style={{ fontSize: '15px', userSelect: 'none' }}>{filter.name}</span>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {renameState?.id === filter.id ? (
          <Button
            variant="link"
            className="p-0 text-primary text-decoration-none"
            aria-label={`Save rename for ${filter.name}`}
            title="Save"
            onClick={async (e) => {
              e.preventDefault();
              if (renameState.value.trim()) {
                const result = await onRenameFilter(filter.id, renameState.value.trim());
                if (result.duplicateName) {
                  Swal.fire({ icon: 'error', title: 'Name already exists', text: `You already have a filter named "${renameState.value.trim()}".`, confirmButtonColor: '#0d6efd' });
                } else {
                  setRenameState(null);
                }
              } else {
                setRenameState(null);
              }
            }}
          >
            ✓ Save
          </Button>
        ) : (
          <Button
            variant="link"
            className="p-0 text-muted text-decoration-none"
            aria-label={`Rename ${filter.name}`}
            title="Rename"
            onClick={() => setRenameState({ id: filter.id, value: filter.name })}
          >
            ✏️ Edit
          </Button>
        )}

        <Button
          variant="link"
          className="p-0 text-danger text-decoration-none ms-2"
          aria-label={`Delete ${filter.name}`}
          onClick={async () => {
            const result = await Swal.fire({
              icon: 'warning',
              title: 'Delete Filter',
              html: `Delete <strong>${filter.name}</strong>?<br><small class="text-muted">This cannot be undone.</small>`,
              showCancelButton: true,
              confirmButtonText: 'Yes, delete it',
              cancelButtonText: 'Cancel',
              confirmButtonColor: '#dc3545',
              cancelButtonColor: '#6c757d',
              reverseButtons: true,
            });
            if (!result.isConfirmed) return;
            onDeleteFilter(filter.id);
          }}
        >
          🗑️ Delete
        </Button>
      </div>
    </li>
  );
};
