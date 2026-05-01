'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Form, ListGroup, OverlayTrigger, Placeholder, Tooltip, Button } from 'react-bootstrap';
import { FaSearch, FaGift, FaChevronRight, FaEdit, FaInfoCircle, FaListUl } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { categoryService, Category } from '@/services/categoryService';
import { budgetService, CategoryBudget } from '@/services/budgetService';
import { BudgetConfigModal } from '@/components/budgets/BudgetConfigModal';
import { BudgetProgressBar } from '@/components/budgets/BudgetProgressBar';
import CategoryTransactionsModal from '@/components/analytics/CategoryTransactionsModal';
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
  { value: 'monthly_spending_asc', icon: FaSortAmountUp, title: 'Monthly Spending ASC', ariaLabel: 'Monthly spending ascending' },
  { value: 'monthly_spending_desc', icon: FaSortAmountDown, title: 'Monthly Spending DESC', ariaLabel: 'Monthly spending descending' },
  { value: 'annual_spending_asc', icon: FaSortAmountUp, title: 'Annual Spending ASC', ariaLabel: 'Annual spending ascending' },
  { value: 'annual_spending_desc', icon: FaSortAmountDown, title: 'Annual Spending DESC', ariaLabel: 'Annual spending descending' },
  { value: 'monthly_budget_asc', icon: FaSortAmountUp, title: 'Monthly Budget ASC', ariaLabel: 'Monthly budget ascending' },
  { value: 'monthly_budget_desc', icon: FaSortAmountDown, title: 'Monthly Budget DESC', ariaLabel: 'Monthly budget descending' },
  { value: 'annual_budget_asc', icon: FaSortAmountUp, title: 'Annual Budget ASC', ariaLabel: 'Annual budget ascending' },
  { value: 'annual_budget_desc', icon: FaSortAmountDown, title: 'Annual Budget DESC', ariaLabel: 'Annual budget descending' },
];
function BudgetsPageContent(): React.ReactElement {
  interface SelectedBudgetCategory {
    ids: string[];
    name: string;
    monthName: string;
    startDate: string;
    endDate: string;
    currency: string;
  }

  interface CombinedBudgetItem {
    category: Category;
    spentMonthly: number;
    spentAnnual: number;
    basicMonthly: number;
    extendMonthly: number;
    basicAnnual: number;
    extendAnnual: number;
    hasMonthly: boolean;
    hasAnnual: boolean;
    children?: CombinedBudgetItem[];
  }

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const { user } = useAuth();
  const { formatCurrency, formatShort } = useFormattedCurrency();
  const { state: { activePeriod, periodLabel, dateRange } } = usePeriodNavigation();
  const selectedMonth = activePeriod.month !== undefined ? activePeriod.month + 1 : new Date().getMonth() + 1;
  const selectedYear = activePeriod.year !== undefined ? activePeriod.year : new Date().getFullYear();

  const [sortBy, setSortBy] = useState<string>('name_asc');

  const [loading, setLoading] = useState<boolean>(true);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>(undefined);
  const [showTransactionsModal, setShowTransactionsModal] = useState<boolean>(false);
  const [selectedBudgetCategory, setSelectedBudgetCategory] = useState<SelectedBudgetCategory | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const [catRes, budRes] = await Promise.all([
        categoryService.fetchCategories({ is_active: true }),
        budgetService.fetchBudgets({ 
          month: selectedMonth, 
          year: selectedYear,
          ...(startDateTime ? { start_date: startDateTime } : {}),
          ...(endDateTime ? { end_date: endDateTime } : {})
        })
      ]);
      setCategories(
        catRes.data.filter(c =>
          c.type === 'expense' || (c.type === 'both' && c.analytic_flag === 'expense')
        )
      );
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
      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const budRes = await budgetService.fetchBudgets({ 
        month: selectedMonth, 
        year: selectedYear,
        ...(startDateTime ? { start_date: startDateTime } : {}),
        ...(endDateTime ? { end_date: endDateTime } : {})
      });
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
    const absSpent = Math.abs(spent);
    const truePercentage = budget > 0 ? (absSpent / budget) * 100 : (absSpent > 0 ? 100 : 0);
    const isOver    = truePercentage > 100;
    const isAtLimit = truePercentage === 100;
    const barWidth  = Math.min(truePercentage, 100);
    const overageStr = isOver ? `+${(truePercentage - 100).toFixed(1)}%` : null;

    const ORANGE = '#f97316';
    let variant = 'success';
    if (isOver) variant = 'danger';
    else if (truePercentage >= 80) variant = 'warning';

    const badge = (
      <div className="d-flex align-items-center gap-1">
        {overageStr && (
          <span className="badge bg-danger text-white" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>
            {overageStr}
          </span>
        )}
        <span 
          className={`badge bg-${variant} bg-opacity-10 text-${variant} fw-bold px-2 py-1 border border-${variant} border-opacity-25`}
          style={isAtLimit ? { backgroundColor: `${ORANGE}1a`, color: ORANGE, borderColor: `${ORANGE}40` } : {}}
        >
          {Math.min(truePercentage, 100).toFixed(1)}%
        </span>
      </div>
    );

    const progressBar = (
      <div className="progress w-100" style={{ height: '8px', backgroundColor: 'var(--bs-gray-200)', borderRadius: '4px' }}>
        <div
          className={`progress-bar${isOver ? ' bg-danger progress-bar-striped progress-bar-animated' : isAtLimit ? '' : ` bg-${variant}`}`}
          role="progressbar"
          style={{ 
            width: `${barWidth}%`, 
            transition: 'width 0.5s ease-in-out',
            ...(isAtLimit ? { backgroundColor: ORANGE } : {})
          }}
        />
      </div>
    );

    const summaryTooltipId = `summary-tooltip-${label.replace(/\s+/g, '-').toLowerCase()}`;

    const infoIcon = extendLimit > 0 ? (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={summaryTooltipId}>
            <div className="text-start" style={{ fontSize: '12px', lineHeight: 1.6 }}>
              <div>Basic: <strong>{formatCurrency(basicLimit, 'IDR')}</strong></div>
              <div style={{ color: '#fbbf24' }}>Extend: <strong>{formatCurrency(extendLimit, 'IDR')}</strong></div>
              <hr className="my-1 border-secondary opacity-50" />
              <div>Total: <strong>{formatCurrency(budget, 'IDR')}</strong></div>
            </div>
          </Tooltip>
        }
      >
        <span className="text-muted d-inline-flex align-items-center ms-1" style={{ cursor: 'help', opacity: 0.55 }}>
          <FaInfoCircle size={12} />
        </span>
      </OverlayTrigger>
    ) : null;

    // Mobile limits: compact format; tooltip shows full
    const limitsCompact = (
      <div className="d-flex flex-wrap align-items-baseline gap-1" style={{ fontSize: '12px' }}>
        <span className="text-muted opacity-75">/</span>
        <span className="text-secondary">{formatShort(basicLimit, 'IDR')}</span>
        {extendLimit > 0 && (
          <span style={{ color: '#d97706', fontWeight: 500 }}>+ {formatShort(extendLimit, 'IDR')}</span>
        )}
        {infoIcon}
      </div>
    );

    return (
      <div className="p-3 bg-white rounded-3 shadow-sm border" style={{ borderColor: 'var(--bs-gray-200)' }}>
        {/* ── MOBILE layout ── */}
        <div className="d-md-none">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="text-muted fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{label}</div>
            {badge}
          </div>
          <div className={`fw-bold mb-1 ${isOver ? 'text-danger' : 'text-dark'}`} style={{ fontSize: '1.15rem' }}>
            {formatShort(absSpent, 'IDR')}
          </div>
          <div className="mb-2">{limitsCompact}</div>
          {progressBar}
        </div>

        {/* ── DESKTOP layout (original compact horizontal) ── */}
        <div className="d-none d-md-block">
          <div className="d-flex justify-content-between align-items-end mb-3">
            <div>
              <div className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>{label}</div>
              <div className="fs-5 fw-bold text-dark d-flex align-items-baseline gap-2">
                <span className={isOver ? 'text-danger' : ''}>{formatCurrency(absSpent, 'IDR')}</span>
                <span className="text-muted fs-6 fw-normal">/</span>
                <span className="fs-6 text-secondary">{formatCurrency(basicLimit, 'IDR')}</span>
                {extendLimit > 0 && (
                  <span className="fs-6" style={{ color: '#d97706', fontWeight: 500 }}>+ {formatCurrency(extendLimit, 'IDR')}</span>
                )}
                {infoIcon}
              </div>
            </div>
            <div className="text-end">{badge}</div>
          </div>
          {progressBar}
        </div>
      </div>
    );
  };

  const toggleCategory = (e: React.MouseEvent, categoryId: string) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const expandAll = () => {
    const allParentIds = parentItems.reduce((acc, item) => {
      if (item.children.length > 0) {
        acc[item.category.id] = true;
      }
      return acc;
    }, {} as Record<string, boolean>);
    setExpandedCategories(allParentIds);
  };

  const collapseAll = () => {
    setExpandedCategories({});
  };

  const getIconComponent = (iconKey: string): IconType => {
    const IconComponent = (FaIcons as Record<string, IconType>)[iconKey];
    return IconComponent || FaGift;
  };

  const handleEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setShowModal(true);
  };

  const renderSummaryBarSkeleton = (key: string) => (
    <div key={key} className="p-3 bg-white rounded-3 shadow-sm border" style={{ borderColor: 'var(--bs-gray-200)' }}>
      <Placeholder animation="glow">
        <Placeholder xs={4} className="d-block mb-3" style={{ height: '12px' }} />
        <Placeholder xs={6} className="d-block mb-2" style={{ height: '24px' }} />
        <Placeholder xs={8} className="d-block mb-3" style={{ height: '12px' }} />
        <Placeholder xs={12} className="d-block rounded" style={{ height: '8px' }} />
      </Placeholder>
    </div>
  );

  const renderBudgetListSkeleton = () => (
    <ListGroup>
      {Array.from({ length: 4 }).map((_, index) => (
        <ListGroup.Item key={`budget-skeleton-${index}`} className="p-3 overflow-hidden">
          <div className="d-flex align-items-center gap-3">
            <Placeholder animation="glow">
              <Placeholder className="rounded" style={{ width: '20px', height: '20px' }} />
            </Placeholder>
            <Placeholder animation="glow">
              <Placeholder className="rounded" style={{ width: '32px', height: '32px' }} />
            </Placeholder>
            <div className="flex-grow-1">
              <Placeholder animation="glow">
                <Placeholder xs={4} className="d-block mb-2" style={{ height: '16px' }} />
                <Placeholder xs={12} className="d-block mb-2 rounded" style={{ height: '10px' }} />
                <Placeholder xs={9} className="d-block rounded" style={{ height: '10px' }} />
              </Placeholder>
            </div>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );

  const compareBudgetItems = useCallback((a: CombinedBudgetItem, b: CombinedBudgetItem) => {
    const monthlySpendingA = Math.abs(Number(a.spentMonthly || 0));
    const monthlySpendingB = Math.abs(Number(b.spentMonthly || 0));
    const annualSpendingA = Math.abs(Number(a.spentAnnual || 0));
    const annualSpendingB = Math.abs(Number(b.spentAnnual || 0));
    const monthlyBudgetA = Number(a.basicMonthly || 0) + Number(a.extendMonthly || 0);
    const monthlyBudgetB = Number(b.basicMonthly || 0) + Number(b.extendMonthly || 0);
    const annualBudgetA = Number(a.basicAnnual || 0) + Number(a.extendAnnual || 0);
    const annualBudgetB = Number(b.basicAnnual || 0) + Number(b.extendAnnual || 0);
    const nameCompare = a.category.name.localeCompare(b.category.name);

    const compareNumbers = (left: number, right: number, direction: 'asc' | 'desc') => {
      if (left === right) return nameCompare;
      return direction === 'asc' ? left - right : right - left;
    };

    if (sortBy === 'monthly_spending_asc') return compareNumbers(monthlySpendingA, monthlySpendingB, 'asc');
    if (sortBy === 'monthly_spending_desc') return compareNumbers(monthlySpendingA, monthlySpendingB, 'desc');
    if (sortBy === 'annual_spending_asc') return compareNumbers(annualSpendingA, annualSpendingB, 'asc');
    if (sortBy === 'annual_spending_desc') return compareNumbers(annualSpendingA, annualSpendingB, 'desc');
    if (sortBy === 'monthly_budget_asc') return compareNumbers(monthlyBudgetA, monthlyBudgetB, 'asc');
    if (sortBy === 'monthly_budget_desc') return compareNumbers(monthlyBudgetA, monthlyBudgetB, 'desc');
    if (sortBy === 'annual_budget_asc') return compareNumbers(annualBudgetA, annualBudgetB, 'asc');
    if (sortBy === 'annual_budget_desc') return compareNumbers(annualBudgetA, annualBudgetB, 'desc');
    if (sortBy === 'name_desc') return b.category.name.localeCompare(a.category.name);
    return nameCompare;
  }, [sortBy]);

  const parentItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    // Filter parents first
    const parents = combinedData.filter(item => !item.category.parent_id);

    return parents.map(parentItem => {
      // Find children for this parent
      let children = combinedData.filter(item => item.category.parent_id === parentItem.category.id);

      // We no longer strip out zero-budget categories natively at user's request
      let filteredChildren = children;

      const hasMatchingChildren = filteredChildren.length > 0;

      // Always roll child spending into parent spending so the row matches the parent transaction modal.
      // Budget limits still only roll up when the parent has no intrinsic budget configured.
      let rollItem = { ...parentItem };
      if (hasMatchingChildren) {
        const childMonthlySpent = filteredChildren.reduce((sum, c) => sum + c.spentMonthly, 0);
        const childAnnualSpent = filteredChildren.reduce((sum, c) => sum + c.spentAnnual, 0);
        rollItem.spentMonthly += childMonthlySpent;
        rollItem.spentAnnual += childAnnualSpent;
      }

      const hasBudgetIntrinsic = parentItem.hasMonthly || parentItem.hasAnnual;
      if (!hasBudgetIntrinsic && hasMatchingChildren) {
        rollItem.basicMonthly = filteredChildren.reduce((sum, c) => sum + c.basicMonthly, 0);
        rollItem.extendMonthly = filteredChildren.reduce((sum, c) => sum + c.extendMonthly, 0);
        rollItem.basicAnnual = filteredChildren.reduce((sum, c) => sum + c.basicAnnual, 0);
        rollItem.extendAnnual = filteredChildren.reduce((sum, c) => sum + c.extendAnnual, 0);
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
      finalChildren.sort(compareBudgetItems);

      const matchesSearch = !searchLower || parentNameMatches || finalChildren.length > 0;

      return {
        ...rollItem,
        children: finalChildren,
        shouldRender: matchesSearch
      };
    }).filter(parent => parent.shouldRender).sort(compareBudgetItems);

  }, [combinedData, compareBudgetItems, searchTerm]);

  const collectCategoryIds = useCallback((categoryId: string): string[] => {
    const ids = [categoryId];
    const childIds = categories
      .filter(category => category.parent_id === categoryId)
      .flatMap(category => collectCategoryIds(category.id));

    return [...ids, ...childIds];
  }, [categories]);

  const handleShowTransactions = useCallback((item: CombinedBudgetItem) => {
    const currency = user?.currency || 'IDR';
    // dateRange values from the period context are ISO date strings (YYYY-MM-DD).
    // The transactions API expects full ISO datetimes, so append start/end-of-day times.
    const startDate = dateRange.start
      ? new Date(`${dateRange.start}T00:00:00.000`).toISOString()
      : new Date(selectedYear, 0, 1).toISOString();
    const endDate = dateRange.end
      ? new Date(`${dateRange.end}T23:59:59.999`).toISOString()
      : new Date(selectedYear, 11, 31, 23, 59, 59, 999).toISOString();

    setSelectedBudgetCategory({
      ids: collectCategoryIds(item.category.id),
      name: item.category.name,
      monthName: periodLabel,
      startDate,
      endDate,
      currency,
    });
    setShowTransactionsModal(true);
  }, [collectCategoryIds, periodLabel, dateRange, selectedYear, user?.currency]);

  const handleModalHide = () => {
    setShowModal(false);
    refreshBudgets(); // Only refresh budgets — categories are unchanged after modal
  };

  const handleTransactionsModalHide = () => {
    setShowTransactionsModal(false);
    setSelectedBudgetCategory(null);
  };

  // No longer strictly necessary as progress bar consumes useFormattedCurrency exclusively natively
  // Removed static `formatCurrencyOnly` override to keep code lean

  const renderBudgetItem = (item: CombinedBudgetItem, isChild = false) => {
    const IconComponent = getIconComponent(item.category.icon || 'FaGift');
    const categoryColor = item.category.color || '#6c757d';
    const currency = user?.currency || 'IDR';
    const hasChildren = !isChild && item.children && item.children.length > 0;

    const chevron = (
      <div
        style={{ width: '20px', cursor: 'pointer', visibility: hasChildren ? 'visible' : 'hidden', flexShrink: 0 }}
        onClick={(e) => { e.stopPropagation(); toggleCategory(e, item.category.id); }}
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
    );

    const iconEl = (
      <div
        className="flex-shrink-0"
        style={{ backgroundColor: categoryColor, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <IconComponent size={14} color="#fff" />
      </div>
    );

    const transactionsButton = (
      <button
        className="btn btn-sm btn-link text-muted p-1"
        style={{ flexShrink: 0 }}
        onClick={(e) => { e.stopPropagation(); handleShowTransactions(item); }}
        aria-label={`View ${item.category.name} transactions`}
        title="View transactions"
      >
        <FaListUl size={15} />
      </button>
    );

    return (
      <>
        {/* ── MOBILE LAYOUT (hidden on md+) ── */}
        <div
          className={`d-md-none px-3 py-3 ${isChild ? 'bg-light border-top' : ''}`}
          style={{
            borderBottom: isChild ? 'none' : '1px solid var(--bs-gray-200)',
            borderLeft: hoveredItemId === item.category.id ? '4px solid var(--bs-primary)' : '4px solid transparent',
            backgroundColor: hoveredItemId === item.category.id ? 'var(--bs-light)' : (isChild ? 'var(--bs-light)' : 'transparent'),
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onTouchStart={() => setHoveredItemId(item.category.id)}
          onClick={(e) => {
            if (!isChild && hasChildren) {
              toggleCategory(e, item.category.id);
            } else {
              handleShowTransactions(item);
            }
          }}
        >
          {/* Header row: chevron + icon + name + edit */}
          <div className="d-flex align-items-center gap-2 mb-2">
            {!isChild ? chevron : <div style={{ width: '20px', flexShrink: 0 }} />}
            {iconEl}
            <span className="fw-semibold flex-grow-1" style={{ fontSize: '14px', lineHeight: 1.3 }}>
              {item.category.name}
            </span>
            {!isChild && hasChildren && transactionsButton}
            {(!hasChildren || isChild) && (
              <button
                className="btn btn-sm btn-link text-muted p-1"
                style={{ flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); handleEdit(item.category.id); }}
                aria-label={`Edit ${item.category.name} budget`}
              >
                <FaEdit size={15} />
              </button>
            )}
          </div>
          {/* Progress bars stacked */}
          <div className={isChild ? 'ps-0' : 'ps-4'}>
            <BudgetProgressBar spent={item.spentMonthly} basicLimit={item.basicMonthly} extendLimit={item.extendMonthly} currency={currency} label="Monthly Pace" isParent={!isChild} />
            <BudgetProgressBar spent={item.spentAnnual} basicLimit={item.basicAnnual} extendLimit={item.extendAnnual} currency={currency} label="Annual Pace" isParent={!isChild} />
          </div>
        </div>

        {/* ── DESKTOP LAYOUT (hidden on mobile) ── */}
        <div
          className={`d-none d-md-flex justify-content-between align-items-center w-100 px-3 py-3 ${isChild ? 'border-top' : ''}`}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: isChild ? 'none' : '1px solid var(--bs-gray-200)',
            borderLeft: hoveredItemId === item.category.id ? '4px solid var(--bs-primary)' : '4px solid transparent',
            backgroundColor: hoveredItemId === item.category.id ? 'var(--bs-light)' : (isChild ? 'var(--bs-light)' : 'transparent')
          }}
          onClick={(e) => {
            if (!isChild && hasChildren) {
              toggleCategory(e, item.category.id);
            } else {
              handleShowTransactions(item);
            }
          }}
          onMouseEnter={() => setHoveredItemId(item.category.id)}
          onMouseLeave={() => setHoveredItemId(null)}
        >
          <div className="d-flex align-items-center" style={{ width: '25%', minWidth: '200px' }}>
            {!isChild ? chevron : <div style={{ width: '20px' }} />}
            <div className="mx-2">{iconEl}</div>
            <span className="fw-semibold text-truncate" style={{ fontSize: '15px' }}>{item.category.name}</span>
          </div>

          <div className="flex-grow-1 px-4 d-flex gap-4 align-items-center">
            <BudgetProgressBar spent={item.spentMonthly} basicLimit={item.basicMonthly} extendLimit={item.extendMonthly} currency={currency} label="Monthly Pace" isParent={!isChild} />
            <BudgetProgressBar spent={item.spentAnnual} basicLimit={item.basicAnnual} extendLimit={item.extendAnnual} currency={currency} label="Annual Pace" isParent={!isChild} />
          </div>

          <div className="d-flex justify-content-end align-items-center gap-2 pe-3" style={{ width: '88px' }}>
            <div
              className="text-muted"
              style={{ opacity: hoveredItemId === item.category.id ? 0.8 : 0, transition: 'opacity 0.2s', zIndex: 10, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); handleShowTransactions(item); }}
              title="View transactions"
              aria-label={`View ${item.category.name} transactions`}
            >
              {!isChild && hasChildren ? <FaListUl size={16} /> : null}
            </div>
            {(!hasChildren || isChild) && (
              <button
                className="btn btn-sm btn-link text-muted p-0 border-0"
                style={{ opacity: hoveredItemId === item.category.id ? 0.8 : 0, transition: 'opacity 0.2s', zIndex: 10 }}
                onClick={(e) => { e.stopPropagation(); handleEdit(item.category.id); }}
                aria-label={`Edit ${item.category.name} budget`}
                title="Edit budget"
              >
                <FaEdit size={16} />
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <Container fluid>
      <section className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0 fw-bold">Budgets</h2>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={expandAll} className="d-flex align-items-center gap-1 shadow-sm">
              <FaChevronRight size={10} style={{ transform: 'rotate(90deg)' }} /> Expand All
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={collapseAll} className="d-flex align-items-center gap-1 shadow-sm">
              <FaChevronRight size={10} /> Collapse All
            </Button>
          </div>
        </div>

        <Row className="g-3 mb-2">
          <Col md={6}>
            {loading
              ? renderSummaryBarSkeleton('monthly-summary-skeleton')
              : renderSummaryBar('Total Monthly Budget', summaryTotals.monthlySpent, summaryTotals.monthlyBasic, summaryTotals.monthlyExtend)}
          </Col>
          <Col md={6}>
            {loading
              ? renderSummaryBarSkeleton('annual-summary-skeleton')
              : renderSummaryBar('Total Annual Budget', summaryTotals.annualSpent, summaryTotals.annualBasic, summaryTotals.annualExtend)}
          </Col>
        </Row>

        {/* Toolbar
              Desktop: [Search md=4] [Period md=4 centered] [Sort md=4 right] — all on one row
              Mobile:  [Search xs=12] then [Period xs=12] then [Sort auto-width]  — stacked
        */}
        <Row className="g-2 mb-4 align-items-center">
          {/* Search */}
          <Col xs={12} md={4}>
            <Form.Group>
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

          {/* Period navigator — centered on desktop, full-width on mobile */}
          <Col xs={12} md={4} className="d-flex justify-content-center border-0 bg-transparent shadow-none" style={{ background: 'none' }}>
            <div className="w-100" style={{ maxWidth: '320px' }}>
              <PeriodNavigation>
                <MonthYearSelector label={periodLabel} activePeriod={activePeriod} />
              </PeriodNavigation>
            </div>
          </Col>

          {/* Sort dropdown — right-aligned on desktop, auto-width on mobile */}
          <Col xs={12} md={4} className="d-flex justify-content-md-end">
            {/* Mobile: full-width to match search and period navigator */}
            <div className="d-md-none w-100">
              <SortDropdown
                id="budgetSortMobile"
                value={sortBy}
                options={BUDGET_SORT_OPTIONS}
                onChange={setSortBy}
                className="w-100"
              />
            </div>
            {/* Desktop: full-width within column, capped */}
            <div className="d-none d-md-block w-100" style={{ maxWidth: '280px' }}>
              <SortDropdown
                id="budgetSortDesktop"
                value={sortBy}
                options={BUDGET_SORT_OPTIONS}
                onChange={setSortBy}
                className="w-100"
              />
            </div>
          </Col>
        </Row>
      </section>

      <section>
        <div className="categories-list">
          {loading ? (
            renderBudgetListSkeleton()
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
                      {parentItem.children.map((childItem: CombinedBudgetItem) => (
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

      <CategoryTransactionsModal
        show={showTransactionsModal}
        onHide={handleTransactionsModalHide}
        categoryIds={selectedBudgetCategory?.ids ?? null}
        categoryName={selectedBudgetCategory?.name ?? ''}
        monthType="current"
        monthName={selectedBudgetCategory?.monthName ?? ''}
        {...(selectedBudgetCategory?.startDate && { startDate: selectedBudgetCategory.startDate })}
        {...(selectedBudgetCategory?.endDate && { endDate: selectedBudgetCategory.endDate })}
        {...(selectedBudgetCategory?.currency && { currency: selectedBudgetCategory.currency })}
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
