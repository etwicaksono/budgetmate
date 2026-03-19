'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Table, Dropdown, Form, Placeholder } from 'react-bootstrap';
import { FaListUl, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import { Icon } from '@/utils/iconResolver';
import { analyticsService, type IncomeExpenseReport, type CategoryReport, type CurrencyReport } from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { useAuth } from '@/context/AuthContext';
import CategoryTransactionsModal from './CategoryTransactionsModal';

type PeriodType = 'month' | 'week' | 'year' | 'custom';

interface IncomesExpensesReportProps {
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
  selectedCategories?: string[];
  selectedAccounts?: string[];
  selectedCurrencies?: string[];
}

interface SelectedCategory {
  id: string;
  ids: string[]; // Include parent + all children IDs
  name: string;
  monthType: 'current' | 'previous';
  monthName: string;
  monthStartDate: string;
  monthEndDate: string;
}

type SortOption = 'default' | 'amount_asc' | 'amount_desc';

const IncomesExpensesReport: React.FC<IncomesExpensesReportProps> = ({
  startDate,
  endDate,
  periodType = 'month',
  selectedCategories,
  selectedAccounts,
  selectedCurrencies
}) => {
  const [data, setData] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [showPercentageDiff, setShowPercentageDiff] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [numberOfColumns, setNumberOfColumns] = useState(2);
  const { formatCurrency } = useFormattedCurrency();
  const { user } = useAuth();
  const defaultCurrency = user?.currency || 'USD';

  // Sort currencies with default currency first
  const sortedCurrencies = useMemo(() => {
    if (!data) return [];
    const currencies = [...data.currencies];
    if (defaultCurrency && currencies.includes(defaultCurrency)) {
      currencies.sort((a, b) => {
        if (a === defaultCurrency) return -1;
        if (b === defaultCurrency) return 1;
        return 0;
      });
    }
    return currencies;
  }, [data, defaultCurrency]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: {
          start_date?: string;
          end_date?: string;
          period_type?: PeriodType;
          periods?: number;
          category_ids?: string[];
          account_ids?: string[];
          currencies?: string[];
        } = {
          period_type: periodType,
          periods: numberOfColumns,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;
        if (selectedCurrencies?.length) params.currencies = selectedCurrencies;

        const reportData = await analyticsService.fetchIncomeExpenseReport(params);

        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, numberOfColumns, periodType, selectedCategories, selectedAccounts, selectedCurrencies]);

  // Set default currency when data loads
  useEffect(() => {
    if (sortedCurrencies.length > 0 && !selectedCurrency) {
      setSelectedCurrency(sortedCurrencies[0]!);
    } else if (sortedCurrencies.length > 0 && !sortedCurrencies.includes(selectedCurrency)) {
      setSelectedCurrency(sortedCurrencies[0]!);
    }
  }, [sortedCurrencies, selectedCurrency]);

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
      category.subItems.forEach(child => {
        ids.push(...collectCategoryIds(child));
      });
    }
    return ids;
  };

  const handleShowTransactions = (
    category: CategoryReport,
    periodIndex: number,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    const periodNames = data?.monthNames || [];
    const periodName = periodNames[periodIndex] || '';
    const categoryIds = collectCategoryIds(category);

    // Calculate date range based on period type
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
      // Custom - use start/end dates divided by periods
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
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
  };

  const sortCategories = useMemo(() => {
    return (categories: CategoryReport[]): CategoryReport[] => {
      if (sortOption === 'default') return categories;

      return [...categories].sort((a, b) => {
        const aTotal = a.amounts.reduce((sum, amt) => sum + amt, 0);
        const bTotal = b.amounts.reduce((sum, amt) => sum + amt, 0);

        if (sortOption === 'amount_asc') {
          return aTotal - bTotal;
        } else {
          return bTotal - aTotal;
        }
      });
    };
  }, [sortOption]);

  const calculatePercentageDiff = (current: number, previous: number): string | null => {
    if (!showPercentageDiff || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
  };

  const renderCategoryRow = (
    category: CategoryReport,
    type: 'income' | 'expense',
    currency: string,
    isChild = false
  ) => {
    const hasChildren = category.hasSubItems && category.subItems && category.subItems.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const prefix = type === 'expense' ? '-' : '';
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
                {prefix}{formatCurrency(amount, currency)}
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
        {hasChildren && isExpanded && category.subItems?.map((subItem) =>
          renderCategoryRow(subItem, type, currency, true)
        )}
      </React.Fragment>
    );
  };

  const renderReport = (currencyData: CurrencyReport, currency: string) => {
    const monthNames = data?.monthNames || [];

    return (
      <Table responsive bordered hover>
        <thead>
          <tr>
            <th style={{ width: '30%' }}></th>
            {monthNames.map((name, idx) => (
              <th key={idx} className="text-center">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Total Income Row */}
          <tr className="total-row">
            <td><strong>Total Income</strong></td>
            {currencyData.totalIncomes.map((total, idx) => (
              <td key={idx} className="text-end total-income">
                {formatCurrency(total, currency)}
              </td>
            ))}
          </tr>

          {/* Income Categories */}
          {sortCategories(currencyData.incomeCategories).map((category) => renderCategoryRow(category, 'income', currency))}

          {/* Spacer Row */}
          <tr>
            <td colSpan={monthNames.length + 1} style={{ height: '1rem', padding: 0, border: 'none' }}></td>
          </tr>

          {/* Total Expense Row */}
          <tr className="total-row">
            <td><strong>Total Expense</strong></td>
            {currencyData.totalExpenses.map((total, idx) => (
              <td key={idx} className="text-end total-expense">
                -{formatCurrency(total, currency)}
              </td>
            ))}
          </tr>

          {/* Expense Categories */}
          {sortCategories(currencyData.expenseCategories).map((category) => renderCategoryRow(category, 'expense', currency))}
        </tbody>
      </Table>
    );
  };

  const renderMobileCategoryRow = (
    category: CategoryReport,
    type: 'income' | 'expense',
    currency: string,
    isChild = false
  ) => {
    const hasChildren = category.hasSubItems && category.subItems && category.subItems.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const prefix = type === 'expense' ? '-' : '';
    const iconSize = '24px'; // Uniformly smaller container for both parent and child

    const currentAmount = category.amounts[0] || 0;
    const prevAmount = category.amounts[1] || 0;
    
    // Always calculate trend for mobile
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
      
      // Incomes: + is good (success), - is bad (danger)
      // Expenses: + is usually bad (danger), but taking absolute math, so we'll match desktop behavior
      const isPositive = type === 'income' ? diff >= 0 : diff < 0; // if expense decreased, it's good (success)
      
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
                marginLeft: (!isChild && !hasChildren) ? '20px' : '0' // align with children if no chevron
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
               {prefix}{formatCurrency(currentAmount, currency)}
             </span>
             {diffNode}
          </div>
        </div>
        {hasChildren && isExpanded && category.subItems?.map((subItem) =>
          renderMobileCategoryRow(subItem, type, currency, true)
        )}
      </React.Fragment>
    );
  };

  const renderMobileList = (currencyData: CurrencyReport, currency: string) => {
    return (
       <div className="d-flex flex-column mb-4 rounded border overflow-hidden shadow-sm">
         {/* Income Categories */}
          <div className="px-3 py-2 bg-light border-bottom text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
             Income Breakdown
          </div>
          <div className="bg-white p-3 border-bottom">
             {/* Income Summary */}
             <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#065F46', marginBottom: '4px' }}>Total Income</span>
                <span className="text-truncate" style={{ fontSize: '16px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                  {formatCurrency(currencyData.totalIncomes[0] || 0, currency)}
                </span>
                {(() => {
                   const prev = currencyData.totalIncomes[1] || 0;
                   if (prev === 0) return null;
                   const diff = (((currencyData.totalIncomes[0] || 0) - prev) / prev) * 100;
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
             {sortCategories(currencyData.incomeCategories).map((category) => renderMobileCategoryRow(category, 'income', currency))}
          </div>

          {/* Expense Categories */}
          <div className="px-3 py-2 bg-light border-bottom border-top text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
             Expense Breakdown
          </div>
          <div className="bg-white p-3 border-bottom">
             {/* Expense Summary */}
             <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', marginBottom: '4px' }}>Total Expense</span>
                <span className="text-truncate" style={{ fontSize: '16px', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
                  -{formatCurrency(currencyData.totalExpenses[0] || 0, currency)}
                </span>
                {(() => {
                   const prev = Math.abs(currencyData.totalExpenses[1] || 0);
                   if (prev === 0) return null;
                   const current = Math.abs(currencyData.totalExpenses[0] || 0);
                   const diff = ((current - prev) / prev) * 100;
                   const expenseDecreased = diff < 0;
                   return (
                     <div className="d-flex align-items-center gap-1 mt-1">
                       <span style={{ fontSize: '12px', color: expenseDecreased ? '#059669' : '#DC2626', fontWeight: 600 }}>
                         {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                       </span>
                       <span style={{ fontSize: '11px', color: '#6B7280' }}>vs prev</span>
                     </div>
                   );
                })()}
             </div>
          </div>
          <div className="d-flex flex-column bg-white" style={{ borderBottom: 'none' }}>
             {sortCategories(currencyData.expenseCategories).map((category) => renderMobileCategoryRow(category, 'expense', currency))}
          </div>
       </div>
    );
  };

  // Skeleton loading component
  const renderSkeleton = () => {
    const skeletonRows = Array.from({ length: 8 }, (_, i) => i);
    const skeletonCols = Array.from({ length: numberOfColumns }, (_, i) => i);

    return (
      <React.Fragment>
        {/* Desktop Skeleton */}
        <div className="d-none d-md-block">
          {/* Currency pills skeleton */}
          <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
            <Placeholder animation="glow">
              <Placeholder className="rounded-pill" style={{ width: 60, height: 32 }} />
            </Placeholder>
            <Placeholder animation="glow">
              <Placeholder className="rounded-pill" style={{ width: 60, height: 32 }} />
            </Placeholder>
          </div>

          {/* Table skeleton */}
          <Table responsive bordered>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>
                  <Placeholder animation="glow">
                    <Placeholder xs={4} />
                  </Placeholder>
                </th>
                {skeletonCols.map((i) => (
                  <th key={i} className="text-center">
                    <Placeholder animation="glow">
                      <Placeholder xs={8} />
                    </Placeholder>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Total Income skeleton */}
              <tr className="total-row">
                <td>
                  <Placeholder animation="glow">
                    <Placeholder xs={6} />
                  </Placeholder>
                </td>
                {skeletonCols.map((i) => (
                  <td key={i} className="text-end">
                    <Placeholder animation="glow">
                      <Placeholder xs={8} />
                    </Placeholder>
                  </td>
                ))}
              </tr>

              {/* Income category skeletons */}
              {skeletonRows.slice(0, 4).map((i) => (
                <tr key={`income-${i}`}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Placeholder animation="glow">
                        <Placeholder className="rounded" style={{ width: 20, height: 20 }} />
                      </Placeholder>
                      <Placeholder animation="glow" className="flex-grow-1">
                        <Placeholder xs={i % 2 === 0 ? 7 : 5} />
                      </Placeholder>
                    </div>
                  </td>
                  {skeletonCols.map((j) => (
                    <td key={j} className="text-end">
                      <Placeholder animation="glow">
                        <Placeholder xs={6} />
                      </Placeholder>
                    </td>
                  ))}
                </tr>
              ))}

              {/* Spacer */}
              <tr>
                <td colSpan={numberOfColumns + 1} style={{ height: '1rem', padding: 0, border: 'none' }}></td>
              </tr>

              {/* Total Expense skeleton */}
              <tr className="total-row">
                <td>
                  <Placeholder animation="glow">
                    <Placeholder xs={6} />
                  </Placeholder>
                </td>
                {skeletonCols.map((i) => (
                  <td key={i} className="text-end">
                    <Placeholder animation="glow">
                      <Placeholder xs={8} />
                    </Placeholder>
                  </td>
                ))}
              </tr>

              {/* Expense category skeletons */}
              {skeletonRows.slice(0, 4).map((i) => (
                <tr key={`expense-${i}`}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Placeholder animation="glow">
                        <Placeholder className="rounded" style={{ width: 20, height: 20 }} />
                      </Placeholder>
                      <Placeholder animation="glow" className="flex-grow-1">
                        <Placeholder xs={i % 2 === 0 ? 6 : 8} />
                      </Placeholder>
                    </div>
                  </td>
                  {skeletonCols.map((j) => (
                    <td key={j} className="text-end">
                      <Placeholder animation="glow">
                        <Placeholder xs={5} />
                      </Placeholder>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>

        {/* Mobile Skeleton */}
        <div className="d-md-none">
          <div className="d-flex flex-column mb-4 rounded border overflow-hidden shadow-sm">
            {/* Income Breakdown Header */}
            <div className="px-3 py-2 bg-light border-bottom text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
              <Placeholder animation="glow"><Placeholder xs={4} /></Placeholder>
            </div>
            
            <div className="bg-white p-3 border-bottom">
              <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5' }}>
                <Placeholder animation="glow" className="mb-2"><Placeholder xs={3} size="sm" /></Placeholder>
                <Placeholder animation="glow" className="mb-1"><Placeholder xs={6} size="lg" /></Placeholder>
                <Placeholder animation="glow"><Placeholder xs={4} size="sm" /></Placeholder>
              </div>
            </div>

            <div className="d-flex flex-column bg-white">
              {skeletonRows.slice(0, 3).map((i) => (
                <div key={`mob-inc-${i}`} className="d-flex align-items-center justify-content-between p-3 border-bottom flex-nowrap gap-2">
                   <div className="d-flex align-items-center gap-2 flex-grow-1">
                     <Placeholder animation="glow"><Placeholder className="rounded-circle" style={{ width: '24px', height: '24px' }} /></Placeholder>
                     <div className="d-flex flex-column flex-grow-1">
                       <Placeholder animation="glow"><Placeholder xs={8} /></Placeholder>
                       <Placeholder animation="glow"><Placeholder xs={4} size="sm" /></Placeholder>
                     </div>
                   </div>
                   <div className="d-flex flex-column align-items-end flex-shrink-0">
                     <Placeholder animation="glow"><Placeholder xs={12} style={{ width: '60px' }} /></Placeholder>
                     <Placeholder animation="glow"><Placeholder xs={12} size="sm" style={{ width: '40px' }} /></Placeholder>
                   </div>
                </div>
              ))}
            </div>

            {/* Expense Breakdown Header */}
            <div className="px-3 py-2 bg-light border-bottom border-top text-uppercase" style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
              <Placeholder animation="glow"><Placeholder xs={4} /></Placeholder>
            </div>
            
            <div className="bg-white p-3 border-bottom">
              <div className="d-flex flex-column p-3 rounded w-100" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2' }}>
                <Placeholder animation="glow" className="mb-2"><Placeholder xs={3} size="sm" /></Placeholder>
                <Placeholder animation="glow" className="mb-1"><Placeholder xs={6} size="lg" /></Placeholder>
                <Placeholder animation="glow"><Placeholder xs={4} size="sm" /></Placeholder>
              </div>
            </div>

            <div className="d-flex flex-column bg-white" style={{ borderBottom: 'none' }}>
              {skeletonRows.slice(0, 4).map((i) => (
                <div key={`mob-exp-${i}`} className="d-flex align-items-center justify-content-between p-3 border-bottom flex-nowrap gap-2">
                   <div className="d-flex align-items-center gap-2 flex-grow-1">
                     <Placeholder animation="glow"><Placeholder className="rounded-circle" style={{ width: '24px', height: '24px' }} /></Placeholder>
                     <div className="d-flex flex-column flex-grow-1">
                       <Placeholder animation="glow"><Placeholder xs={8} /></Placeholder>
                       <Placeholder animation="glow"><Placeholder xs={4} size="sm" /></Placeholder>
                     </div>
                   </div>
                   <div className="d-flex flex-column align-items-end flex-shrink-0">
                     <Placeholder animation="glow"><Placeholder xs={12} style={{ width: '60px' }} /></Placeholder>
                     <Placeholder animation="glow"><Placeholder xs={12} size="sm" style={{ width: '40px' }} /></Placeholder>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  };

  if (loading) {
    return renderSkeleton();
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? 'Failed to load income and expense report'}
      </div>
    );
  }

  const displayCurrency = selectedCurrency || defaultCurrency;
  // Provide an empty fallback if no data exists
  const currentCurrencyData = data.data[displayCurrency] || {
    incomeCategories: [],
    expenseCategories: [],
    totalIncomes: new Array(data.monthNames?.length || numberOfColumns).fill(0),
    totalExpenses: new Array(data.monthNames?.length || numberOfColumns).fill(0),
  };

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
        .incomes-expenses-report .currency-pill {
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          border: 1px solid #dee2e6;
          background-color: #fff;
          color: #6c757d;
        }
        .incomes-expenses-report .currency-pill:hover {
          background-color: #f8f9fa;
        }
        .incomes-expenses-report .currency-pill.active {
          background-color: #212529;
          color: #fff;
          border-color: #212529;
        }
      `}</style>

      {/* Header with Currency Pills and Settings */}
      <div className="d-none d-md-flex align-items-center justify-content-between mb-3">
        {/* Currency Pills - Left */}
        <div className="d-flex gap-2 flex-wrap">
          {sortedCurrencies.length > 1 ? (
            sortedCurrencies.map((currency) => (
              <button
                key={currency}
                className={`currency-pill ${selectedCurrency === currency ? 'active' : ''}`}
                onClick={() => setSelectedCurrency(currency)}
              >
                {currency}
              </button>
            ))
          ) : null}
        </div>

        {/* Settings Dropdown */}
        <Dropdown
          className="d-none d-md-block"
          show={showSettingsDropdown}
          onToggle={(isOpen) => setShowSettingsDropdown(isOpen ?? false)}
        >
          <Dropdown.Toggle
            as="button"
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
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Report settings"
            title="Report settings"
          >
            <RiListSettingsLine size={20} color="#6b7280" />
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
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Sort by
              </span>
            </div>
            <Form.Check
              type="radio"
              id="sort-default"
              name="sortOption"
              label="Default"
              checked={sortOption === 'default'}
              onChange={() => setSortOption('default')}
              style={{ marginBottom: '8px', fontSize: '14px' }}
            />
            <Form.Check
              type="radio"
              id="sort-amount-asc"
              name="sortOption"
              label="Amount (lowest first)"
              checked={sortOption === 'amount_asc'}
              onChange={() => setSortOption('amount_asc')}
              style={{ marginBottom: '8px', fontSize: '14px' }}
            />
            <Form.Check
              type="radio"
              id="sort-amount-desc"
              name="sortOption"
              label="Amount (highest first)"
              checked={sortOption === 'amount_desc'}
              onChange={() => setSortOption('amount_desc')}
              style={{ marginBottom: '8px', fontSize: '14px' }}
            />

            <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />

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
                onChange={(e) => setNumberOfColumns(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <div className="d-flex justify-content-between" style={{ width: '100%', position: 'absolute', left: '16px', right: '16px', bottom: '85px', pointerEvents: 'none' }}>
              </div>
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
      </div>

      {/* Desktop Report Table */}
      {currentCurrencyData && (
        <div className="d-none d-md-block">
          {renderReport(currentCurrencyData, displayCurrency)}
        </div>
      )}

      {/* Mobile Report List (1 column focus) */}
      {currentCurrencyData && (
        <div className="d-md-none">
          {renderMobileList(currentCurrencyData, displayCurrency)}
        </div>
      )}

      {/* Category Transactions Modal */}
      <CategoryTransactionsModal
        show={showModal}
        onHide={handleCloseModal}
        categoryIds={selectedCategory?.ids ?? null}
        categoryName={selectedCategory?.name ?? ''}
        monthType={selectedCategory?.monthType ?? 'current'}
        monthName={selectedCategory?.monthName ?? ''}
        {...(selectedCategory?.monthStartDate && { startDate: selectedCategory.monthStartDate })}
        {...(selectedCategory?.monthEndDate && { endDate: selectedCategory.monthEndDate })}
        {...(displayCurrency && { currency: displayCurrency })}
      />
    </div>
  );
};

export default IncomesExpensesReport;
