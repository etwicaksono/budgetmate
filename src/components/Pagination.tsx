'use client';

import React from 'react';
import { Pagination as BsPagination, Form } from 'react-bootstrap';
import type { UsePaginationReturn } from '../hooks/usePagination';

interface PaginationProps {
  pagination: UsePaginationReturn;
  showSizeSelector?: boolean;
  sizeOptions?: number[];
  showInfo?: boolean;
  className?: string;
}

/**
 * Pagination component with page navigation and size selector
 */
export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  showSizeSelector = true,
  sizeOptions = [10, 20, 50, 100],
  showInfo = true,
  className = '',
}) => {
  const {
    currentPage,
    totalPages,
    itemsPerPage,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    pageNumbers,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setItemsPerPage,
  } = pagination;

  // Don't render if no pages
  if (totalPages === 0) {
    return null;
  }

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
  };

  return (
    <div className={`d-flex justify-content-between align-items-center ${className}`}>
      {/* Page info and size selector */}
      <div className="d-flex align-items-center gap-3">
        {showInfo && (
          <span className="text-muted small">
            Showing {startIndex + 1} to {endIndex} of {totalPages * itemsPerPage} items
          </span>
        )}
        
        {showSizeSelector && (
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="page-size" className="text-muted small mb-0">
              Items per page:
            </label>
            <Form.Select
              id="page-size"
              size="sm"
              value={itemsPerPage}
              onChange={handleSizeChange}
              style={{ width: 'auto' }}
            >
              {sizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Form.Select>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <BsPagination className="mb-0">
        <BsPagination.First
          onClick={firstPage}
          disabled={!hasPreviousPage}
          aria-label="Go to first page"
        />
        <BsPagination.Prev
          onClick={previousPage}
          disabled={!hasPreviousPage}
          aria-label="Go to previous page"
        />

        {pageNumbers.map((pageNum, index) => {
          if (pageNum === -1 || pageNum === -2) {
            // Render ellipsis
            return (
              <BsPagination.Ellipsis
                key={`ellipsis-${index}`}
                disabled
                aria-label="More pages"
              />
            );
          }

          return (
            <BsPagination.Item
              key={pageNum}
              active={pageNum === currentPage}
              onClick={() => goToPage(pageNum)}
              aria-label={`Go to page ${pageNum}`}
            >
              {pageNum}
            </BsPagination.Item>
          );
        })}

        <BsPagination.Next
          onClick={nextPage}
          disabled={!hasNextPage}
          aria-label="Go to next page"
        />
        <BsPagination.Last
          onClick={lastPage}
          disabled={!hasNextPage}
          aria-label="Go to last page"
        />
      </BsPagination>
    </div>
  );
};

/**
 * Simple pagination component with just prev/next buttons
 */
export const SimplePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}> = ({ currentPage, totalPages, onPageChange, className = '' }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`d-flex justify-content-center align-items-center gap-3 ${className}`}>
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        Previous
      </button>
      
      <span className="text-muted">
        Page {currentPage} of {totalPages}
      </span>
      
      <button
        className="btn btn-sm btn-outline-primary"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
