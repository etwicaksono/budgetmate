'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Form, ListGroup } from 'react-bootstrap';
import { FaSearch, FaGift, FaChevronRight, FaEdit } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { categoryService, Category } from '@/services/categoryService';
import { budgetService, CategoryBudget } from '@/services/budgetService';
import { BudgetConfigModal } from '@/components/budgets/BudgetConfigModal';
import { BudgetProgressBar } from '@/components/budgets/BudgetProgressBar';
import PeriodNavigation, { PeriodNavigationProvider, usePeriodNavigation } from '@/components/period/PeriodNavigation';
import MonthYearSelector from '@/components/period/MonthYearSelector';
import { useAuth } from '@/context/AuthContext';
import { ClearButton } from '@/components/common/ClearButton';
import { FaSortAlphaDown, FaSortAlphaUpAlt, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import { SortDropdown, SortOption } from '@/components/common/SortDropdown';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

const BUDGET_SORT_OPTIONS: SortOption<string>[] = [
  { value: 'name_asc', icon: FaSortAlphaDown, title: 'Alphabetical ASC', ariaLabel: 'Alphabetical ascending' },
  { value: 'name_desc', icon: FaSortAlphaUpAlt, title: 'Alphabetical DESC', ariaLabel: 'Alphabetical descending' },
  { value: 'monthly_asc', icon: FaSortAmountUp, title: 'Monthly Pace ASC', ariaLabel: 'Monthly pace ascending' },
  { value: 'monthly_desc', icon: FaSortAmountDown, title: 'Monthly Pace DESC', ariaLabel: 'Monthly pace descending' },
  { value: 'annual_asc', icon: FaSortAmountUp, title: 'Annual Pace ASC', ariaLabel: 'Annual pace ascending' },
  { value: 'annual_desc', icon: FaSortAmountDown, title: 'Annual Pace DESC', ariaLabel: 'Annual pace descending' },
];
function BudgetsPageContent(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const { user } = useAuth();
  const { formatCurrency } = useFormattedCurrency();
  const { state: { activePeriod, periodLabel } } = usePeriodNavigation();
  const selectedMonth = activePeriod.month !== undefined ? activePeriod.month + 1 : new Date().getMonth() + 1;
  const selectedYear = activePeriod.year !== undefined ? activePeriod.year : new Date().getFullYear();

  const [sortBy, setSortBy] = useState<string>('name_asc');

  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, budRes] = await Promise.all([
        categoryService.fetchCategories(),
        budgetService.fetchBudgets({ month: selectedMonth, year: selectedYear })
      ]);
      setCategories(catRes.data.filter(c => c.type === 'expense' || c.type === 'both'));
      setBudgets(budRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Lightweight refresh: only reload budgets (categories don't change from the budget modal)
  const refreshBudgets = useCallback(async () => {
    try {
      const budRes = await budgetService.fetchBudgets({ month: selectedMonth, year: selectedYear });
      setBudgets(budRes);
    } catch (error) {
      console.error(error);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const combinedData = useMemo(() => {
    // Combine categories and budgets
    return categories.map(cat => {
      const budget = budgets.find(b => b.category_id === cat.id);
      return {
        category: cat,
        budget: budget || null,
        basicMonthly: Number(budget?.basic_monthly_amount || 0),
        extendMonthly: Number(budget?.extend_monthly_amount || 0),
        basicAnnual: Number(budget?.basic_annual_amount || 0),
        extendAnnual: Number(budget?.extend_annual_amount || 0),
        spentMonthly: Number(budget?.spent_monthly || 0),
        spentAnnual: Number(budget?.spent_annual || 0),
        hasMonthly: Number(budget?.basic_monthly_amount || 0) > 0 || Number(budget?.extend_monthly_amount || 0) > 0,
        hasAnnual: Number(budget?.basic_annual_amount || 0) > 0 || Number(budget?.extend_annual_amount || 0) > 0,
      };
    });
  }, [categories, budgets]);

  const summaryTotals = useMemo(() => {
    return combinedData.reduce(
      (acc, item) => {
        acc.monthlyBasic += item.basicMonthly;
        acc.monthlyExtend += item.extendMonthly;
        acc.annualBasic += item.basicAnnual;
        acc.annualExtend += item.extendAnnual;
        acc.monthlySpent += item.spentMonthly;
        acc.annualSpent += item.spentAnnual;
        return acc;
      },
      { monthlyBasic: 0, monthlyExtend: 0, annualBasic: 0, annualExtend: 0, monthlySpent: 0, annualSpent: 0 }
    );
  }, [combinedData]);

  const renderSummaryBar = (label: string, spent: number, basicLimit: number, extendLimit: number) => {
    const budget = basicLimit + extendLimit;
    const percentage = budget > 0 ? Math.min((Math.abs(spent) / budget) * 100, 100) : (spent > 0 ? 100 : 0);
    let variant = 'success';
    if (percentage >= 100) variant = 'danger';
    else if (percentage >= 80) variant = 'warning';

    return (
      <div className="p-3 bg-white rounded-3 shadow-sm border" style={{ borderColor: 'var(--bs-gray-200)' }}>
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div>
            <div className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{label}</div>
            <div className="fs-5 fw-bold text-dark d-flex align-items-baseline gap-2">
              <span className={spent < 0 ? 'text-danger' : ''}>{formatCurrency(spent, 'IDR')}</span>
              <span className="text-muted fs-6 fw-normal">/</span>
              <span className="fs-6 text-secondary">{formatCurrency(basicLimit, 'IDR')}</span>
              {extendLimit > 0 && (
                <span className="fs-6" style={{ color: '#d97706', fontWeight: 500 }}>
                  + {formatCurrency(extendLimit, 'IDR')}
                </span>
              )}
            </div>
          </div>
          <div className="text-end">
            <span className={`badge bg-${variant} bg-opacity-10 text-${variant} fw-bold px-2 py-1 border border-${variant} border-opacity-25`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="progress w-100" style={{ height: '8px', backgroundColor: 'var(--bs-gray-200)', borderRadius: '4px' }}>
          <div
            className={`progress-bar bg-${variant}`}
            role="progressbar"
            style={{ width: `${percentage}%`, transition: 'width 0.5s ease-in-out' }}
          />
        </div>
      </div>
    );
  };

  const parentItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    // Filter parents first
    const parents = combinedData.filter(item => !item.category.parent_id);

    return parents.map(parentItem => {
      // Find children for this parent
      let children = combinedData.filter(item => item.category.parent_id === parentItem.category.id);

      // We no longer strip out zero-budget categories natively at user's request
      let filteredChildren = children;

      const hasBudgetIntrinsic = parentItem.hasMonthly || parentItem.hasAnnual;
      const hasMatchingChildren = filteredChildren.length > 0;

      // Auto-Rollup Logic: If the parent has NO budget itself, we sum it up from its children acting as a dashboard bucket
      let rollItem = { ...parentItem };
      if (!hasBudgetIntrinsic && hasMatchingChildren) {
        rollItem.basicMonthly = filteredChildren.reduce((sum, c) => sum + c.basicMonthly, 0);
        rollItem.extendMonthly = filteredChildren.reduce((sum, c) => sum + c.extendMonthly, 0);
        rollItem.basicAnnual = filteredChildren.reduce((sum, c) => sum + c.basicAnnual, 0);
        rollItem.extendAnnual = filteredChildren.reduce((sum, c) => sum + c.extendAnnual, 0);
        rollItem.spentMonthly = filteredChildren.reduce((sum, c) => sum + c.spentMonthly, 0);
        rollItem.spentAnnual = filteredChildren.reduce((sum, c) => sum + c.spentAnnual, 0);
        rollItem.hasMonthly = filteredChildren.some(c => c.hasMonthly);
        rollItem.hasAnnual = filteredChildren.some(c => c.hasAnnual);
      }

      // Search matching
      const parentNameMatches = rollItem.category.name.toLowerCase().includes(searchLower);
      const childMatches = filteredChildren.filter(c => c.category.name.toLowerCase().includes(searchLower));

      let finalChildren = filteredChildren;
      if (searchLower) {
        finalChildren = childMatches;
      }

      // Apply inner sorting to children
      finalChildren.sort((a, b) => {
        if (sortBy === 'monthly_asc') return Math.abs(a.spentMonthly) - Math.abs(b.spentMonthly);
        if (sortBy === 'monthly_desc') return Math.abs(b.spentMonthly) - Math.abs(a.spentMonthly);
        if (sortBy === 'annual_asc') return Math.abs(a.spentAnnual) - Math.abs(b.spentAnnual);
        if (sortBy === 'annual_desc') return Math.abs(b.spentAnnual) - Math.abs(a.spentAnnual);
        if (sortBy === 'name_desc') return b.category.name.localeCompare(a.category.name);
        return a.category.name.localeCompare(b.category.name);
      });

      const matchesSearch = !searchLower || parentNameMatches || finalChildren.length > 0;

      return {
        ...rollItem,
        children: finalChildren,
        shouldRender: matchesSearch
      };
    }).filter(parent => parent.shouldRender).sort((a, b) => {
      // Apply outer sorting to parents seamlessly mirroring child parameters
      if (sortBy === 'monthly_asc') return Math.abs(a.spentMonthly) - Math.abs(b.spentMonthly);
      if (sortBy === 'monthly_desc') return Math.abs(b.spentMonthly) - Math.abs(a.spentMonthly);
      if (sortBy === 'annual_asc') return Math.abs(a.spentAnnual) - Math.abs(b.spentAnnual);
      if (sortBy === 'annual_desc') return Math.abs(b.spentAnnual) - Math.abs(a.spentAnnual);
      if (sortBy === 'name_desc') return b.category.name.localeCompare(a.category.name);
      return a.category.name.localeCompare(b.category.name);
    });

  }, [combinedData, searchTerm, sortBy]);


  const toggleCategory = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getIconComponent = (iconKey: string): IconType => {
    const IconComponent = (FaIcons as Record<string, IconType>)[iconKey];
    return IconComponent || FaGift;
  };

  const handleEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setShowModal(true);
  };

  const handleModalHide = () => {
    setShowModal(false);
    refreshBudgets(); // Only refresh budgets — categories are unchanged after modal
  };

  // No longer strictly necessary as progress bar consumes useFormattedCurrency exclusively natively
  // Removed static `formatCurrencyOnly` override to keep code lean

  const renderBudgetItem = (item: any, isChild = false) => {
    const IconComponent = getIconComponent(item.category.icon || 'FaGift');
    const categoryColor = item.category.color || '#6c757d';
    const currency = user?.currency || 'IDR';
    const hasChildren = !isChild && item.children && item.children.length > 0;

    return (
      <div
        className={`d-flex justify-content-between align-items-center w-100 px-3 py-3 ${isChild ? 'bg-light border-top' : ''}`}
        style={{ cursor: 'pointer', transition: 'background-color 0.2s', borderBottom: isChild ? 'none' : '1px solid var(--bs-gray-200)' }}
        onClick={(e) => {
          if (!isChild && hasChildren) {
            toggleCategory(e, item.category.id);
          } else {
            handleEdit(item.category.id);
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bs-light)';
          setHoveredItemId(item.category.id);
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isChild ? 'var(--bs-light)' : 'transparent';
          setHoveredItemId(null);
        }}
      >
        <div className="d-flex align-items-center" style={{ width: '25%', minWidth: '200px' }}>
          {!isChild && (
            <div
              style={{ width: '20px', cursor: 'pointer', visibility: hasChildren ? 'visible' : 'hidden' }}
              onClick={(e) => toggleCategory(e, item.category.id)}
            >
              <FaChevronRight
                size={12}
                style={{
                  transform: expandedCategories[item.category.id] ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s',
                  color: 'var(--bs-secondary)'
                }}
              />
            </div>
          )}
          {isChild && <div style={{ width: '20px' }}></div>}

          <div className="category-item__icon mx-2" style={{ backgroundColor: categoryColor, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconComponent size={14} color="#fff" />
          </div>
          <span className="fw-semibold text-truncate" style={{ fontSize: '15px' }}>{item.category.name}</span>
        </div>

        <div className="flex-grow-1 px-4 d-flex gap-4 align-items-center">
          <BudgetProgressBar spent={item.spentMonthly} basicLimit={item.basicMonthly} extendLimit={item.extendMonthly} currency={currency} label="Monthly Pace" isParent={!isChild} />
          <BudgetProgressBar spent={item.spentAnnual} basicLimit={item.basicAnnual} extendLimit={item.extendAnnual} currency={currency} label="Annual Pace" isParent={!isChild} />
        </div>

        <div className="d-flex justify-content-end align-items-center pe-3" style={{ width: '40px' }}>
          <div className="text-muted" style={{ opacity: hoveredItemId === item.category.id ? 0.8 : 0, transition: 'opacity 0.2s', zIndex: 10 }}>
            {!isChild && hasChildren ? null : <FaEdit size={16} />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Container fluid>
      <section className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0 fw-bold">Budgets</h2>
        </div>

        <Row className="g-3 mb-4">
          <Col md={6}>
            {renderSummaryBar('Total Monthly Budget', summaryTotals.monthlySpent, summaryTotals.monthlyBasic, summaryTotals.monthlyExtend)}
          </Col>
          <Col md={6}>
            {renderSummaryBar('Total Annual Budget', summaryTotals.annualSpent, summaryTotals.annualBasic, summaryTotals.annualExtend)}
          </Col>
        </Row>

        <Row className="mb-4 g-3 align-items-center">
          <Col md={4}>
            <Form.Group className="search-form">
              <div className="position-relative w-100">
                <Form.Control
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
                />
                <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted">
                  <FaSearch size={14} />
                </span>
                {searchTerm && (
                  <span className="position-absolute top-50 end-0 translate-middle-y me-1">
                    <ClearButton ariaLabel="Clear search" onClick={() => setSearchTerm('')} />
                  </span>
                )}
              </div>
            </Form.Group>
          </Col>
          <Col md={4} className="d-flex justify-content-center border-0 bg-transparent shadow-none" style={{ background: 'none' }}>
            <div style={{ width: '100%', maxWidth: '320px' }}>
              <PeriodNavigation>
                <MonthYearSelector label={periodLabel} activePeriod={activePeriod} />
              </PeriodNavigation>
            </div>
          </Col>
          <Col md={4} className="d-flex justify-content-end">
            <div style={{ width: '100%', maxWidth: '280px' }}>
              <SortDropdown
                id="budgetSort"
                value={sortBy}
                options={BUDGET_SORT_OPTIONS}
                onChange={setSortBy}
              />
            </div>
          </Col>
        </Row>
      </section>

      <section>
        <div className="categories-list">
          {loading ? (
            <div className="py-5 text-center text-muted">Loading budgets...</div>
          ) : parentItems.length === 0 ? (
            <div className="py-5 d-flex flex-column align-items-center justify-content-center bg-white rounded shadow-sm border" style={{ minHeight: '300px' }}>
              <FaGift size={48} className="text-muted mb-3 opacity-25" />
              <h4 className="fw-bold mb-2">No Categories Found</h4>
              <p className="text-muted text-center mb-4 px-4" style={{ maxWidth: '400px' }}>
                You haven't created any tracking categories yet. Navigate to your configuration panel to architect your tracking layout.
              </p>
            </div>
          ) : (
            <ListGroup>
              {parentItems.map(parentItem => (
                <ListGroup.Item key={parentItem.category.id} className="p-0 overflow-hidden">
                  {renderBudgetItem(parentItem, false)}

                  {parentItem.children.length > 0 && expandedCategories[parentItem.category.id] && (
                    <div className="category-children">
                      {parentItem.children.map((childItem: any) => (
                        <div key={childItem.category.id}>
                          {renderBudgetItem(childItem, true)}
                        </div>
                      ))}
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </section>

      <BudgetConfigModal
        show={showModal}
        onHide={handleModalHide}
        {...(editingCategoryId ? { initialCategoryId: editingCategoryId } : {})}
      />
    </Container>
  );
}

export default function BudgetsPage(): React.ReactElement {
  return (
    <PeriodNavigationProvider>
      <BudgetsPageContent />
    </PeriodNavigationProvider>
  );
}
