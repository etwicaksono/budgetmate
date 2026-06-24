'use client';

import { Button, Card, Col, Dropdown, Form, Offcanvas } from 'react-bootstrap';
import { RiListSettingsLine } from 'react-icons/ri';
import { FaFileAlt, FaCheck } from 'react-icons/fa';
import { AccountDropdown } from '@/components/FilterSidebar/AccountDropdown';
import { SavedFiltersManager } from '@/components/FilterSidebar/SavedFiltersManager';
import '@/components/FilterSidebar/FilterSidebar.css';
import type { useFilterData } from '@/hooks/useFilterData';
import type { useSavedFilters } from '@/hooks/useSavedFilters';

interface AnalyticsFilterSidebarProps {
  /** Return value of useFilterData() */
  filterData: ReturnType<typeof useFilterData>;
  /** Return value of useSavedFilters() */
  savedFiltersData: ReturnType<typeof useSavedFilters>;
  /** Mobile Offcanvas visibility */
  showMobile: boolean;
  /** Mobile Offcanvas close handler */
  onHideMobile: () => void;
}

function AnalyticsFilterPanel({
  filterData,
  savedFiltersData,
}: Omit<AnalyticsFilterSidebarProps, 'showMobile' | 'onHideMobile'>) {
  const {
    selectedAccounts,
    setSelectedAccounts,
    selectableAccounts,
    accountColors,
    accountIcons,
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
    setSelectedAccounts([]);
    setDraftOption('exclude');
    clearActiveFilter();
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
        <button
          type="button"
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          aria-label="Reset filters"
          title="Reset filters"
          onClick={handleReset}
        >
          {/* TODO: Replace RiListSettingsLine with a proper reset/refresh icon (e.g., FaUndo or FaRedo). */}
          <RiListSettingsLine size={20} color="#6b7280" />
        </button>
      </Card.Header>

      {/* Body */}
      <Card.Body className="pb-2" style={{ flex: '1 1 auto' }}>
        {/* Saved presets */}
        <SavedFiltersManager {...savedFilterProps} handleResetFilters={handleReset} />

        <Form>
          {/* Account filter */}
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

          {/* Drafts Filter */}
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
}: AnalyticsFilterSidebarProps) {
  return (
    <>
      {/* Desktop: sticky left column */}
      <Col lg={3} className="mb-3 d-none d-lg-block">
        <AnalyticsFilterPanel
          filterData={filterData}
          savedFiltersData={savedFiltersData}
        />
      </Col>

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
