import React, { useState, useEffect, createElement } from 'react';
import type { ComponentType } from 'react';
import { Table, Spinner } from 'react-bootstrap';
import {
  FaListUl,
  FaChevronDown,
  FaChevronRight,
  FaBriefcase,
  FaWallet,
  FaGift,
  FaReceipt,
  FaTicketAlt,
  FaHome,
  FaTag,
  FaChartLine,
  FaMoneyBillAlt,
  FaUtensils,
  FaShoppingCart,
  FaCar,
  FaTheaterMasks,
  FaMobileAlt,
  FaCreditCard,
  FaClipboard,
  FaQuestionCircle,
  FaMoneyBillWave,
  FaCoins,
  FaExchangeAlt
} from 'react-icons/fa';
import type { IconBaseProps } from 'react-icons';
import analyticsService, { IncomeExpenseReport } from '../../../services/analyticsService';
import CategoryTransactionsModal from './CategoryTransactionsModal';

interface IncomesExpensesReportProps {
  currentMonth: string;
}

type IconRenderable = ComponentType<IconBaseProps>;

// Icon mapping helper
const iconMap: Record<string, IconRenderable> = {
  FaBriefcase: FaBriefcase,
  FaWallet: FaWallet,
  FaGift: FaGift,
  FaReceipt: FaReceipt,
  FaMoneyBillWave: FaMoneyBillWave,
  FaCoins: FaCoins,
  FaTicketAlt: FaTicketAlt,
  FaHome: FaHome,
  FaExchangeAlt: FaExchangeAlt,
  FaTag: FaTag,
  FaChartLine: FaChartLine,
  FaMoneyBillAlt: FaMoneyBillAlt,
  FaUtensils: FaUtensils,
  FaShoppingCart: FaShoppingCart,
  FaCar: FaCar,
  FaTheaterMasks: FaTheaterMasks,
  FaMobileAlt: FaMobileAlt,
  FaCreditCard: FaCreditCard,
  FaClipboard: FaClipboard,
  FaQuestionCircle: FaQuestionCircle,
};

