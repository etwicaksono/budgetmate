'use client';

import React from 'react';
import { FaSearch } from 'react-icons/fa';
import type { Category } from '@/services/categoryService';
import { getIconComponent } from '@/utils/iconUtils';

interface CategorySelectOptionProps {
  category: Category | null;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Single option in category dropdown
 * Separated for SRP - only renders one option
 */
export const CategorySelectOption: React.FC<CategorySelectOptionProps> = ({
  category,
  isSelected,
  onClick,
}) => {
  if (!category) {
    // "None" option
    return (
      <button
        type="button"
        className={`w-100 border-0 d-flex align-items-center px-3 py-2 ${
          isSelected ? 'bg-light' : 'bg-transparent'
        }`}
        onClick={onClick}
        role="option"
        aria-selected={isSelected}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center me-2"
          style={{ width: 24, height: 24 }}
        >
          —
        </span>
        <span>None</span>
        {isSelected && <FaSearch className="text-success ms-auto" size={14} />}
      </button>
    );
  }

  const Icon = getIconComponent(category.icon);

  return (
    <button
      type="button"
      className={`w-100 border-0 d-flex align-items-center px-3 py-2 ${
        isSelected ? 'bg-light' : 'bg-transparent'
      }`}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
    >
      <span
        className="d-inline-flex align-items-center justify-content-center rounded-circle me-2 flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          backgroundColor: category.color || '#6c757d',
          color: '#fff',
        }}
      >
        <Icon size={12} />
      </span>
      <span className="text-truncate">{category.name}</span>
      {isSelected && <FaSearch className="text-success ms-auto" size={14} />}
    </button>
  );
};

export default CategorySelectOption;
