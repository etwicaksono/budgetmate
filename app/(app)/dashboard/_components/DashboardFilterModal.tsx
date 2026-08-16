'use client';

import React from 'react';
import { Button, Dropdown, Form, Modal } from 'react-bootstrap';
import { FaCheck, FaFileAlt, FaTags } from 'react-icons/fa';
import { AccountDropdown } from '@/components/FilterSidebar/AccountDropdown';
import { CategoryDropdown } from '@/components/FilterSidebar/CategoryDropdown';
import { SavedFiltersManager } from '@/components/FilterSidebar/SavedFiltersManager';
import { LabelMultiSelect } from '@/components/transaction/LabelMultiSelect';
import '@/components/FilterSidebar/FilterSidebar.css';
import type { useFilterData } from '@/hooks/useFilterData';
import type { useSavedFilters } from '@/hooks/useSavedFilters';

const DRAFT_OPTIONS = [
  { label: 'Include drafts', value: 'include' },
  { label: 'Only drafts', value: 'only' },
  { label: 'Exclude drafts', value: 'exclude' },
] as const;

interface DashboardFilterModalProps {
  show: boolean;
  onHide: () => void;
  /** Return value of useFilterData() */
  filterData: ReturnType<typeof useFilterData>;
  /** Return value of useSavedFilters() */
  savedFiltersData: ReturnType<typeof useSavedFilters>;
  /** Clears every dashboard filter */
  onResetFilters: () => void;
}

export function DashboardFilterModal({
  show,
  onHide,
  filterData,
  savedFiltersData,
  onResetFilters,
}: DashboardFilterModalProps): React.ReactElement {
  const {
    selectedAccounts,
    setSelectedAccounts,
    selectableAccounts,
    accountColors,
    accountIcons,
    selectedCategories,
    setSelectedCategories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    labels,
    selectedLabelIds,
    setSelectedLabelIds,
    excludedLabelIds,
    setExcludedLabelIds,
    draftOption,
    setDraftOption,
  } = filterData;

  const {
    savedFilters,
    activeFilterId,
    loading: savedFiltersLoading,
    saveCurrentFilter,
    updateCurrentFilter,
    loadFilter,
    deleteFilter,
    renameFilter,
    clearActiveFilter,
    reorderFilter,
  } = savedFiltersData;

  const handleReset = () => {
    onResetFilters();
    clearActiveFilter();
  };

  // Include and exclude must stay disjoint — a label present in both can never match.
  const handleSelectedLabelIdsChange = (labelIds: string[]) => {
    setSelectedLabelIds(labelIds);
    setExcludedLabelIds((prev) => prev.filter((id) => !labelIds.includes(id)));
  };

  const handleExcludedLabelIdsChange = (labelIds: string[]) => {
    setExcludedLabelIds(labelIds);
    setSelectedLabelIds((prev) => prev.filter((id) => !labelIds.includes(id)));
  };

  const savedFilterProps = {
    savedFilters,
    activeFilterId,
    savedFiltersLoading,
    onSaveFilter: saveCurrentFilter,
    onUpdateFilter: updateCurrentFilter,
    onLoadFilter: loadFilter,
    onDeleteFilter: deleteFilter,
    onRenameFilter: renameFilter,
    onClearActiveFilter: clearActiveFilter,
    onReorderFilter: reorderFilter,
    selectedAccounts,
    selectedCategories,
    selectedLabelIds,
    excludedLabelIds,
  };

  const draftLabel =
    DRAFT_OPTIONS.find((option) => option.value === draftOption)?.label ?? 'Exclude drafts';

  return (
    <Modal show={show} onHide={onHide} centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0 fw-bold">Filter widgets</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Saved presets */}
        <SavedFiltersManager {...savedFilterProps} handleResetFilters={handleReset} />

        <Form>
          {/* Category filter */}
          <Form.Group className="mb-4" controlId="dashboardCategoryFilter">
            <Form.Label className="fw-semibold text-muted small">Categories</Form.Label>
            <CategoryDropdown
              selectedCategories={selectedCategories}
              setSelectedCategories={setSelectedCategories}
              categoryTree={categoryTree}
              parentCategoryColors={parentCategoryColors}
              categoryIcons={categoryIcons}
              allCategories={allCategories}
              leadingIcon={FaTags}
              entityLabelSingular="category"
              entityLabelPlural="categories"
              searchPlaceholder="Search categories"
              isSingleSelect={false}
            />
          </Form.Group>

          {/* Account filter */}
          <Form.Group className="mb-4" controlId="dashboardAccountFilter">
            <Form.Label className="fw-semibold text-muted small">Accounts</Form.Label>
            <AccountDropdown
              selectedAccounts={selectedAccounts}
              setSelectedAccounts={setSelectedAccounts}
              accountColors={accountColors}
              accountIcons={accountIcons}
              allAccounts={selectableAccounts}
              entityLabelSingular="account"
              entityLabelPlural="accounts"
              searchPlaceholder="Search account"
              isSingleSelect={false}
            />
          </Form.Group>

          {/* Labels filter */}
          <Form.Group className="mb-3" controlId="dashboardLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={selectedLabelIds}
              onChange={handleSelectedLabelIdsChange}
              placeholder="All labels"
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="dashboardExcludeLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Exclude labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={excludedLabelIds}
              onChange={handleExcludedLabelIdsChange}
              placeholder="No excluded labels"
            />
          </Form.Group>

          {/* Drafts filter */}
          <Form.Group className="mb-2" controlId="dashboardDraftFilter">
            <Form.Label className="fw-semibold text-muted small">Drafts</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-secondary"
                className="w-100 d-flex align-items-center justify-content-between"
                style={{ textAlign: 'left' }}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaFileAlt size={14} color="#adb5bd" />
                  <span className="d-inline-flex align-items-center gap-1">{draftLabel}</span>
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 p-1">
                {DRAFT_OPTIONS.map((option) => {
                  const isSelected = draftOption === option.value;
                  return (
                    <Dropdown.Item
                      key={option.value}
                      as="button"
                      type="button"
                      className={`d-flex align-items-center gap-2 w-100 bg-white ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                      onClick={() => setDraftOption(option.value)}
                    >
                      {isSelected ? (
                        <span className="d-inline-flex justify-content-center" style={{ width: '1.25rem' }}>
                          <FaCheck className="text-success" />
                        </span>
                      ) : (
                        <span style={{ width: '1.25rem' }}></span>
                      )}
                      <span className="flex-grow-1 text-start">{option.label}</span>
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Menu>
            </Dropdown>
            <Form.Text className="text-muted">
              Net Worth and Budget Status only follow the account and draft filters.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <button type="button" className="btn btn-outline-secondary fw-medium" onClick={handleReset}>
          Reset all filters
        </button>
        <Button variant="primary" onClick={onHide}>
          Done
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DashboardFilterModal;
