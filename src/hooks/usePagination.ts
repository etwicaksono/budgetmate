'use client';

import { useState, useCallback, useMemo } from 'react';

export interface PaginationOptions {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
  maxVisiblePages?: number;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageNumbers: number[];
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
  setItemsPerPage: (items: number) => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  // Combined interface for easier use
}

/**
 * Custom hook for pagination logic
 */
export function usePagination(options: PaginationOptions): UsePaginationReturn {
  const {
    totalItems,
    itemsPerPage: initialItemsPerPage = 10,
    initialPage = 1,
    maxVisiblePages = 5,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);

  // Calculate total pages
  const totalPages = useMemo(
    () => Math.ceil(totalItems / itemsPerPage),
    [totalItems, itemsPerPage]
  );

  // Calculate start and end indices for current page
  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage]
  );

  const endIndex = useMemo(
    () => Math.min(startIndex + itemsPerPage, totalItems),
    [startIndex, itemsPerPage, totalItems]
  );

  // Check if there are next/previous pages
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Generate page numbers for pagination UI
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Calculate range of pages to show
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      // Adjust if we're near the end
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      // Add first page and ellipsis if needed
      if (startPage > 2) {
        pages.push(1);
        if (startPage > 3) {
          pages.push(-1); // -1 represents ellipsis
        }
      } else if (startPage === 2) {
        pages.push(1);
      }

      // Add range of pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      // Add last page and ellipsis if needed
      if (endPage < totalPages - 1) {
        if (endPage < totalPages - 2) {
          pages.push(-2); // -2 represents ellipsis
        }
        pages.push(totalPages);
      } else if (endPage === totalPages - 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(validPage);
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const firstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const setItemsPerPage = useCallback((items: number) => {
    setItemsPerPageState(items);
    // Reset to first page when changing items per page
    setCurrentPage(1);
  }, []);

  return {
    // State
    currentPage,
    itemsPerPage,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    pageNumbers,
    // Actions
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setItemsPerPage,
  };
}

/**
 * Helper function to paginate an array
 */
export function paginateArray<T>(array: T[], startIndex: number, endIndex: number): T[] {
  return array.slice(startIndex, endIndex);
}

/**
 * Helper function to get pagination info text
 */
export function getPaginationInfo(
  currentPage: number,
  itemsPerPage: number,
  totalItems: number
): string {
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);
  
  return `Showing ${start} to ${end} of ${totalItems} items`;
}
