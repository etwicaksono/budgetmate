'use client';

import React, { useState, useCallback } from 'react';
import { Card, Table, Dropdown, Form, Placeholder } from 'react-bootstrap';
import { FaListUl, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import { Icon } from '@/utils/iconResolver';
import { type CategoryReport, type IncomeExpenseReport } from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { useIncomeExpenseData } from '@/hooks/useIncomeExpenseData';
import type { SortValue } from '@/hooks/useFilterData';
import CategoryTransactionsModal from './CategoryTransactionsModal';
import { AnalyticsToolbar } from './AnalyticsToolbar';

type PeriodType = 'month' | 'week' | 'year' | 'custom';

interface IncomesExpensesReportProps {
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
  selectedCategories?: string[];
  selectedAccounts?: string[];
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  minAmount?: number;
  maxAmount?: number;
  transferOption?: string;
  debtOption?: string;
  draftOption?: string;
  selectedLabelIds?: string[];
  excludedLabelIds?: string[];
  sortOption?: SortValue;
  onSortOptionChange?: (value: SortValue) => void;
  numberOfColumns?: number;
  onNumberOfColumnsChange?: (val: number) => void;
}

// Amounts are only shown with decimals when they actually carry a fractional
// part; anything that rounds to a whole unit stays free of ",00" noise.
const DECIMAL_DIGITS = 2;
const ROUNDING_TOLERANCE = 0.5 / 10 ** DECIMAL_DIGITS;

const hasVisibleDecimals = (value: number): boolean =>
  Math.abs(value - Math.round(value)) >= ROUNDING_TOLERANCE;

interface SelectedCategory {
  id: string;
  ids: string[];
  name: string;
  monthType: 'current' | 'previous';
  monthName: string;
  monthStartDate: string;
  monthEndDate: string;
  accountIds?: string[];
}

const IncomesExpensesReport: React.FC<IncomesExpensesReportProps> = ({
  startDate,
  endDate,
  periodType = 'month',
  selectedCategories,
  selectedAccounts,
  searchTerm,
  onSearchTermChange,
  minAmount,
  maxAmount,
  transferOption,
  debtOption,
  draftOption,
  selectedLabelIds,
  excludedLabelIds,
  sortOption: externalSortOption = 'timeDesc',
  onSortOptionChange,
  numberOfColumns = 2,
  onNumberOfColumnsChange,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showPercentageDiff, setShowPercentageDiff] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const { formatCurrency } = useFormattedCurrency();

  // Keeps whole amounts unchanged while restoring decimals for fractional ones.
  const formatAmount = useCallback(
    (value: number) =>
      hasVisibleDecimals(value)
        ? formatCurrency(value, { forceDecimals: DECIMAL_DIGITS })
        : formatCurrency(value),
    [formatCurrency]
  );

  const { data, loading, error } = useIncomeExpenseData({
    startDate,
    endDate,
    periodType,
    selectedCategories,
    selectedAccounts,
    searchTerm,
    minAmount,
    maxAmount,
    transferOption,
    debtOption,
    draftOption,
    selectedLabelIds,
    excludedLabelIds,
    numberOfColumns,
  });

  const reportData = data ?? null;

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const collectCategoryIds = (category: CategoryReport): string[] => {
    const ids = [category.id];
    if (category.subItems && category.subItems.length > 0) {
      category.subItems.forEach((child) => {
        ids.push(...collectCategoryIds(child));
      });
    }
    return ids;
  };

  const handleShowTransactions = (
    category: CategoryReport,
    periodIndex: number,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    const periodNames = data?.monthNames || [];
    const periodName = periodNames[periodIndex] || '';
    const categoryIds = collectCategoryIds(category);

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (periodType === 'month') {
      const baseDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      periodStart = new Date(baseDate);
      periodStart.setMonth(periodStart.getMonth() - periodIndex);
      periodStart.setDate(1);
      periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59);
    } else if (periodType === 'week') {
      const baseDate = startDate ? new Date(startDate) : now;
      const dayOfWeek = baseDate.getDay();
      const monday = new Date(baseDate);
      monday.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);

      periodStart = new Date(monday);
      periodStart.setDate(monday.getDate() - (periodIndex * 7));
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (periodType === 'year') {
      const baseYear = startDate ? new Date(startDate).getFullYear() : now.getFullYear();
      const year = baseYear - periodIndex;
      periodStart = new Date(year, 0, 1, 0, 0, 0);
      periodEnd = new Date(year, 11, 31, 23, 59, 59);
    } else {
      const customStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      const customEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const totalDays = Math.ceil((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysPerPeriod = Math.max(1, Math.ceil(totalDays / numberOfColumns));

      periodStart = new Date(customStart);
      periodStart.setDate(customStart.getDate() - (periodIndex * daysPerPeriod));
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + daysPerPeriod - 1);
      periodEnd.setHours(23, 59, 59, 999);
    }

    setSelectedCategory({
      id: category.id,
      ids: categoryIds,
      name: category.name,
      monthType: periodIndex === 0 ? 'current' : 'previous',
      monthName: periodName,
      monthStartDate: periodStart.toISOString(),
      monthEndDate: periodEnd.toISOString(),
      ...(selectedAccounts && selectedAccounts.length > 0 && { accountIds: selectedAccounts }),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
  };

  const sortCategories = useCallback((categories: CategoryReport[]): CategoryReport[] => {
    if (externalSortOption === 'timeDesc' || externalSortOption === 'timeAsc') return categories;

    return [...categories].sort((a, b) => {
      const aAmount = Math.abs(a.amounts[0] ?? 0);
      const bAmount = Math.abs(b.amounts[0] ?? 0);

      if (externalSortOption === 'amountAsc') return aAmount - bAmount;
      if (externalSortOption === 'amountDesc') return bAmount - aAmount;
      if (externalSortOption === 'absAmountAsc') return a.name.localeCompare(b.name);
      if (externalSortOption === 'absAmountDesc') return b.name.localeCompare(a.name);
      return 0;
    });
  }, [externalSortOption]);

  // Filter categories by search term (recursive — matches parent or any child)
  const filterCategoriesBySearch = useCallback((categories: CategoryReport[], term: string): CategoryReport[] => {
    if (!term || !term.trim()) return categories;
    const lower = term.toLowerCase().trim();
    return categories.reduce((acc: CategoryReport[], cat) => {
      const nameMatches = cat.name.toLowerCase().includes(lower);
      const matchingSubs = cat.subItems?.filter(sub => sub.name.toLowerCase().includes(lower)) ?? [];
      if (nameMatches) {
        acc.push(cat);
      } else if (matchingSubs.length > 0) {
        acc.push({ ...cat, subItems: matchingSubs, hasSubItems: true });
      }
      return acc;
    }, []);
  }, []);

  const calculatePercentageDiff = (current: number, previous: number): string | null => {
    if (!showPercentageDiff || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  };

  const renderCategoryRow = (
    category: CategoryReport,
    type: 'income' | 'expense',
    isChild = false,
  ) => {
    const hasChildren = category.hasSubItems && category.subItems && category.subItems.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const iconSize = isChild ? 20 : 24;

    return (
      <React.Fragment key={category.id}>
        <tr
          className={`${hasChildren ? 'parent-row' : ''} ${isChild ? 'child-row' : ''}`}
          onClick={() => hasChildren && toggleCategory(category.id)}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          <td>
            <div className="d-flex align-items-center gap-2" style={{ paddingLeft: isChild ? '2rem' : 0 }}>
              {hasChildren && (
                <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                  {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                </span>
              )}
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: iconSize,
                  height: iconSize,
                  backgroundColor: category.color,
                  color: '#fff',
                }}
              >
                <Icon name={category.icon} size={isChild ? 10 : 12} />
              </span>
              <span>{category.name}</span>
            </div>
          </td>
          {category.amounts.map((amount, monthIndex) => (
            <td key={monthIndex} className="text-end">
              <span className="d-inline-flex align-items-center gap-1">
                {amount > 0 && (
                  <FaListUl
                    className="text-muted"
                    style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                    title="View transactions"
                    onClick={(e) => handleShowTransactions(category, monthIndex, e)}
                  />
                )}
                <span className={Object.is(amount, -0) || amount < 0 ? (type === 'income' ? 'text-danger' : 'text-success') : ''}>
                  {type === 'expense' ? (amount >= 0 ? '-' : '+') : (amount < 0 ? '-' : '')}
                  {formatAmount(Math.abs(amount))}
                </span>
                {monthIndex === 0 && (() => {
                  const pctDiff = calculatePercentageDiff(category.amounts[0] || 0, category.amounts[1] || 0);
                  if (pctDiff) {
                    const isPositive = pctDiff.startsWith('+');
                    return (
                      <small className={`ms-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                        ({pctDiff})
                      </small>
                    );
                  }
                  return null;
                })()}
              </span>
            </td>
          ))}
        </tr>
        {hasChildren && isExpanded && (() => {
          const sortedSubs = sortCategories(category.subItems ?? []);
          return sortedSubs.map((subItem) => renderCategoryRow(subItem, type, true));
        })()}
      </React.Fragment>
    );
  };

  const renderReport = (reportData: IncomeExpenseReport) => {
    const monthNames = data?.monthNames || [];
    const search = searchTerm ?? '';
    const filteredIncome = filterCategoriesBySearch(reportData.incomeCategories, search);
    const filteredExpense = filterCategoriesBySearch(reportData.expenseCategories, search);
    const sortedIncomeCategories = sortCategories(filteredIncome);
    const sortedExpenseCategories = sortCategories(filteredExpense);

    const now = new Date();
    const currentLong = now.toLocaleString('default', { month: 'long' });
    const currentShort = now.toLocaleString('default', { month: 'short' });
    const currentYear = now.getFullYear();

    const getDisplayName = (name: string) => {
      if (name === currentLong || name === currentShort || name === `${currentLong} ${currentYear}` || name === `${currentShort} ${currentYear}`) {
        return 'This Month';
      }
      return name;
    };

    return (
      <Table responsive bordered hover>
        <thead>
          <tr>
            <th style={{ width: '30%' }}></th>
            {monthNames.map((name, idx) => (
              <th key={idx} className="text-center">{getDisplayName(name)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Margin Row */}
          <tr className="margin-row">
            <td><strong>Net Margin</strong></td>
            {reportData.totalIncomes.map((income, i) => {
              const expense = reportData.totalExpenses[i] || 0;
              const margin = income - expense;
              const isPositive = margin >= 0;
              return (
                <td key={i} className="text-end" style={{ color: isPositive ? '#198754' : '#dc3545' }}>
                  {formatAmount(margin)}
                </td>
              );
            })}
          </tr>

          <tr className="total-row">
            <td><strong>Total Income</strong></td>
            {reportData.totalIncomes.map((total, idx) => (
              <td key={idx} className="text-end total-income">
                {total < 0 ? '-' : ''}{formatAmount(Math.abs(total))}
              </td>
            ))}
          </tr>

          {sortedIncomeCategories.map((category) => renderCategoryRow(category, 'income'))}

          <tr>
            <td colSpan={monthNames.length + 1} style={{ height: '1rem', padding: 0, border: 'none' }}></td>
          </tr>

          <tr className="total-row">
            <td><strong>Total Expense</strong></td>
            {reportData.totalExpenses.map((total, idx) => (
              <td key={idx} className="text-end total-expense">
                {total >= 0 ? '-' : '+'}{formatAmount(Math.abs(total))}
              </td>
            ))}
          </tr>

          {sortedExpenseCategories.map((category) => renderCategoryRow(category, 'expense'))}
        </tbody>
      </Table>
    );
  };

  const renderMobileCategoryRow = (
    category: CategoryReport,
    type: 'income' | 'expense',
    isChild = false,
  ) => {
    const hasChildren = category.hasSubItems && category.subItems && category.subItems.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const iconSize = '24px';

    const currentAmount = category.amounts[0] || 0;
    const prevAmount = category.amounts[1] || 0;
    const prefix = type === 'expense' ? (currentAmount >= 0 ? '-' : '+') : (currentAmount < 0 ? '-' : '');

    const diffNode = (() => {
      if (prevAmount === 0 && currentAmount !== 0) {
        return (
          <span className="ms-1 text-success" style={{ fontSize: '11px', fontWeight: 600 }}>
            +100% <span className="text-muted" style={{ fontWeight: 400 }}>vs prev</span>
          </span>
        );
      }
      if (prevAmount === 0) return null;

      const diff = ((currentAmount - prevAmount) / Math.abs(prevAmount)) * 100;
      const pctStr = diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
      const isPositive = type === 'income' ? diff >= 0 : diff < 0;

      return (
        <span className={`ms-1 ${isPositive ? 'text-success' : 'text-danger'}`} style={{ fontSize: '11px', fontWeight: 600 }}>
          {pctStr} <span className="text-muted" style={{ fontWeight: 400 }}>vs prev</span>
        </span>
      );
    })();

    return (
      <React.Fragment key={category.id}>
        <div
          className={`d-flex align-items-center justify-content-between p-3 border-bottom bg-white mobile-cat-row flex-nowrap`}
          onClick={() => hasChildren && toggleCategory(category.id)}
          style={{ cursor: hasChildren ? 'pointer' : 'default', paddingLeft: isChild ? '2.5rem' : '1rem', gap: '8px' }}
        >
          <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
            {!isChild && hasChildren && (
              <span className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem', width: '12px', textAlign: 'center' }}>
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
              </span>
            )}
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: iconSize,
                height: iconSize,
                backgroundColor: category.color,
                color: '#fff',
                marginLeft: (!isChild && !hasChildren) ? '20px' : '0',
              }}
            >
              <Icon name={category.icon} size={10} />
            </span>
            <div className="d-flex flex-column text-truncate">
              <span className="text-truncate" style={{ fontSize: isChild ? '13px' : '14px', fontWeight: isChild ? 500 : 600, color: '#111827' }}>
                {category.name}
              </span>
              {!isChild && hasChildren && (
                <span className="text-truncate" style={{ fontSize: '11px', color: '#6B7280' }}>
                  {category.subItems?.length || 0} sub-categories
                </span>
              )}
            </div>
          </div>
          <div className="d-flex flex-column align-items-end flex-shrink-0" style={{ whiteSpace: 'nowrap' }}>
            <span
              style={{ fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', textDecoration: currentAmount !== 0 ? 'underline dotted' : 'none' }}
              onClick={(e) => {
                if (currentAmount !== 0) handleShowTransactions(category, 0, e);
              }}
            >
              {prefix}{formatAmount(Math.abs(currentAmount))}
            </span>
            {diffNode}
          </div>
        </div>
        {hasChildren && isExpanded && (() => {
          const sortedSubs = sortCategories(category.subItems ?? []);
          return sortedSubs.map((subItem) => renderMobileCategoryRow(subItem, type, true));
        })()}
      </React.Fragment>
    );
  };

  const renderMobileList = (reportData: IncomeExpenseReport) => {
    const search = searchTerm ?? '';
    const filteredIncome = filterCategoriesBySearch(reportData.incomeCategories, search);
    const filteredExpense = filterCategoriesBySearch(reportData.expenseCategories, search);
    const sortedIncomeCategories = sortCategories(filteredIncome);
    const sortedExpenseCategories = sortCategories(filteredExpense);

    return (
      <div className="d-flex flex-column mb-4 rounded border overflow-hidden shadow-sm">
        <div className="px-3 py-2 bg-light border-bottom text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
          Income Breakdown
        </div>
        <div className="bg-white p-3 border-bottom">
          <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#065F46', marginBottom: '4px' }}>Total Income</span>
            <span className="text-truncate" style={{ fontSize: '16px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
              {(() => {
                const total = reportData.totalIncomes[0] || 0;
                return `${total < 0 ? '-' : ''}${formatAmount(Math.abs(total))}`;
              })()}
            </span>
            {(() => {
              const prev = reportData.totalIncomes[1] || 0;
              if (prev === 0) return null;
              const diff = (((reportData.totalIncomes[0] || 0) - prev) / prev) * 100;
              const isPositive = diff >= 0;
              return (
                <div className="d-flex align-items-center flex-wrap gap-1 mt-1">
                  <span style={{ fontSize: '12px', color: isPositive ? '#059669' : '#DC2626', fontWeight: 600 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>vs prev</span>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="d-flex flex-column bg-white">
          {sortedIncomeCategories.map((category) => renderMobileCategoryRow(category, 'income'))}
        </div>

        <div className="px-3 py-2 bg-light border-bottom border-top text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
          Expense Breakdown
        </div>
        <div className="bg-white p-3 border-bottom">
          <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '4px' }}>Total Expense</span>
            <span className="text-truncate" style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
              {(() => {
                const total = reportData.totalExpenses[0] || 0;
                return `${total >= 0 ? '-' : '+'}${formatAmount(Math.abs(total))}`;
              })()}
            </span>
            {(() => {
              const prev = reportData.totalExpenses[1] || 0;
              if (prev === 0) return null;
              const diff = (((reportData.totalExpenses[0] || 0) - prev) / Math.abs(prev)) * 100;
              const isPositive = diff <= 0;
              return (
                <div className="d-flex align-items-center flex-wrap gap-1 mt-1">
                  <span style={{ fontSize: '12px', color: isPositive ? '#059669' : '#DC2626', fontWeight: 600 }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>vs prev</span>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="d-flex flex-column bg-white" style={{ borderBottom: 'none' }}>
          {sortedExpenseCategories.map((category) => renderMobileCategoryRow(category, 'expense'))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div>
        <Placeholder animation="glow" className="mb-4">
          <Placeholder xs={4} style={{ height: '2rem' }} />
        </Placeholder>
        <Card className="mb-4" style={{ height: 350 }}>
          <Card.Body>
            <Placeholder animation="glow" className="h-100 d-flex align-items-center justify-content-center">
              <div className="text-muted">Loading report...</div>
            </Placeholder>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? 'Failed to load report'}
      </div>
    );
  }

  // Settings dropdown (restored from main branch styling)
  const settingsDropdown = (
    <Dropdown
      className="d-none d-md-block"
      show={showSettingsDropdown}
      onToggle={(isOpen) => setShowSettingsDropdown(isOpen ?? false)}
    >
      <Dropdown.Toggle
        variant="outline-secondary"
        size="sm"
        className="d-flex align-items-center justify-content-center p-1"
        style={{ width: '36px', height: '36px' }}
        aria-label="Report settings"
        title="Report settings"
      >
        <RiListSettingsLine size={18} />
      </Dropdown.Toggle>

      <Dropdown.Menu
        align="end"
        style={{
          minWidth: '220px',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e5e7eb',
          marginTop: '8px',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
            Number of columns
          </span>
        </div>
        <div className="d-flex align-items-center gap-2 mb-3">
          <Form.Range
            min={2}
            max={6}
            value={numberOfColumns}
            onChange={(e) => onNumberOfColumnsChange?.(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
        <div className="d-flex justify-content-between px-1" style={{ fontSize: '12px', color: '#6b7280', marginTop: '-8px', marginBottom: '12px' }}>
          <span>2</span>
          <span>3</span>
          <span>4</span>
          <span>5</span>
          <span>6</span>
        </div>

        <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />

        <Form.Check
          type="switch"
          id="show-percentage"
          label="Show percentage difference"
          checked={showPercentageDiff}
          onChange={() => setShowPercentageDiff(!showPercentageDiff)}
          style={{ fontSize: '14px' }}
        />
      </Dropdown.Menu>
    </Dropdown>
  );

  return (
    <div className="incomes-expenses-report">
      <style>{`
        .incomes-expenses-report .table {
          margin-bottom: 0;
        }
        .incomes-expenses-report .table th {
          border-top: none;
          font-weight: 600;
          padding: 1rem;
          background-color: #f8f9fa;
        }
        .incomes-expenses-report .table td {
          padding: 0.75rem 1rem;
          vertical-align: middle;
        }
        .incomes-expenses-report .total-row {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        .incomes-expenses-report .margin-row {
          background-color: #f8f9fa;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .incomes-expenses-report .total-income {
          color: #198754;
        }
        .incomes-expenses-report .total-expense {
          color: #dc3545;
        }
        .incomes-expenses-report .parent-row:hover {
          background-color: #f8f9fa;
        }
        .incomes-expenses-report .child-row {
          background-color: #fafbfc;
        }
      `}</style>

      {onSearchTermChange && onSortOptionChange && (
        <AnalyticsToolbar
          searchTerm={searchTerm ?? ''}
          onSearchTermChange={onSearchTermChange}
          sortOption={externalSortOption}
          onSortOptionChange={onSortOptionChange}
          rightSlot={settingsDropdown}
        />
      )}

      <div className="d-none d-md-block">
        {renderReport(reportData)}
      </div>
      <div className="d-md-none">
        {renderMobileList(reportData)}
      </div>

      {selectedCategory && (
        <CategoryTransactionsModal
          show={showModal}
          onHide={handleCloseModal}
          categoryIds={selectedCategory.ids}
          categoryName={selectedCategory.name}
          monthType={selectedCategory.monthType}
          monthName={selectedCategory.monthName}
          startDate={selectedCategory.monthStartDate}
          endDate={selectedCategory.monthEndDate}
          {...(selectedCategory.accountIds ? { accountIds: selectedCategory.accountIds } : {})}
        />
      )}
    </div>
  );
};

export default IncomesExpensesReport;