const IncomesExpensesReport: React.FC<IncomesExpensesReportProps> = ({ currentMonth }) => {
  const [data, setData] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    monthType: 'current' | 'previous';
    monthName: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const reportData = await analyticsService.fetchIncomeExpenseReport();
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const renderIcon = (iconName: string, props: IconBaseProps = {}): React.ReactNode => {
    const IconComponent = iconMap[iconName];
    if (!IconComponent) {
      return null;
    }
    return createElement(IconComponent, props);
  };

  const handleShowTransactions = (
    categoryId: string,
    categoryName: string,
    monthType: 'current' | 'previous',
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    const monthName = monthType === 'current' ? data?.currentMonthName : data?.previousMonthName;
    setSelectedCategory({
      id: categoryId,
      name: categoryName,
      monthType,
      monthName: monthName || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCategory(null);
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
        {error || 'Failed to load income and expense report'}
      </div>
    );
  }

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
        .incomes-expenses-report .category-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .incomes-expenses-report .category-icon {
          font-size: 1.25rem;
        }
        .incomes-expenses-report .amount-cell {
          text-align: right;
          white-space: nowrap;
        }
        .incomes-expenses-report .amount-with-icon {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .incomes-expenses-report .currency-icon {
          font-size: 0.875rem;
          color: #6c757d;
          cursor: pointer;
          transition: color 0.2s;
        }
        .incomes-expenses-report .currency-icon:hover {
          color: #495057;
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
        .incomes-expenses-report .section-header {
          background-color: #ffffff;
          border-bottom: 2px solid #dee2e6;
        }
        .incomes-expenses-report .parent-row {
          cursor: pointer;
          user-select: none;
        }
        .incomes-expenses-report .parent-row:hover {
          background-color: #f8f9fa;
        }
        .incomes-expenses-report .chevron-icon {
          margin-right: 0.5rem;
          font-size: 0.875rem;
          color: #6c757d;
        }
        .incomes-expenses-report .child-row {
          background-color: #fafbfc;
        }
        .incomes-expenses-report .child-row .category-name {
          padding-left: 2rem;
        }
        .incomes-expenses-report .child-row .category-icon {
          font-size: 1rem;
        }
      `}</style>

      <Table responsive bordered hover>
        <thead>
          <tr>
            <th style={{ width: '40%' }}></th>
            <th className="text-center">{data.currentMonthName}</th>
            <th className="text-center">{data.previousMonthName}</th>
          </tr>
        </thead>
        <tbody>
          {/* Total Income Row */}
          <tr className="total-row">
            <td>
              <div className="category-name">
                <span className="fw-bold">Total Income</span>
              </div>
            </td>
            <td className="amount-cell total-income">
              <span className="amount-with-icon">
                IDR {formatCurrency(data.totalIncome)}
              </span>
            </td>
            <td className="amount-cell total-income">
              <span className="amount-with-icon">
                IDR {formatCurrency(data.previousTotalIncome)}
              </span>
            </td>
          </tr>

          {/* Income Categories */}
          {data.incomeCategories.map((category) => (
            <React.Fragment key={category.id}>
              <tr
                className={category.hasSubItems ? 'parent-row' : ''}
                onClick={() => category.hasSubItems && toggleCategory(category.id)}
              >
                <td>
                  <div className="category-name">
                    {category.hasSubItems && (
                      <span className="chevron-icon">
                        {expandedCategories.has(category.id) ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
                    )}
                    <span className="category-icon">{renderIcon(category.icon)}</span>
                    <span>{category.name}</span>
                  </div>
                </td>
                <td className="amount-cell">
                  <span className="amount-with-icon">
                    {category.currentMonth > 0 && (
                      <FaListUl 
                        className="currency-icon" 
                        onClick={(e) => handleShowTransactions(category.id, category.name, 'current', e)}
                        title="View transactions"
                      />
                    )}
                    IDR {formatCurrency(category.currentMonth)}
                  </span>
                </td>
                <td className="amount-cell">
                  <span className="amount-with-icon">
                    {category.previousMonth > 0 && (
                      <FaListUl 
                        className="currency-icon"
                        onClick={(e) => handleShowTransactions(category.id, category.name, 'previous', e)}
                        title="View transactions"
                      />
                    )}
                    IDR {formatCurrency(category.previousMonth)}
                  </span>
                </td>
              </tr>

              {/* Child Categories */}
              {category.hasSubItems && expandedCategories.has(category.id) && category.subItems &&
                category.subItems.map((subItem) => (
                  <tr key={subItem.id} className="child-row">
                    <td>
                      <div className="category-name">
                        {subItem.icon && <span className="category-icon">{renderIcon(subItem.icon)}</span>}
                        <span>{subItem.name}</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-with-icon">
                        {subItem.currentMonth > 0 && (
                          <FaListUl 
                            className="currency-icon"
                            onClick={(e) => handleShowTransactions(subItem.id, subItem.name, 'current', e)}
                            title="View transactions"
                          />
                        )}
                        IDR {formatCurrency(subItem.currentMonth)}
                      </span>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-with-icon">
                        {subItem.previousMonth > 0 && (
                          <FaListUl 
                            className="currency-icon"
                            onClick={(e) => handleShowTransactions(subItem.id, subItem.name, 'previous', e)}
                            title="View transactions"
                          />
                        )}
                        IDR {formatCurrency(subItem.previousMonth)}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </React.Fragment>
          ))}

          {/* Spacer Row */}
          <tr>
            <td colSpan={3} style={{ height: '1rem', padding: 0, border: 'none' }}></td>
          </tr>

          {/* Total Expense Row */}
          <tr className="total-row">
            <td>
              <div className="category-name">
                <span className="fw-bold">Total Expense</span>
              </div>
            </td>
            <td className="amount-cell total-expense">
              <span className="amount-with-icon">
                -IDR {formatCurrency(data.totalExpense)}
              </span>
            </td>
            <td className="amount-cell total-expense">
              <span className="amount-with-icon">
                -IDR {formatCurrency(data.previousTotalExpense)}
              </span>
            </td>
          </tr>

          {/* Expense Categories */}
          {data.expenseCategories.map((category) => (
            <React.Fragment key={category.id}>
              <tr
                className={category.hasSubItems ? 'parent-row' : ''}
                onClick={() => category.hasSubItems && toggleCategory(category.id)}
              >
                <td>
                  <div className="category-name">
                    {category.hasSubItems && (
                      <span className="chevron-icon">
                        {expandedCategories.has(category.id) ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
                    )}
                    <span className="category-icon">{renderIcon(category.icon)}</span>
                    <span>{category.name}</span>
                  </div>
                </td>
                <td className="amount-cell">
                  <span className="amount-with-icon">
                    {category.currentMonth > 0 && (
                      <FaListUl 
                        className="currency-icon"
                        onClick={(e) => handleShowTransactions(category.id, category.name, 'current', e)}
                        title="View transactions"
                      />
                    )}
                    -IDR {formatCurrency(category.currentMonth)}
                  </span>
                </td>
                <td className="amount-cell">
                  <span className="amount-with-icon">
                    {category.previousMonth > 0 && (
                      <FaListUl 
                        className="currency-icon"
                        onClick={(e) => handleShowTransactions(category.id, category.name, 'previous', e)}
                        title="View transactions"
                      />
                    )}
                    -IDR {formatCurrency(category.previousMonth)}
                  </span>
                </td>
              </tr>

              {/* Child Categories */}
              {category.hasSubItems && expandedCategories.has(category.id) && category.subItems &&
                category.subItems.map((subItem) => (
                  <tr key={subItem.id} className="child-row">
                    <td>
                      <div className="category-name">
                        {subItem.icon && <span className="category-icon">{renderIcon(subItem.icon)}</span>}
                        <span>{subItem.name}</span>
                      </div>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-with-icon">
                        {subItem.currentMonth > 0 && (
                          <FaListUl 
                            className="currency-icon"
                            onClick={(e) => handleShowTransactions(subItem.id, subItem.name, 'current', e)}
                            title="View transactions"
                          />
                        )}
                        -IDR {formatCurrency(subItem.currentMonth)}
                      </span>
                    </td>
                    <td className="amount-cell">
                      <span className="amount-with-icon">
                        {subItem.previousMonth > 0 && (
                          <FaListUl 
                            className="currency-icon"
                            onClick={(e) => handleShowTransactions(subItem.id, subItem.name, 'previous', e)}
                            title="View transactions"
                          />
                        )}
                        -IDR {formatCurrency(subItem.previousMonth)}
                      </span>
                    </td>
                  </tr>
                ))
              }
            </React.Fragment>
          ))}
        </tbody>
      </Table>

      {/* Transaction Modal */}
      <CategoryTransactionsModal
        show={showModal}
        onHide={handleCloseModal}
        categoryId={selectedCategory?.id || null}
        categoryName={selectedCategory?.name || ''}
        monthType={selectedCategory?.monthType || 'current'}
        monthName={selectedCategory?.monthName || ''}
      />
    </div>
  );
};

export default IncomesExpensesReport;
