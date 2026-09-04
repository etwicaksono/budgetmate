'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Form, Offcanvas } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight, FaFileAlt, FaCheck, FaTags } from 'react-icons/fa';
import { AccountDropdown } from '@/components/FilterSidebar/AccountDropdown';
import { CategoryDropdown } from '@/components/FilterSidebar/CategoryDropdown';
import { SavedFiltersManager } from '@/components/FilterSidebar/SavedFiltersManager';
import { FilterVisibilityDropdown } from '@/components/FilterSidebar/FilterVisibilityDropdown';
import type { FilterVisibilityItem } from '@/components/FilterSidebar/FilterVisibilityDropdown';
import { LabelMultiSelect } from '@/components/transaction/LabelMultiSelect';
import { useFilterVisibility } from '@/hooks/useFilterVisibility';
import '@/components/FilterSidebar/FilterSidebar.css';
import './AnalyticsFilterSidebar.css';
import type { useFilterData } from '@/hooks/useFilterData';
import type { useSavedFilters } from '@/hooks/useSavedFilters';

// Only the filters this sidebar actually renders
type AnalyticsFilterKey = 'categories' | 'accounts' | 'labels' | 'drafts';

const VISIBILITY_ITEMS: ReadonlyArray<FilterVisibilityItem<AnalyticsFilterKey>> = [
  { id: 'categories', label: 'Categories' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'labels', label: 'Labels' },
  { id: 'drafts', label: 'Drafts' },
];

// Own storage key: useFilterData's 'filter-visibility' is shared with the
// transactions sidebar, which renders a different set of filters.
const VISIBILITY_STORAGE_KEY = 'analytics-filter-visibility';

const VISIBILITY_DEFAULTS: Record<AnalyticsFilterKey, boolean> = {
  categories: true,
  accounts: true,
  labels: true,
  drafts: true,
};

// Must match the desktop column's inline collapse transition below, so the
// reopen button only shows once the panel has fully slid shut.
const DESKTOP_COLLAPSE_MS = 500;

interface AnalyticsFilterSidebarProps {
  /** Return value of useFilterData() */
  filterData: ReturnType<typeof useFilterData>;
  /** Return value of useSavedFilters() */
  savedFiltersData: ReturnType<typeof useSavedFilters>;
  /** Mobile Offcanvas visibility */
  showMobile: boolean;
  /** Mobile Offcanvas close handler */
  onHideMobile: () => void;
  /** Whether the desktop filter column is visible (default: true) */
  showDesktop?: boolean;
  /** Toggles the desktop filter column from the always-visible left rail */
  onToggleDesktop?: () => void;
}

