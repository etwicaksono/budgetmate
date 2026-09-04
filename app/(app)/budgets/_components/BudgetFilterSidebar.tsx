'use client';


import { Col, Offcanvas, Form, Card, Dropdown } from 'react-bootstrap';
import { FaFileAlt, FaCheck } from 'react-icons/fa';
import type { Account } from '@/services/accountService';
import type { Label } from '@/services/labelService';
import { LabelMultiSelect } from '@/components/transaction/LabelMultiSelect';
import type { useSavedFilters } from '@/hooks/useSavedFilters';
import { AccountDropdown } from '@/components/FilterSidebar/AccountDropdown';
import { SavedFiltersManager } from '@/components/FilterSidebar/SavedFiltersManager';
import { FilterVisibilityDropdown } from '@/components/FilterSidebar/FilterVisibilityDropdown';
import type { FilterVisibilityItem } from '@/components/FilterSidebar/FilterVisibilityDropdown';
import { useFilterVisibility } from '@/hooks/useFilterVisibility';
import type { DraftOption } from '@/hooks/useFilterData';
import '@/components/FilterSidebar/FilterSidebar.css';

// Only the filters this sidebar renders. "Display" (show projections) is a
// display toggle rather than a filter, so it stays always visible.
type BudgetFilterKey = 'accounts' | 'labels' | 'drafts';

const VISIBILITY_ITEMS: ReadonlyArray<FilterVisibilityItem<BudgetFilterKey>> = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'labels', label: 'Labels' },
  { id: 'drafts', label: 'Drafts' },
];

const VISIBILITY_STORAGE_KEY = 'budget-filter-visibility';

const VISIBILITY_DEFAULTS: Record<BudgetFilterKey, boolean> = {
  accounts: true,
  labels: true,
  drafts: true,
};

// ─── Types ───────────────────────────────────────────────────────────────────

type SavedFiltersData = ReturnType<typeof useSavedFilters>;

export interface BudgetFilterSidebarProps {
  // Account filter
  accounts: Account[];
  selectedAccounts: string[];
  onSelectedAccountsChange: (names: string[]) => void;
  // Label filter (include/exclude)
  labels: Label[];
  selectedLabelIds: string[];
  onSelectedLabelIdsChange: (ids: string[]) => void;
  excludedLabelIds: string[];
  onExcludedLabelIdsChange: (ids: string[]) => void;
  // Projections
  showProjections: boolean;
  onShowProjectionsChange: (v: boolean) => void;
  // Draft filter
  draftOption: DraftOption;
  onDraftOptionChange: (v: DraftOption) => void;
  // Saved filters
  savedFiltersData: SavedFiltersData;
  // Mobile Offcanvas
  showMobile: boolean;
  onHideMobile: () => void;
}

// ─── Account color/icon maps derived from Account[] ─────────────────────────

function toColorMap(accounts: Account[]): Record<string, string> {
  const m: Record<string, string> = {};
  accounts.forEach((a) => { m[a.name] = a.color || '#6c757d'; });
  return m;
}

function toIconMap(accounts: Account[]): Record<string, string | undefined> {
  const m: Record<string, string | undefined> = {};
  accounts.forEach((a) => { m[a.name] = a.icon; });
  return m;
}

// ─── Inner panel (shared between desktop col and mobile offcanvas) ────────────

function BudgetFilterPanel({
  accounts,
  selectedAccounts,
  onSelectedAccountsChange,
  labels,
  selectedLabelIds,
  onSelectedLabelIdsChange,
  excludedLabelIds,
  onExcludedLabelIdsChange,
  showProjections,
  onShowProjectionsChange,
  draftOption,
  onDraftOptionChange,
  savedFiltersData,
}: Omit<BudgetFilterSidebarProps, 'showMobile' | 'onHideMobile'>) {
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

  const accountColors = toColorMap(accounts);
  const accountIcons = toIconMap(accounts);
  const selectableAccounts = accounts.map((a: Account) => a.name);

  const handleReset = () => {
    onSelectedAccountsChange([]);
    onSelectedLabelIdsChange([]);
    onExcludedLabelIdsChange([]);
    onDraftOptionChange('exclude');
    clearActiveFilter();
  };

  const { visibility, toggle: toggleVisibility } = useFilterVisibility(
    VISIBILITY_STORAGE_KEY,
    VISIBILITY_DEFAULTS
  );

  // Build a minimal FilterSidebarProps-compatible object for SavedFiltersManager
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
      {/* ── Header ── */}
      <Card.Header className="d-flex align-items-center justify-content-between bg-white border-bottom">
        <span className="h4 mb-0 fw-bold">Budgets</span>
        <FilterVisibilityDropdown
          items={VISIBILITY_ITEMS}
          visibility={visibility}
          onToggle={toggleVisibility}
        />
      </Card.Header>

      {/* ── Body ── */}
      <Card.Body className="pb-2" style={{ flex: '1 1 auto' }}>
        {/* Saved presets */}
        <SavedFiltersManager {...savedFilterProps} handleResetFilters={handleReset} />

        <Form>

          {/* Account filter */}
          {visibility.accounts && (
          <Form.Group className="mb-4" controlId="budgetAccountFilter">
            <Form.Label className="fw-semibold text-muted small">Accounts</Form.Label>
            <AccountDropdown
              selectedAccounts={selectedAccounts}
              setSelectedAccounts={(names) => {
                onSelectedAccountsChange(names as string[]);
              }}
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
          <Form.Group className="mb-3" controlId="budgetLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={selectedLabelIds}
              onChange={onSelectedLabelIdsChange}
              placeholder="All labels"
            />
          </Form.Group>
          )}

          {visibility.labels && (
          <Form.Group className="mb-4" controlId="budgetExcludeLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Exclude labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={excludedLabelIds}
              onChange={onExcludedLabelIdsChange}
              placeholder="No excluded labels"
            />
          </Form.Group>
          )}



          {/* Show Projections toggle */}
          <Form.Group className="mb-4" controlId="budgetProjections">
            <Form.Label className="fw-semibold text-muted small">Display</Form.Label>
            <div
              className="d-flex align-items-center justify-content-between rounded px-3 py-2"
              style={{ border: '1px solid #dee2e6', cursor: 'pointer' }}
              onClick={() => onShowProjectionsChange(!showProjections)}
            >
              <span style={{ fontSize: '14px' }}>Show Projections</span>
              <Form.Check
                type="switch"
                id="sidebar-projections-switch"
                checked={showProjections}
                onChange={(e) => { e.stopPropagation(); onShowProjectionsChange(e.target.checked); }}
                className="mb-0"
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </Form.Group>

          {/* Drafts Filter */}
          {visibility.drafts && (
          <Form.Group className="mb-4" controlId="budgetDraftFilter">
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
                      className={`d-flex align-items-center gap-2 w-100 bg-white ${
                        isSelected ? 'selected' : ''
                      }`}
                      style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                      onClick={() => onDraftOptionChange(option.value as DraftOption)}
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

      {/* ── Footer: Reset ── */}
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

// ─── Exported sidebar (desktop col + mobile offcanvas) ────────────────────────

export function BudgetFilterSidebar({
  showMobile,
  onHideMobile,
  ...rest
}: BudgetFilterSidebarProps) {
  return (
    <>
      {/* Desktop: sticky left column */}
      <Col lg={3} className="d-none d-lg-block">
        <BudgetFilterPanel {...rest} />
      </Col>

      {/* Mobile: slide-in Offcanvas */}
      <Offcanvas
        show={showMobile}
        onHide={onHideMobile}
        placement="end"
        className="d-lg-none"
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <BudgetFilterPanel {...rest} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
