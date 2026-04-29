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

function BudgetsPageContent(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');

  const { user } = useAuth();
  const { state: { activePeriod, periodLabel } } = usePeriodNavigation();
  const selectedMonth = activePeriod.month !== undefined ? activePeriod.month + 1 : new Date().getMonth() + 1;
  const selectedYear = activePeriod.year !== undefined ? activePeriod.year : new Date().getFullYear();

  const [sortBy, setSortBy] = useState<string>('name'); // 'name' | 'monthly_asc' | 'monthly_desc' | 'annual_asc' | 'annual_desc'

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
    loadData(); // Reload data after modal closes to refresh changes
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

        <Row className="mb-4 g-3 align-items-center">
          <Col md={5}>
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
          <Col md={3}>
            <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-100">
              <option value="name">Alphabetical</option>
              <option value="monthly_asc">Monthly Pace Amount (Asc)</option>
              <option value="monthly_desc">Monthly Pace Amount (Desc)</option>
              <option value="annual_asc">Annual Pace Amount (Asc)</option>
              <option value="annual_desc">Annual Pace Amount (Desc)</option>
            </Form.Select>
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