function AnalyticsFilterPanel({
  filterData,
  savedFiltersData,
  showDesktop = true,
  onToggleDesktop,
}: Omit<AnalyticsFilterSidebarProps, 'showMobile' | 'onHideMobile'>) {
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

  const { visibility, toggle: toggleVisibility } = useFilterVisibility(
    VISIBILITY_STORAGE_KEY,
    VISIBILITY_DEFAULTS
  );

  const handleReset = () => {
    setSelectedAccounts([]);
    setSelectedCategories([]);
    setSelectedLabelIds([]);
    setExcludedLabelIds([]);
    setDraftOption('exclude');
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

  return (
    <Card
      className="desktop-filter-sidebar shadow-sm border-0"
      style={{
        position: 'sticky',
        top: '85px',
        height: 'calc(100vh - 105px)',
        maxHeight: 'calc(100vh - 105px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Card.Header className="d-flex align-items-center justify-content-between bg-white border-bottom">
        <span className="h4 mb-0 fw-bold">Analytics</span>
        <div className="d-flex align-items-center gap-2">
          <FilterVisibilityDropdown
            items={VISIBILITY_ITEMS}
            visibility={visibility}
            onToggle={toggleVisibility}
          />
          {/* Desktop only: collapse toggle next to the visibility gear. While the
              filter column is open this is the only show/hide button visible; a
              floating reopen button renders only once the column is hidden. */}
          {showDesktop && onToggleDesktop && (
            <button
              type="button"
              onClick={onToggleDesktop}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Hide filters sidebar"
              aria-label="Hide filters sidebar"
            >
              <FaChevronLeft size={18} color="#6b7280" />
            </button>
          )}
        </div>
      </Card.Header>

      {/* Body */}
      <Card.Body className="pb-2" style={{ flex: '1 1 auto' }}>
        {/* Saved presets */}
        <SavedFiltersManager {...savedFilterProps} handleResetFilters={handleReset} />

        <Form>
          {/* Category filter */}
          {visibility.categories && (
          <Form.Group className="mb-4" controlId="analyticsCategoryFilter">
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
          )}

          {/* Account filter */}
          {visibility.accounts && (
          <Form.Group className="mb-4" controlId="analyticsAccountFilter">
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
          )}

          {/* Labels Filter — include and exclude share one visibility key */}
          {visibility.labels && (
          <Form.Group className="mb-3" controlId="analyticsLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={selectedLabelIds}
              onChange={handleSelectedLabelIdsChange}
              placeholder="All labels"
            />
          </Form.Group>
          )}

          {visibility.labels && (
          <Form.Group className="mb-4" controlId="analyticsExcludeLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Exclude labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={excludedLabelIds}
              onChange={handleExcludedLabelIdsChange}
              placeholder="No excluded labels"
            />
          </Form.Group>
          )}

          {/* Drafts Filter */}
          {visibility.drafts && (
          <Form.Group className="mb-4" controlId="analyticsDraftFilter">
            <Form.Label className="fw-semibold text-muted small">Drafts</Form.Label>
            <Dropdown>
              <Dropdown.Toggle
                variant="outline-secondary"
                className="w-100 d-flex align-items-center justify-content-between"
                style={{ textAlign: 'left' }}
              >
                <span className="d-flex align-items-center gap-2">
                  <FaFileAlt size={14} color="#adb5bd" />
                  <span className="d-inline-flex align-items-center gap-1">
                    {draftOption === 'include'
                      ? 'Include drafts'
                      : draftOption === 'only'
                        ? 'Only drafts'
                        : 'Exclude drafts'}
                  </span>
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 p-1">
                {[
                  { label: 'Include drafts', value: 'include' },
                  { label: 'Only drafts', value: 'only' },
                  { label: 'Exclude drafts', value: 'exclude' },
                ].map((option) => {
                  const isSelected = draftOption === option.value;
                  return (
                    <Dropdown.Item
                      key={option.value}
                      as="button"
                      type="button"
                      className={`d-flex align-items-center gap-2 w-100 bg-white ${isSelected ? 'selected' : ''}`}
                      style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                      onClick={() => setDraftOption(option.value as 'include' | 'only' | 'exclude')}
                    >
                      {isSelected && (
                        <span className="d-inline-flex justify-content-center" style={{ width: '1.25rem' }}>
                          <FaCheck className="text-success" />
                        </span>
                      )}
                      {!isSelected && <span style={{ width: '1.25rem' }}></span>}
                      <span className="flex-grow-1 text-start">{option.label}</span>
                    </Dropdown.Item>
                  );
                })}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
          )}
        </Form>
      </Card.Body>

      {/* Footer: Reset */}
      <Card.Footer className="bg-white border-top p-3 mt-auto">
        <button
          type="button"
          className="btn btn-outline-secondary w-100 fw-medium"
          onClick={handleReset}
        >
          Reset all filters
        </button>
      </Card.Footer>
    </Card>
  );
}

export function AnalyticsFilterSidebar({
  filterData,
  savedFiltersData,
  showMobile,
  onHideMobile,
  showDesktop = true,
  onToggleDesktop,
}: AnalyticsFilterSidebarProps) {
  // The reopen control appears only after the column has fully collapsed
  // (its 500 ms width/visibility transition), never while the panel is still
  // sliding shut.
  const [expandVisible, setExpandVisible] = useState(false);
  useEffect(() => {
    if (showDesktop) {
      setExpandVisible(false);
      return;
    }
    const timer = setTimeout(() => setExpandVisible(true), DESKTOP_COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [showDesktop]);

  return (
    <>
      {/* Desktop reopen control: floated at the collapsed column's place. It is
          absolutely positioned (against the page's relative flex wrapper) so it
          never reserves a full-height 44px strip — the reports keep the whole
          width the column vacated, and only this small button stays on top. */}
      {!showDesktop && expandVisible && onToggleDesktop && (
        <button
          type="button"
          className="btn btn-outline-secondary d-none d-lg-flex align-items-center justify-content-center"
          onClick={onToggleDesktop}
          style={{
            position: 'absolute',
            top: '16px',
            left: '6px',
            zIndex: 5,
            width: '32px',
            height: '32px',
            padding: 0,
            borderRadius: '8px',
            backgroundColor: '#fff',
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.1)',
          }}
          title="Show filters sidebar"
          aria-label="Show filters sidebar"
        >
          <FaChevronRight size={14} />
        </button>
      )}

      {/* Desktop: sticky filter column. Always mounted so its width can be
          transitioned — collapsing to 0 width (clipped) slides the panel out
          and lets the reports expand smoothly; visibility hides it only after
          the close transition finishes. */}
      <div
        className="analytics-filter-slide-panel d-none d-lg-block"
        style={{
          width: showDesktop ? 'min(340px, 25vw)' : '0px',
          flexShrink: 0,
          marginRight: showDesktop ? '12px' : '0px',
          visibility: showDesktop ? 'visible' : 'hidden',
          transition: showDesktop
            ? 'width 500ms ease, margin-right 500ms ease'
            : 'width 500ms ease, margin-right 500ms ease, visibility 0s linear 500ms',
        }}
      >
        {/* Inner wrapper keeps a constant width so panel contents never reflow
            while the outer box animates its width. */}
        <div style={{ width: 'min(340px, 25vw)', flexShrink: 0 }}>
          <AnalyticsFilterPanel
            filterData={filterData}
            savedFiltersData={savedFiltersData}
            showDesktop={showDesktop}
            {...(onToggleDesktop ? { onToggleDesktop } : {})}
          />
        </div>
      </div>

      {/* Mobile: slide-in Offcanvas */}
      <Offcanvas
        show={showMobile}
        onHide={onHideMobile}
        placement="end"
        className="d-lg-none"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0" style={{ overflowY: 'auto', flex: 1 }}>
          <AnalyticsFilterPanel
            filterData={filterData}
            savedFiltersData={savedFiltersData}
          />
        </Offcanvas.Body>
        {/* Sticky footer — mobile only */}
        <div
          className="border-top p-3"
          style={{ flexShrink: 0, backgroundColor: 'var(--bs-body-bg, #fff)' }}
        >
          <Button
            variant="primary"
            className="w-100"
            onClick={onHideMobile}
          >
            Show Result
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}
