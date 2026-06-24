'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Dropdown, Offcanvas, Nav, Badge } from 'react-bootstrap';
import {
  FaArrowCircleUp,
  FaArrowCircleDown,
  FaSortAmountUp,
  FaSortAmountDown,
  FaCheck,
  FaFilter
} from 'react-icons/fa';
import { NumericFormat } from 'react-number-format';

import './Debts.css';
import { debtService } from '@/services/debtService';
import { DEBT_STATUSES } from '@/utils/constants';
import { DebtTabPane } from '@/components/debt';
import { useDebt } from '@/context/DebtContext';
import { ClearButton } from '@/components/common/ClearButton';

interface DebtSortDropdownProps {
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

const SORT_OPTIONS = [
  {
    value: 'date_desc',
    sortBy: 'date',
    sortOrder: 'desc',
    icon: FaSortAmountDown,
    title: 'Date (Newest First)',
  },
  {
    value: 'date_asc',
    sortBy: 'date',
    sortOrder: 'asc',
    icon: FaSortAmountUp,
    title: 'Date (Oldest First)',
  },
  {
    value: 'counterparty_asc',
    sortBy: 'counterparty',
    sortOrder: 'asc',
    icon: FaSortAmountUp,
    title: 'Counterparty (A - Z)',
  },
  {
    value: 'counterparty_desc',
    sortBy: 'counterparty',
    sortOrder: 'desc',
    icon: FaSortAmountDown,
    title: 'Counterparty (Z - A)',
  },
  {
    value: 'amount_desc',
    sortBy: 'amount',
    sortOrder: 'desc',
    icon: FaSortAmountDown,
    title: 'Amount (Highest First)',
  },
  {
    value: 'amount_asc',
    sortBy: 'amount',
    sortOrder: 'asc',
    icon: FaSortAmountUp,
    title: 'Amount (Lowest First)',
  },
];

function DebtSortDropdown({ sortBy, sortOrder, onSortChange }: DebtSortDropdownProps) {
  const [show, setShow] = useState(false);
  const currentValue = `${sortBy}_${sortOrder}`;
  const selectedOption = SORT_OPTIONS.find((opt) => opt.value === currentValue) || SORT_OPTIONS[0];

  return (
    <Dropdown show={show} onToggle={(nextShow) => setShow(nextShow)} className="w-100">
      <Dropdown.Toggle
        id="debtSortDropdown"
        variant="outline-secondary"
        className="sort-dropdown-toggle d-flex align-items-center justify-content-between w-100 gap-2"
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ced4da',
          color: '#495057',
          textAlign: 'left'
        }}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="text-truncate d-inline-flex align-items-center gap-1">
            {selectedOption && <selectedOption.icon />}
            <span>{selectedOption ? selectedOption.title : 'Select sort order'}</span>
          </span>
        </span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="sort-dropdown-menu w-100 p-1">
        {SORT_OPTIONS.map((option) => {
          const isSelected = option.value === currentValue;
          return (
            <Dropdown.Item
              key={option.value}
              as="button"
              type="button"
              onClick={() => {
                onSortChange(option.sortBy, option.sortOrder);
                setShow(false);
              }}
              className={`d-flex align-items-center gap-2 w-100 bg-white ${isSelected ? 'selected rounded bg-light' : 'rounded'}`}
              style={{ padding: '8px 12px' }}
            >
              {isSelected ? (
                <span className="d-inline-flex justify-content-center" style={{ width: '1.25rem' }}>
                  <FaCheck className="text-success" />
                </span>
              ) : (
                <span style={{ width: '1.25rem' }} />
              )}
              <span className="flex-grow-1 text-start d-inline-flex align-items-center gap-1 text-dark">
                <option.icon />
                <span>{option.title}</span>
              </span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default function DebtsPage() {
  // Shared filters
  const [statusFilter, setStatusFilter] = useState<string>(DEBT_STATUSES.ACTIVE);
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  const counterpartyInputRef = useRef<HTMLInputElement>(null);

  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mobile filter visibility
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Active tab (global context via DebtContext)
  const { activeDebtTab: activeTab, setActiveDebtTab: setActiveTab } = useDebt();

  // Summary totals
  const [totalLent, setTotalLent] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);

  const [tabStates, setTabStates] = useState({
    lend: { loading: true, count: 0 },
    borrow: { loading: true, count: 0 }
  });

  const fetchSummary = useCallback(async () => {
    try {
      const allActive = await debtService.fetchDebts({ limit: -1, status: 'active' });
      let lentOut = 0;
      let borrowIn = 0;
      allActive.data.forEach((d) => {
        if (d.type === 'lend') lentOut += d.remaining_amount || 0;
        if (d.type === 'borrow') borrowIn += d.remaining_amount || 0;
      });
      setTotalLent(lentOut);
      setTotalBorrowed(borrowIn);
    } catch (error) {
      console.error('Failed to fetch debt summary:', error);
    }
  }, []);

  useEffect(() => {
    // Load accounts once
    fetchSummary();
  }, [fetchSummary]);

  const hasActiveFilter = statusFilter !== DEBT_STATUSES.ACTIVE || counterpartyFilter !== '';

  // Render Filter Form
  const handleResetFilters = () => {
    setCounterpartyFilter('');
    setStatusFilter(DEBT_STATUSES.ACTIVE);
    setSortBy('date');
    setSortOrder('desc');
  };

  const renderFilterForm = () => (
    <div className="d-flex flex-column h-100">
      <div className="flex-grow-1 p-4" style={{ paddingBottom: '32px' }}>
        <Form>
          {/* Search Filter */}
          <Form.Group className="mb-4" controlId="searchTerm">
            <Form.Label className="fw-semibold text-muted small">Search Counterparty</Form.Label>
            <div className="position-relative">
              <Form.Control
                ref={counterpartyInputRef}
                type="text"
                placeholder="Find counterparty..."
                value={counterpartyFilter}
                onChange={(e) => setCounterpartyFilter(e.target.value)}
                className="shadow-none border-secondary-subtle pe-4"
              />
              {counterpartyFilter && (
                <ClearButton
                  className="position-absolute end-0 top-50 translate-middle-y p-0 me-2"
                  style={{ zIndex: 5 }}
                  onClick={() => {
                    setCounterpartyFilter('');
                    counterpartyInputRef.current?.focus();
                  }}
                />
              )}
            </div>
          </Form.Group>

          {/* Sort Filter - Styled to match FilterSidebar SortDropdown */}
          <Form.Group className="mb-4" controlId="sortOption">
            <Form.Label className="fw-semibold text-muted small">Sort by</Form.Label>
            <DebtSortDropdown
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(newBy: string, newOrder: string) => {
                setSortBy(newBy);
                setSortOrder(newOrder);
              }}
            />
          </Form.Group>

          {/* Status Filter */}
          <Form.Group className="mb-4" controlId="statusFilter">
            <Form.Label className="fw-semibold text-muted small">Status</Form.Label>
            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="shadow-none border-secondary-subtle"
            >
              <option value="all">All Statuses</option>
              <option value={DEBT_STATUSES.ACTIVE}>Active</option>
              <option value={DEBT_STATUSES.SETTLED}>Settled</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </div>
      <div className="p-3 mt-auto bg-white border-top">
        <Button
          variant="outline-secondary"
          onClick={handleResetFilters}
          className="w-100 fw-medium"
        >
          Reset all filters
        </Button>
      </div>
    </div>
  );

  return (
    <Container fluid>
      <Row>
        {/* Shared filter sidebar - Desktop */}
        <Col lg={3} className="d-none d-lg-block">
          <Card
            className="desktop-filter-sidebar shadow-sm border-0"
            style={{
              position: 'sticky',
              top: '85px',
              height: 'calc(100vh - 105px)',
              maxHeight: 'calc(100vh - 105px)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Card.Header className="d-flex align-items-center justify-content-between bg-white border-bottom py-3 px-4">
              <span className="h5 mb-0 fw-bold">Debts</span>
            </Card.Header>
            <Card.Body className="p-0 overflow-y-auto filter-sidebar-scroll" style={{ flex: '1 1 auto' }}>
              {renderFilterForm()}
            </Card.Body>
          </Card>
        </Col>

        {/* Tab area */}
        <Col xs={12} lg={9} className="p-0">

          <div className="d-flex justify-content-between align-items-center mb-2 px-3 d-lg-none">
            <h2 className="page-mobile-title">Debts</h2>
            <Button
              variant={hasActiveFilter ? 'primary' : 'outline-secondary'}
              className="d-flex align-items-center justify-content-center p-2 position-relative"
              onClick={() => setShowMobileFilter(!showMobileFilter)}
              style={{ width: '36px', height: '36px' }}
              aria-label="Toggle Filters"
            >
              <FaFilter size={14} />
              {hasActiveFilter && (
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                  <span className="visually-hidden">Active filters</span>
                </span>
              )}
            </Button>
          </div>

          {/* Sticky Wrapper for Header and Tab Navigation */}
          <div className="bg-white debt-tabs-wrapper border-bottom">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white debt-list-header">
              <div className="fw-semibold small">
                {tabStates[activeTab].loading && tabStates[activeTab].count === 0
                  ? 'Loading…'
                  : `${tabStates[activeTab].count} records`}
              </div>
              <div className={`fw-bold small ${activeTab === 'lend' ? 'text-danger' : 'text-success'}`}>
                Total: <NumericFormat value={activeTab === 'lend' ? totalLent : totalBorrowed} displayType="text" thousandSeparator prefix="Rp " decimalScale={0} />
              </div>
            </div>

            {/* Tab Navigation & Mobile Filter Toggle */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-end gap-3 pt-2 px-2">
              <Nav variant="tabs" className="debt-type-tabs border-bottom-0 mb-0 flex-grow-1">
                <Nav.Item className="ms-sm-2">
                  <Nav.Link
                    active={activeTab === 'lend'}
                    onClick={() => setActiveTab('lend')}
                    className="d-flex align-items-center gap-2 px-3 pe-sm-4"
                  >
                    <FaArrowCircleUp className="text-danger" />
                    <span className="text-danger" >Credit</span>
                    {hasActiveFilter && activeTab !== 'lend' && (
                      <Badge bg="danger" pill style={{ fontSize: '10px' }}>filtered</Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link
                    active={activeTab === 'borrow'}
                    onClick={() => setActiveTab('borrow')}
                    className="d-flex align-items-center gap-2 px-3"
                  >
                    <FaArrowCircleDown className="text-success" />
                    <span className="text-success" >Debit</span>
                    {hasActiveFilter && activeTab !== 'borrow' && (
                      <Badge bg="success" pill style={{ fontSize: '10px' }}>filtered</Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </div>
          </div>



          {/* Both panes always mounted; d-none hides the inactive one */}
          <div className={activeTab === 'lend' ? 'debt-tab-content' : 'debt-tab-content d-none'}>
            <DebtTabPane
              debtType="lend"
              statusFilter={statusFilter}
              counterpartyFilter={counterpartyFilter}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onMutated={fetchSummary}
              totalAmount={totalLent}
              onStateChange={(loading, count) => setTabStates(prev => ({ ...prev, lend: { loading, count } }))}
            />
          </div>
          <div className={activeTab === 'borrow' ? 'debt-tab-content' : 'debt-tab-content d-none'}>
            <DebtTabPane
              debtType="borrow"
              statusFilter={statusFilter}
              counterpartyFilter={counterpartyFilter}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onMutated={fetchSummary}
              totalAmount={totalBorrowed}
              onStateChange={(loading, count) => setTabStates(prev => ({ ...prev, borrow: { loading, count } }))}
            />
          </div>
        </Col>
      </Row>

      {/* Mobile Filter Offcanvas */}
      <Offcanvas
        show={showMobileFilter}
        onHide={() => setShowMobileFilter(false)}
        placement="end"
        className="d-lg-none border-start-0 shadow"
        style={{ width: '85vw', maxWidth: '360px' }}
      >
        <Offcanvas.Header closeButton className="border-bottom py-3 px-4">
          <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 d-flex flex-column">
          {renderFilterForm()}
        </Offcanvas.Body>
      </Offcanvas>
    </Container>
  );
}
