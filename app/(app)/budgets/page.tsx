'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Button, Form, ListGroup } from 'react-bootstrap';
import { FaPlus, FaSearch, FaGift, FaChevronRight, FaEdit } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { categoryService, Category } from '@/services/categoryService';
import { budgetService, CategoryBudget } from '@/services/budgetService';
import { BudgetConfigModal } from '@/components/budgets/BudgetConfigModal';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

type FilterType = 'all' | 'monthly' | 'annual' | 'both';

export default function BudgetsPage(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  const [loading, setLoading] = useState<boolean>(true);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>(undefined);
  
  const { formatCurrency } = useFormattedCurrency();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, budRes] = await Promise.all([
        categoryService.fetchCategories(),
        budgetService.fetchBudgets()
      ]);
      setCategories(catRes.data.filter(c => c.type === 'expense' || c.type === 'both'));
      setBudgets(budRes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);
  
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
      
      // Filter children by type
      if (filterType !== 'all') {
        children = children.filter(child => {
          if (filterType === 'monthly') return child.hasMonthly && !child.hasAnnual;
          if (filterType === 'annual') return !child.hasMonthly && child.hasAnnual;
          if (filterType === 'both') return child.hasMonthly && child.hasAnnual;
          return true;
        });
      }

      // See if parent matches type filter
      let parentMatchesType = true;
      if (filterType !== 'all') {
        if (filterType === 'monthly') parentMatchesType = parentItem.hasMonthly && !parentItem.hasAnnual;
        else if (filterType === 'annual') parentMatchesType = !parentItem.hasMonthly && parentItem.hasAnnual;
        else if (filterType === 'both') parentMatchesType = parentItem.hasMonthly && parentItem.hasAnnual;
      }

      // Check search search term
      const parentNameMatches = parentItem.category.name.toLowerCase().includes(searchLower);
      const childMatches = children.filter(c => c.category.name.toLowerCase().includes(searchLower));

      // Determine final children to render
      let finalChildren = children;
      if (searchLower) {
        finalChildren = childMatches;
      }

      // Parent is kept if it matches constraints itself OR if it has children that match constraints
      const hasMatchingChildren = finalChildren.length > 0;
      const matchesSearch = !searchLower || parentNameMatches || hasMatchingChildren;
      
      return {
        ...parentItem,
        children: finalChildren,
        shouldRender: (parentMatchesType && matchesSearch) || hasMatchingChildren
      };
    }).filter(parent => parent.shouldRender);

  }, [combinedData, searchTerm, filterType]);


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

  const handleAddNew = () => {
    setEditingCategoryId(undefined);
    setShowModal(true);
  };

  const handleEdit = (categoryId: string) => {
    setEditingCategoryId(categoryId);
    setShowModal(true);
  };

  const handleModalHide = () => {
    setShowModal(false);
    loadData(); // Reload data after modal closes to refresh changes
  };

  const formatAmount = (val: number, currency: string) => {
    return formatCurrency(val, currency);
  };

  const renderBudgetItem = (item: any, isChild = false) => {
    const IconComponent = getIconComponent(item.category.icon || 'FaGift');
    const categoryColor = item.category.color || '#6c757d';
    const currency = item.budget?.currency || 'IDR';
    const hasChildren = !isChild && item.children && item.children.length > 0;

    return (
      <div 
        className={`d-flex justify-content-between align-items-center w-100 px-3 py-2 ${isChild ? 'bg-light border-top' : ''}`}
        style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
        onClick={(e) => {
          if (!isChild && hasChildren) {
            toggleCategory(e, item.category.id);
          } else {
            handleEdit(item.category.id);
          }
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bs-light)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isChild ? 'var(--bs-light)' : 'transparent')}
      >
        <div className="d-flex align-items-center flex-grow-1" style={{ maxWidth: '30%' }}>
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
          <span className="fw-semibold">{item.category.name}</span>
        </div>

        <div className="d-flex justify-content-end align-items-center flex-grow-1 pe-3" style={{ gap: '4rem' }}>
          <div className="text-end" style={{ minWidth: '140px' }}>
            <div className="text-muted text-uppercase text-xs" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Monthly Limit</div>
            <div className="fw-medium">
              {formatAmount(item.basicMonthly, currency)} 
              {item.extendMonthly > 0 && (
                <span className="text-warning ms-1 text-sm">
                  (+{formatAmount(item.extendMonthly, currency)})
                </span>
              )}
            </div>
          </div>

          <div className="text-end" style={{ minWidth: '140px' }}>
            <div className="text-muted text-uppercase text-xs" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Annual Limit</div>
            <div className="fw-medium">
              {formatAmount(item.basicAnnual, currency)}
              {item.extendAnnual > 0 && (
                <span className="text-warning ms-1 text-sm">
                  (+{formatAmount(item.extendAnnual, currency)})
                </span>
              )}
            </div>
          </div>

          <div className="text-muted ms-2" style={{ width: '20px', opacity: 0.5 }}>
            {(!hasChildren || isChild) && <FaEdit size={14} />}
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
          <Button variant="success" onClick={handleAddNew}>
            <FaPlus className="me-2" size={12} />
            Manage Budgets
          </Button>
        </div>

        <Row className="mb-4">
          <Col md={8}>
            <Form.Group className="search-form">
              <div className="position-relative w-100">
                <Form.Control
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2rem' }}
                />
                <span className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted">
                  <FaSearch size={14} />
                </span>
              </div>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value as FilterType)}
            >
              <option value="all">All Budgets</option>
              <option value="monthly">Monthly Only</option>
              <option value="annual">Annual Only</option>
              <option value="both">Both Monthly and Annual</option>
            </Form.Select>
          </Col>
        </Row>
      </section>

      <section>
        <div className="categories-list">
          {loading ? (
            <div className="py-5 text-center text-muted">Loading budgets...</div>
          ) : parentItems.length === 0 ? (
            <div className="py-5 text-center text-muted">No configuration found.</div>
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
