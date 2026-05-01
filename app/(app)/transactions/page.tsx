'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import Swal from 'sweetalert2';

import { transactionService, type Transaction } from '@/services/transactionService';
import { FaFilter } from 'react-icons/fa';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { RecordsHeader, RecordsList, RecordsSkeleton, type GroupedTransactions, type TransactionRecord } from '@/components/Records';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';


import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import { isTransferTransaction } from '@/utils/transferUtils';

import { TransactionFilterSidebar } from './_components/TransactionFilterSidebar';
import { useTransactionActions } from '@/hooks/useTransactionActions';

function TransactionsContent() {
  const { formatCurrency } = useFormattedCurrency();
  const {
    state: { dateRange, periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Filter state from hook
  const filterData = useFilterData();
  const {
    searchTerm,
    selectedCategories,
    selectedAccounts,
    selectedCurrencies,
    sortOption,
    transferOption,
    debtOption,
    minAmount,
    maxAmount,
    parentCategoryColors,
    categoryTree,
    categories, // Full category objects
    apiAccounts, // Full account objects
  } = filterData;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // Totals for ALL filtered transactions (from meta, not just loaded pages)
  const [summaryTotals, setSummaryTotals] = useState<Record<string, { income: number; expense: number; net: number }>>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isGlobalSelectAll, setIsGlobalSelectAll] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  // Saved filters
  const savedFiltersData = useSavedFilters({
    categories,
    accounts: apiAccounts,
    current: { selectedCategories, selectedAccounts, selectedCurrencies, selectedLabelIds, sortOption, transferOption, debtOption },
    dispatchers: { 
      setSelectedCategories: filterData.setSelectedCategories, 
      setSelectedAccounts: filterData.setSelectedAccounts, 
      setSelectedCurrencies: filterData.setSelectedCurrencies, 
      setSelectedLabelIds, 
      setSortOption: filterData.setSortOption, 
      setTransferOption: filterData.setTransferOption, 
      setDebtOption: filterData.setDebtOption 
    },
  });

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const { handleEditRecord, handleDeleteRecord } = useTransactionActions({
    transactions,
    onTransactionMutated: () => fetchTransactions(1),
  });

  // Callback ref for sticky RecordsHeader to attach ResizeObserver safely
  const observerRef = useRef<ResizeObserver | null>(null);
  const handleRecordsHeaderRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node !== null) {
      let lastHeight = 0;
      const update = () => {
        const measured = node.getBoundingClientRect().height;
        const newHeight = Math.round(measured);

        // Only update CSS variable if height changes by >= 1px to prevent 
        // subpixel ResizeObserver infinite loops on mobile (which disables sticky positioning)
        if (Math.abs(newHeight - lastHeight) >= 1) {
          lastHeight = newHeight;
          document.documentElement.style.setProperty(
            '--records-header-height',
            `${newHeight}px`
          );
        }
      };
      update(); // set immediately
      observerRef.current = new ResizeObserver(update);
      observerRef.current.observe(node);
    }
  }, []);
  // Fetch transactions
  const fetchTransactions = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      // Convert date-only format to ISO datetime for API
      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const filters: Record<string, string | number> = {};
      if (startDateTime) filters['start_date'] = startDateTime;
      if (endDateTime) filters['end_date'] = endDateTime;

      // Add search term filter
      if (searchTerm) {
        filters['search'] = searchTerm;
      }

      // Add category filter (use category IDs from selected category names)
      if (selectedCategories.length > 0 && categories.length > 0) {
        const categoryIds = categories
          .filter(cat => selectedCategories.includes(cat.name))
          .map(cat => cat.id);
        if (categoryIds.length > 0) {
          filters['category_ids'] = categoryIds.join(',');
        }
      }

      // Add account filter (use account IDs from selected account names)
      if (selectedAccounts.length > 0 && apiAccounts.length > 0) {
        const accountIds = apiAccounts
          .filter(acc => selectedAccounts.includes(acc.name))
          .map(acc => acc.id);
        if (accountIds.length > 0) {
          filters['account_ids'] = accountIds.join(',');
        }
      }

      // Add label filter (use label IDs directly)
      if (selectedLabelIds.length > 0) {
        filters['label_ids'] = selectedLabelIds.join(',');
      }

      // Add amount range filter
      if (minAmount > 0) {
        filters['min_amount'] = minAmount;
      }
      if (maxAmount < Infinity) {
        filters['max_amount'] = maxAmount;
      }

      // Add currency filter
      if (selectedCurrencies.length > 0) {
        filters['currencies'] = selectedCurrencies.join(',');
      }

      // Add transfer option filter
      if (transferOption) {
        filters['transfer_option'] = transferOption;
      }

      // Add debt option filter
      if (debtOption) {
        filters['debt_option'] = debtOption;
      }

      // Add sort option - convert frontend format to API format
      if (sortOption) {
        switch (sortOption) {
          case 'timeDesc':
            filters['sort_by'] = 'date';
            filters['sort_order'] = 'desc';
            break;
          case 'timeAsc':
            filters['sort_by'] = 'date';
            filters['sort_order'] = 'asc';
            break;
          case 'amountDesc':
            filters['sort_by'] = 'amount';
            filters['sort_order'] = 'desc';
            break;
          case 'amountAsc':
            filters['sort_by'] = 'amount';
            filters['sort_order'] = 'asc';
            break;
          case 'absAmountDesc':
            filters['sort_by'] = 'amount';
            filters['sort_order'] = 'desc';
            break;
          case 'absAmountAsc':
            filters['sort_by'] = 'amount';
            filters['sort_order'] = 'asc';
            break;
        }
      }

      // Add pagination
      filters['page'] = pageNum;

      const result = await transactionService.fetchTransactions(filters);

      if (pageNum === 1) {
        setTransactions(result.transactions);
        // Capture totals from ALL filtered data (not just this page)
        setSummaryTotals(result.meta.totals_by_currency ?? {});
        setTotalRecords(result.meta.total || 0);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }

      const totalPages = result.meta.totalPages || result.meta.total_pages || 1;
      setHasMore(result.meta.page < totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  }, [
    dateRange.start,
    dateRange.end,
    searchTerm,
    selectedCategories,
    selectedAccounts,
    selectedLabelIds,
    selectedCurrencies,
    minAmount,
    maxAmount,
    sortOption,
    transferOption,
    debtOption,
    categories,
    apiAccounts
  ]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = () => fetchTransactions(1);
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [fetchTransactions]);

  // Infinite scroll implementation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting && hasMore && !loading && !isLoadingMore) {
          fetchTransactions(page + 1);
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [observerTarget, hasMore, loading, isLoadingMore, page, fetchTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Check if this is a transfer transaction
      const isTransfer = isTransferTransaction(transaction);

      // Get category color and name
      let categoryColor = '#6c757d';
      let categoryName = 'Uncategorized';
      let categoryIcon = transaction.category?.icon;

      if (isTransfer) {
        // Display as Transfer for transfer transactions
        categoryName = 'Transfer';
        categoryIcon = 'FaExchangeAlt'; // Transfer icon
        categoryColor = '#17a2b8'; // Teal/cyan color for transfers
      } else {
        categoryName = transaction.category?.name || 'Uncategorized';

        // First try parent colors
        categoryColor = parentCategoryColors[categoryName] || '#6c757d';

        // If not found, might be child category - find parent
        if (categoryColor === '#6c757d') {
          for (const [parent, children] of Object.entries(categoryTree)) {
            if (children.includes(categoryName)) {
              categoryColor = parentCategoryColors[parent] || '#6c757d';
              break;
            }
          }
        }
      }

      // Override for Debt transactions
      if (transaction.type === 'debt_in' || transaction.type === 'debt_out') {
        categoryName = transaction.category?.name || 'Debt';
        categoryIcon = 'FaHandshake';
        categoryColor = transaction.type === 'debt_in' ? '#059669' : '#dc3545';
      }

      const record = {
        id: transaction.id,
        date: dateKey,
        time,
        categoryName,
        categoryIcon,
        categoryIconColor: categoryColor,
        accountName: transaction.account?.name || 'Unknown',
        description: transaction.description || 'No description',
        payer: transaction.payee,
        // Use amount as-is from database (already has correct signs):
        // - expenses: negative
        // - income: positive
        // - transfer_out: negative
        // - transfer_in: positive
        amount: transaction.amount,
        currency: transaction.currency,
        type: isTransfer ? 'TRANSFER' : (
          transaction.type === 'debt_in' ? 'DEBT_IN' :
            transaction.type === 'debt_out' ? 'DEBT_OUT' :
              transaction.type === 'income' ? 'INCOME' : 'EXPENSE'
        ),
        debt_id: transaction.debt_id,
        labels: transaction.labels || [],
      } as TransactionRecord;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });

    return grouped;
  }, [transactions, parentCategoryColors, categoryTree]);

  // Selection handlers
  const handleSelectRecord = useCallback((recordId: string) => {
    setSelectedTransactionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
        setIsGlobalSelectAll(false); // Clear global selection when individuals are disabled
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTransactionIds.size === transactions.length) {
      setSelectedTransactionIds(new Set());
      setIsGlobalSelectAll(false);
    } else {
      setSelectedTransactionIds(new Set(transactions.map(t => t.id)));
    }
  }, [transactions, selectedTransactionIds.size]);


  // Bulk action handlers
  const handleBulkEdit = useCallback(() => {
    Swal.fire({
      icon: 'info',
      title: 'Bulk Edit',
      text: isGlobalSelectAll
        ? `Bulk editing ALL ${totalRecords} matching transactions is not yet implemented.`
        : `Bulk editing ${selectedTransactionIds.size} transaction(s) is not yet implemented.`,
      confirmButtonColor: '#0d6efd',
    });
  }, [selectedTransactionIds.size, isGlobalSelectAll, totalRecords]);

  const handleBulkExport = useCallback(() => {
    Swal.fire({
      icon: 'info',
      title: 'Bulk Export',
      text: isGlobalSelectAll
        ? `Exporting ALL ${totalRecords} matching transactions is not yet implemented.`
        : `Exporting ${selectedTransactionIds.size} transaction(s) is not yet implemented.`,
      confirmButtonColor: '#0d6efd',
    });
  }, [selectedTransactionIds.size, isGlobalSelectAll, totalRecords]);

  const handleBulkDelete = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: isGlobalSelectAll ? 'Delete ALL Matching Records' : 'Bulk Delete',
      text: isGlobalSelectAll
        ? `Are you sure you want to permanently delete ALL ${totalRecords} transactions matching your current filters? This cannot be undone.`
        : `Are you sure you want to delete ${selectedTransactionIds.size} transaction(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        let payload: import('@/services/transactionService').BulkDeleteTransactionsRequest = {};

        if (isGlobalSelectAll) {
          const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
          const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

          payload = {
            allMatching: true,
            filters: {
              ...(startDateTime && { start_date: startDateTime }),
              ...(endDateTime && { end_date: endDateTime }),
              ...(searchTerm && { search: searchTerm }),
              ...(selectedCategories.length > 0 && categories.length > 0 && {
                category_ids: categories.filter(cat => selectedCategories.includes(cat.name)).map(cat => cat.id).join(',')
              }),
              ...(selectedAccounts.length > 0 && apiAccounts.length > 0 && {
                account_ids: apiAccounts.filter(acc => selectedAccounts.includes(acc.name)).map(acc => acc.id).join(',')
              }),
              ...(selectedLabelIds.length > 0 && { label_ids: selectedLabelIds.join(',') }),
              ...(minAmount > 0 && { min_amount: minAmount }),
              ...(maxAmount < Infinity && { max_amount: maxAmount }),
              ...(selectedCurrencies.length > 0 && { currencies: selectedCurrencies.join(',') }),
              ...(transferOption && { transfer_option: transferOption }),
              ...(debtOption && { debt_option: debtOption })
            }
          };
        } else {
          payload = {
            allMatching: false,
            ids: Array.from(selectedTransactionIds)
          };
        }

        const res = await transactionService.bulkDeleteTransactions(payload);

        await Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: `Successfully deleted ${res.deletedCount} transaction(s)`,
          timer: 2000,
          showConfirmButton: false
        });

        // Reset state and fetch
        setSelectedTransactionIds(new Set());
        setIsGlobalSelectAll(false);
        fetchTransactions(1);
      } catch (error) {
        console.error('Failed to bulk delete:', error);
        await Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: 'Failed to delete transactions',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545'
        });
      }
    }
  }, [
    selectedTransactionIds,
    isGlobalSelectAll,
    totalRecords,
    dateRange,
    searchTerm,
    selectedCategories,
    categories,
    selectedAccounts,
    apiAccounts,
    selectedLabelIds,
    minAmount,
    maxAmount,
    selectedCurrencies,
    fetchTransactions
  ]);


  // Net totals:
  //   - When nothing selected: use summaryTotals from API meta (covers ALL filtered data)
  //   - When selection active: sum only the selected visible rows, UNLESS it's a global selection
  const netTotalsByCurrency = useMemo(() => {
    const hasSelection = selectedTransactionIds.size > 0;
    if (!hasSelection || isGlobalSelectAll) {
      return summaryTotals;
    }
    // Build income/expense/net from selected visible rows
    const totals: Record<string, { income: number; expense: number; net: number }> = {};
    transactions
      .filter(t => selectedTransactionIds.has(t.id))
      .forEach((t) => {
        const currency = t.currency || 'USD';
        if (!totals[currency]) totals[currency] = { income: 0, expense: 0, net: 0 };
        const amt = t.amount;
        if (t.type === 'income' || t.type === 'debt_in') {
          totals[currency]!.income += amt;
        } else if (t.type === 'expense' || t.type === 'debt_out') {
          totals[currency]!.expense += amt; // already negative
        }
        totals[currency]!.net = totals[currency]!.income + totals[currency]!.expense;
      });
    return totals;
  }, [transactions, selectedTransactionIds, summaryTotals, isGlobalSelectAll]);

  // Format totals for display
  const formatNetTotals = useCallback((totalsByCurrency: Record<string, { income: number; expense: number; net: number }>) => {
    return Object.entries(totalsByCurrency)
      .map(([currency, t]) => {
        const net = t.net;
        const formatted = formatCurrency(Math.abs(net), currency);
        const sign = net > 0 ? '+' : net < 0 ? '-' : '';
        return `${sign}${formatted}`;
      })
      .join(' | ');
  }, [formatCurrency]);

  const allSelected = selectedTransactionIds.size > 0 && selectedTransactionIds.size === transactions.length;

  return (
    <Container fluid>
      <Row>
        <TransactionFilterSidebar
          filterData={filterData}
          savedFiltersData={savedFiltersData}
          showMobile={showMobileFilters}
          onHideMobile={() => setShowMobileFilters(false)}
        />

        {/* Main Content */}
        <Col lg={9} className="p-0">
          {/* Mobile Page Title + Filter Toggle */}
          <div className="d-flex justify-content-between align-items-center mb-2 d-lg-none">
            <h2 className="page-mobile-title">Transactions</h2>
            <Button
              variant="outline-secondary"
              className="d-flex align-items-center justify-content-center p-2 position-relative"
              onClick={() => setShowMobileFilters(true)}
              style={{ width: '36px', height: '36px' }}
              aria-label="Toggle Filters"
            >
              <FaFilter size={14} />
            </Button>
          </div>

          {/* Period Navigation */}
          <div className="d-flex justify-content-center align-items-center mb-3" style={{ position: 'relative', zIndex: 1020 }}>
            <PeriodNavigation>
              <PeriodRangeSelector
                label={periodLabel}
                activePeriod={activePeriod}
                customRange={customRangeDraft}
              />
            </PeriodNavigation>
          </div>

          {/* Transactions Card */}
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              {loading ? (
                <div className="py-2">
                  <RecordsSkeleton />
                </div>
              ) : (
                <>
                  <div
                    ref={handleRecordsHeaderRef}
                    className="border-bottom bg-white"
                    style={{ position: 'sticky', top: 'calc(var(--navbar-height, 73px) - 1px)', zIndex: 1010 }}
                  >
                    <RecordsHeader
                      selectedCount={selectedTransactionIds.size}
                      totalCount={totalRecords}
                      allSelected={allSelected}
                      onSelectAll={handleSelectAll}
                      onBulkEdit={handleBulkEdit}
                      onBulkExport={handleBulkExport}
                      onBulkDelete={handleBulkDelete}
                      summaryText={formatNetTotals(netTotalsByCurrency)}
                      showBulkActions
                      isGlobalSelectAll={isGlobalSelectAll}
                      onSelectGlobal={setIsGlobalSelectAll}
                    />
                  </div>

                  <div>
                    <RecordsList
                      groupedTransactions={groupedTransactions}
                      selectedRecords={selectedTransactionIds}
                      onSelectRecord={handleSelectRecord}
                      onEditRecord={handleEditRecord}
                      onDeleteRecord={handleDeleteRecord}
                      showCheckboxes
                      showDropdownMenu
                    />

                    {/* Infinite Scroll Observer Target */}
                    {hasMore && (
                      <div ref={observerTarget} className="py-4 text-center">
                        {isLoadingMore ? (
                          <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Loading more...</span>
                          </div>
                        ) : (
                          <span className="text-muted small">Scroll to load more</span>
                        )}
                      </div>
                    )}

                    {!hasMore && transactions.length > 0 && (
                      <div className="py-4 text-center text-muted small">
                        End of records
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>


    </Container>
  );
}

const TransactionsPage: React.FC = () => {
  return (
    <PeriodNavigationProvider initialDate={new Date()}>
      <TransactionsContent />
    </PeriodNavigationProvider>
  );
};

export default TransactionsPage;
