'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Form, ListGroup } from 'react-bootstrap';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaSearch,
  FaGift,
} from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import Swal from 'sweetalert2';
import '@/components/Records/Records.css';
import '../../categories/Categories.css';
import { categoryService, Category, CreateCategoryPayload, UpdateCategoryPayload } from '@/services/categoryService';
import { CategoryModal } from '@/components/category';

export function CategoriesSection(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const filteredCategories = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const parentCategories = categories.filter(cat => !cat.parent_id);

    return parentCategories
      .map(parent => {
        const children: Category[] = categories.filter(
          cat => cat.parent_id === parent.id &&
            (cat.name.toLowerCase().includes(searchLower) || parent.name.toLowerCase().includes(searchLower))
        );
        return {
          ...parent,
          children,
          matchesSearch: parent.name.toLowerCase().includes(searchLower) || children.length > 0,
        };
      })
      .filter(parent => parent.matchesSearch);
  }, [categories, searchTerm]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoryService.fetchCategories();
      setCategories(response.data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Failed to load categories');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleSaveCategory = async (data: {
    name: string;
    type: 'income' | 'expense' | 'both';
    analytic_flag?: 'income' | 'expense';
    nature: 'WANT' | 'NEED' | 'MUST';
    icon: string;
    color: string;
    parent_id: string | null;
    is_active: boolean;
  }) => {
    try {
      if (modalMode === 'edit' && editingCategory) {
        const payload: UpdateCategoryPayload = {
          name: data.name.trim(),
          type: data.type,
          ...(data.analytic_flag ? { analytic_flag: data.analytic_flag } : {}),
          nature: data.nature,
          icon: data.icon,
          ...(data.parent_id ? {} : { color: data.color }),
          parent_id: data.parent_id,
          is_active: data.is_active,
        };

        await categoryService.updateCategory(editingCategory.id, payload);
        setSuccessMessage('Category updated successfully');
      } else {
        const payload: CreateCategoryPayload = {
          name: data.name.trim(),
          type: data.type,
          ...(data.analytic_flag ? { analytic_flag: data.analytic_flag } : {}),
          nature: data.nature,
          icon: data.icon,
          ...(data.parent_id ? {} : { color: data.color }),
          parent_id: data.parent_id,
          is_active: data.is_active,
        };

        await categoryService.createCategory(payload);
        setSuccessMessage('Category created successfully');
      }

      await loadCategories();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      const err = error as Error;
      throw new Error(err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    const hasChildren = categories.some(cat => cat.parent_id === categoryId);

    const { isConfirmed } = await Swal.fire({
      title: 'Delete category?',
      text: hasChildren
        ? `Deleting "${category.name}" will also remove all of its subcategories.`
        : `You are about to delete "${category.name}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      focusCancel: true,
    });

    if (!isConfirmed) return;

    try {
      await Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      await categoryService.deleteCategory(categoryId);
      await loadCategories();

      Swal.close();
      setSuccessMessage('Category deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      const err = error as Error;
      Swal.fire({
        title: 'Delete failed',
        text: err.message || 'Failed to delete category',
        icon: 'error',
        confirmButtonColor: '#0d6efd',
      });
    }
  };

  const handleOpenEdit = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    setEditingCategory(category);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setModalMode('add');
    setShowModal(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    const parent = categories.find(cat => cat.id === parentId);
    if (!parent) return;

    setEditingCategory({
      parent_id: parentId,
      type: parent.type,
      color: parent.color || '#dc3545',
    } as Category);
    setModalMode('add');
    setShowModal(true);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getIconComponent = (iconKey: string): IconType => {
    const IconComponent = (FaIcons as Record<string, IconType>)[iconKey];
    return IconComponent || FaGift;
  };

  const renderCategoryItem = (category: Category & { children: Category[] }) => {
    const IconComponent = getIconComponent(category.icon || 'FaGift');
    const hasChildren = category.children && category.children.length > 0;
    const categoryColor = category.color || '#dc3545';

    return (
      <ListGroup.Item key={category.id} className="category-item">
        <div className="category-item__header">
          <div
            className={`category-item__content ${hasChildren ? 'has-children' : ''}`}
            onClick={() => hasChildren && toggleCategory(category.id)}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          >
            <div className="category-item__info">
              {hasChildren && (
                <FaChevronRight
                  className={`category-item__arrow ${expandedCategories[category.id] ? 'expanded' : ''}`}
                  size={14}
                />
              )}
              <div className="category-item__icon" style={{ backgroundColor: categoryColor }}>
                <IconComponent size={16} color="#fff" />
              </div>
              <span className="category-item__name">{category.name}</span>
            </div>
            <div
              className="records-item-actions d-none d-md-flex align-items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="records-action-btn text-secondary"
                onClick={() => handleOpenEdit(category.id)}
                title="Edit Category"
              >
                <FaEdit size={14} />
                <span>Edit</span>
              </button>
              <button
                className="records-action-btn text-secondary"
                onClick={() => handleAddSubcategory(category.id)}
                title="Add Subcategory"
              >
                <FaPlus size={14} />
                <span>Add</span>
              </button>
              <button
                className="records-action-btn text-danger"
                onClick={() => void handleDeleteCategory(category.id)}
                title="Delete Category"
              >
                <FaTrash size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {hasChildren && expandedCategories[category.id] && (
          <ListGroup className="category-children">
            {(category.children as Category[]).map((childData) => {
              const ChildIconComponent = getIconComponent(childData.icon || 'FaGift');
              const childColor = childData.color || categoryColor;

              return (
                <ListGroup.Item key={childData.id} className="category-item category-item--child">
                  <div className="category-item__content">
                    <div className="category-item__info">
                      <div className="category-item__icon" style={{ backgroundColor: childColor }}>
                        <ChildIconComponent size={16} color="#fff" />
                      </div>
                      <span className="category-item__name">{childData.name}</span>
                    </div>
                    <div
                      className="records-item-actions d-none d-md-flex align-items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="records-action-btn text-secondary"
                        onClick={() => handleOpenEdit(childData.id)}
                        title="Edit Category"
                      >
                        <FaEdit size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        className="records-action-btn text-danger"
                        onClick={() => void handleDeleteCategory(childData.id)}
                        title="Delete Category"
                      >
                        <FaTrash size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </ListGroup.Item>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Categories</h2>
        <Button variant="success" onClick={handleAddNew}>
          <FaPlus className="me-2" size={12} />
          Add Category
        </Button>
      </div>

      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {successMessage}
          <button type="button" className="btn-close" onClick={() => setSuccessMessage('')}></button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {errorMessage}
          <button type="button" className="btn-close" onClick={() => setErrorMessage('')}></button>
        </div>
      )}

      <div className="d-flex justify-content-start">
        <Form.Group className="mb-4 search-form">
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
      </div>

      <CategoryModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleSaveCategory}
        {...(editingCategory && {
          initialData: {
            name: editingCategory.name || '',
            type: editingCategory.type || 'expense',
            analytic_flag: (editingCategory as any).analytic_flag || 'expense',
            nature: editingCategory.nature || 'WANT',
            icon: editingCategory.icon || 'FaGift',
            color: editingCategory.color || '#dc3545',
            parent_id: editingCategory.parent_id || null,
            is_active: editingCategory.is_active !== undefined ? editingCategory.is_active : true,
          }
        })}
        mode={modalMode}
        categories={categories}
        {...(editingCategory?.id && { excludeId: editingCategory.id })}
      />

      <div className="categories-list">
        {loading ? (
          <div className="py-5 text-center text-muted">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-5 text-center text-muted">No categories available.</div>
        ) : (
          <ListGroup>
            {filteredCategories.map(category => renderCategoryItem(category))}
          </ListGroup>
        )}
      </div>
    </div>
  );
}
