'use client';

import React, { useState, useEffect } from 'react';
import { Table, Spinner, Nav } from 'react-bootstrap';
import { FaListUl, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { Icon } from '@/utils/iconResolver';
import { analyticsService, type IncomeExpenseReport, type CategoryReport, type CurrencyReport } from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

interface IncomesExpensesReportProps {
  startDate?: string;
  endDate?: string;
}

const IncomesExpensesReport: React.FC<IncomesExpensesReportProps> = ({ 
  startDate, 
  endDate 
}) => {
  const [data, setData] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const { formatCurrency } = useFormattedCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params: { start_date?: string; end_date?: string } = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        const reportData = await analyticsService.fetchIncomeExpenseReport(params);
        setData(reportData);
        // Set default currency to first available
        const firstCurrency = reportData.currencies[0];
        if (firstCurrency && !selectedCurrency) {
          setSelectedCurrency(firstCurrency);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);

  // Reset currency selection when data changes
  useEffect(() => {
    const firstCurrency = data?.currencies[0];
    if (data && firstCurrency && !data.currencies.includes(selectedCurrency)) {
      setSelectedCurrency(firstCurrency);
    }
  }, [data, selectedCurrency]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
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
          <td className="text-end">
            <span className="d-inline-flex align-items-center gap-1">
              {category.currentMonth > 0 && (
                <FaListUl 
                  className="text-muted" 
                  style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                  title="View transactions"
                />
              )}
              {prefix}{formatCurrency(category.currentMonth, currency)}
            </span>
          </td>
          <td className="text-end">
            <span className="d-inline-flex align-items-center gap-1">
              {category.previousMonth > 0 && (
                <FaListUl 
                  className="text-muted" 
                  style={{ fontSize: '0.875rem', cursor: 'pointer' }}
                  title="View transactions"
                />
              )}
              {prefix}{formatCurrency(category.previousMonth, currency)}
            </span>
          </td>
        </tr>
        {hasChildren && isExpanded && category.subItems?.map((subItem) =>
          renderCategoryRow(subItem, type, currency, true)
        )}
      </React.Fragment>
    );
  };

  const renderReport = (currencyData: CurrencyReport, currency: string) => {
    return (
      <Table responsive bordered hover>
        <thead>
          <tr>
            <th style={{ width: '40%' }}></th>
            <th className="text-center">{data?.currentMonthName}</th>
            <th className="text-center">{data?.previousMonthName}</th>
          </tr>
        </thead>
        <tbody>
          {/* Total Income Row */}
          <tr className="total-row">
            <td><strong>Total Income</strong></td>
            <td className="text-end total-income">
              {formatCurrency(currencyData.totalIncome, currency)}
            </td>
            <td className="text-end total-income">
              {formatCurrency(currencyData.previousTotalIncome, currency)}
            </td>
          </tr>

          {/* Income Categories */}
          {currencyData.incomeCategories.map((category) => renderCategoryRow(category, 'income', currency))}

          {/* Spacer Row */}
          <tr>
            <td colSpan={3} style={{ height: '1rem', padding: 0, border: 'none' }}></td>
          </tr>

          {/* Total Expense Row */}
          <tr className="total-row">
            <td><strong>Total Expense</strong></td>
            <td className="text-end total-expense">
              -{formatCurrency(currencyData.totalExpense, currency)}
            </td>
            <td className="text-end total-expense">
              -{formatCurrency(currencyData.previousTotalExpense, currency)}
            </td>
          </tr>

          {/* Expense Categories */}
          {currencyData.expenseCategories.map((category) => renderCategoryRow(category, 'expense', currency))}
        </tbody>
      </Table>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? 'Failed to load income and expense report'}
      </div>
    );
  }

  if (data.currencies.length === 0) {
    return (
      <div className="alert alert-info" role="alert">
        No transaction data available for this period.
      </div>
    );
  }

  const currentCurrencyData = data.data[selectedCurrency];

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
        .incomes-expenses-report .currency-tabs {
          margin-bottom: 1rem;
        }
        .incomes-expenses-report .currency-tabs .nav-link {
          padding: 0.25rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 50rem;
          color: #6c757d;
          cursor: pointer;
        }
        .incomes-expenses-report .currency-tabs .nav-link.active {
          background-color: #0d6efd;
          color: #fff;
        }
      `}</style>

      {/* Currency Tabs */}
      {data.currencies.length > 1 && (
        <Nav variant="pills" className="currency-tabs gap-1 justify-content-center">
          {data.currencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}

      {/* Report Table */}
      {currentCurrencyData && renderReport(currentCurrencyData, selectedCurrency)}
    </div>
  );
};

export default IncomesExpensesReport;
