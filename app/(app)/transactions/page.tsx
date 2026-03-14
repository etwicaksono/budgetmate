'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Offcanvas, Button } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useTransaction } from '@/contexts/TransactionContext';
import { transactionService, type Transaction } from '@/services/transactionService';
import { FaFilter } from 'react-icons/fa';
import { labelService, type Label } from '@/services/labelService';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { FilterSidebar } from '@/components/FilterSidebar';
import { RecordsHeader, RecordsList, RecordsSkeleton, type GroupedTransactions, type TransactionRecord } from '@/components/Records';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { DebtIncreaseModal } from '@/components/debt/DebtIncreaseModal';
import { RepaymentModal } from '@/components/debt/RepaymentModal';
import { Debt, debtService } from '@/services/debtService';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import { isTransferTransaction, mapTransferAccounts, getModalTransactionType } from '@/utils/transferUtils';

function TransactionsContent() {
  const { openEditModal } = useTransaction();
  const { formatCurrency } = useFormattedCurrency();
  const {
    state: { dateRange, periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Filter state from hook
  const {
    searchTerm,
    setSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedAccounts,
    setSelectedAccounts,
    selectedCurrencies,
    setSelectedCurrencies,
    availableCurrencies,
    sortOption,
    setSortOption,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    filterVisibility,
    setFilterVisibility,
    allCategories,
    selectableAccounts,
    parentCategoryColors,
    categoryTree,
    categoryIcons,
    accountColors,
    accountIcons,
    categories, // Full category objects
    apiAccounts, // Full account objects
  } = useFilterData();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // Totals for ALL filtered transactions (from meta, not just loaded pages)
  const [summaryTotals, setSummaryTotals] = useState<Record<string, number>>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isGlobalSelectAll, setIsGlobalSelectAll] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debt Modals State
  const [showDebtIncreaseModal, setShowDebtIncreaseModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [targetDebt, setTargetDebt] = useState<Debt | null>(null);
  const [targetDebtTransaction, setTargetDebtTransaction] = useState<any>(null);

  // Saved filters
  const { savedFilters, activeFilterId, loading: savedFiltersLoading, saveCurrentFilter, loadFilter, deleteFilter, renameFilter, clearActiveFilter, reorderFilter } = useSavedFilters({
    categories,
    accounts: apiAccounts,
    current: { selectedCategories, selectedAccounts, selectedCurrencies, selectedLabelIds, sortOption },
    dispatchers: { setSelectedCategories, setSelectedAccounts, setSelectedCurrencies, setSelectedLabelIds, setSortOption },
  });

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch labels
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await labelService.fetchLabels();
        setLabels(response.data);
      } catch (error) {
        console.error('Failed to fetch labels:', error);
      }
    };
    loadLabels();
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

  // Transactions are now filtered and sorted by API
  // Just use them directly
  const sortedTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  // Group transactions by date
  const groupedTransactions = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};

    sortedTransactions.forEach((transaction) => {
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
  }, [sortedTransactions, parentCategoryColors, categoryTree]);

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
    if (selectedTransactionIds.size === sortedTransactions.length) {
      setSelectedTransactionIds(new Set());
      setIsGlobalSelectAll(false);
    } else {
      setSelectedTransactionIds(new Set(sortedTransactions.map((t) => t.id)));
    }
  }, [selectedTransactionIds.size, sortedTransactions]);

  // Edit handler following Single Responsibility Principle
  const handleEditRecord = useCallback(async (record: TransactionRecord) => {
    const transaction = transactions.find((t) => t.id === record.id);
    if (!transaction) return;

    // Debt Modal Intercept Logic
    if (transaction.type === 'debt_in' || transaction.type === 'debt_out') {
      if (transaction.debt_id) {
        try {
          const debtDoc = await debtService.getDebtById(transaction.debt_id);
          setTargetDebt(debtDoc);
          setTargetDebtTransaction(transaction);

          if (debtDoc.type === 'lend') {
            if (transaction.type === 'debt_out') {
              setShowDebtIncreaseModal(true);
            } else {
              setShowRepaymentModal(true);
            }
          } else if (debtDoc.type === 'borrow') {
            if (transaction.type === 'debt_in') {
              setShowDebtIncreaseModal(true);
            } else {
              setShowRepaymentModal(true);
            }
          }
          return; // Skip opening the standard transaction modal
        } catch (error) {
          console.error("Failed to load debt for this transaction", error);
          // Fallback to standard edit if debt load fails
        }
      }
    }

    // Debt Modal Intercept Logic
    if (transaction.type === 'debt_in' || transaction.type === 'debt_out') {
      if (transaction.debt_id) {
        try {
          const debtDoc = await debtService.getDebtById(transaction.debt_id);
          setTargetDebt(debtDoc);
          setTargetDebtTransaction(transaction);

          if (debtDoc.type === 'lend') {
            if (transaction.type === 'debt_out') {
              setShowDebtIncreaseModal(true);
            } else {
              setShowRepaymentModal(true);
            }
          } else if (debtDoc.type === 'borrow') {
            if (transaction.type === 'debt_in') {
              setShowDebtIncreaseModal(true);
            } else {
              setShowRepaymentModal(true);
            }
          }
          return; // Skip opening the standard transaction modal
        } catch (error) {
          console.error("Failed to load debt for this transaction", error);
          // Fallback to standard edit if debt load fails
        }
      }
    }

    // Extract label IDs (simple data transformation)
    const labelIds = transaction.labels?.map(label => label.id).filter((id): id is string => !!id) || [];

    // Use utility functions for transfer logic (DRY + KISS)
    const isTransfer = isTransferTransaction(transaction);
    const modalType = getModalTransactionType(transaction);
    const { fromAccountId, toAccountId } = mapTransferAccounts(transaction);

    // For transfers, backend now returns correct to_amount for both transfer_in and transfer_out
    // transfer_out: amount=-source, to_amount=destination
    // transfer_in: amount=+destination, to_amount=source (fixed in backend)
    const sourceAmount = Math.abs(transaction.amount);
    const sourceCurrency = transaction.type === 'transfer_in'
      ? transaction.transfer_currency || transaction.currency
      : transaction.currency;
    const destAmount = transaction.to_amount ? Math.abs(transaction.to_amount) : Math.abs(transaction.amount);
    const destCurrency = transaction.to_currency || transaction.currency;

    // Prepare modal data (single responsibility)
    const modalData = {
      id: transaction.id,
      date: transaction.date,
      account_id: fromAccountId,
      category_id: transaction.category_id || '',
      amount: transaction.type === 'transfer_in' ? destAmount : sourceAmount, // ✅ For transfer_in, use to_amount as source
      type: modalType,
      description: transaction.description || '',
      payee: transaction.payee || '',
      payment_method: transaction.payment_method || 'Cash',
      label_ids: labelIds,
      // Add transfer-specific fields if it's a transfer
      ...(isTransfer && {
        transfer_id: transaction.transfer_id, // ✅ Include transfer ID for editing
        to_account_id: toAccountId,
        to_amount: transaction.type === 'transfer_in' ? sourceAmount : destAmount, // ✅ For transfer_in, swap
        to_currency: destCurrency, // ✅ Destination currency
        currency: sourceCurrency, // ✅ Source currency
      }),
    };

    openEditModal(modalData);
  }, [transactions, openEditModal]);

  // Delete handler
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    const transaction = transactions.find((t) => t.id === recordId);
    if (!transaction) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Transaction',
      html: `
        <p>Are you sure you want to delete this transaction?</p>
        <div class="text-start mt-3">
          <strong>${transaction.description}</strong><br>
          <small class="text-muted">IDR ${Math.abs(transaction.amount).toLocaleString()}</small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await transactionService.deleteTransaction(recordId);
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Transaction deleted successfully',
        timer: 2000,
        showConfirmButton: false
      });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete transaction',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
    }
  }, [transactions, fetchTransactions]);

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
        let payload: any = {};
        
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
              ...(selectedCurrencies.length > 0 && { currencies: selectedCurrencies.join(',') })
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
    const totals: Record<string, number> = {};
    sortedTransactions
      .filter(t => selectedTransactionIds.has(t.id))
      .forEach((t) => {
        const currency = t.currency || 'USD';
        totals[currency] = (totals[currency] || 0) + t.amount;
      });
    return totals;
  }, [sortedTransactions, selectedTransactionIds, summaryTotals]);

  // Format totals for display
  const formatNetTotals = useCallback((totalsByCurrency: Record<string, number>) => {
    return Object.entries(totalsByCurrency)
      .map(([currency, total]) => {
        const formatted = formatCurrency(Math.abs(total), currency);
        const sign = total < 0 ? '-' : total > 0 ? '+' : '';
        return `${sign}${formatted}`;
      })
      .join(' | ');
  }, [formatCurrency]);

  const allSelected = selectedTransactionIds.size > 0 && selectedTransactionIds.size === sortedTransactions.length;

  return (
    <Container fluid>
      <Row>
        {/* Desktop Filter Sidebar */}
        <Col lg={3} className="d-none d-lg-block">
          <FilterSidebar
            title="Transactions"
            filterVisibility={filterVisibility}
            onFilterVisibilityChange={setFilterVisibility}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            allCategories={allCategories}
            categoryTree={categoryTree}
            parentCategoryColors={parentCategoryColors}
            categoryIcons={categoryIcons}
            selectedAccounts={selectedAccounts}
            onSelectedAccountsChange={setSelectedAccounts}
            selectableAccounts={selectableAccounts}
            accountColors={accountColors}
            accountIcons={accountIcons}
            selectedLabelIds={selectedLabelIds}
            onSelectedLabelIdsChange={setSelectedLabelIds}
            labels={labels}
            selectedCurrencies={selectedCurrencies}
            onSelectedCurrenciesChange={setSelectedCurrencies}
            availableCurrencies={availableCurrencies}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            savedFilters={savedFilters}
            activeFilterId={activeFilterId}
            savedFiltersLoading={savedFiltersLoading}
            onSaveFilter={saveCurrentFilter}
            onLoadFilter={loadFilter}
            onDeleteFilter={deleteFilter}
            onRenameFilter={renameFilter}
            onClearActiveFilter={clearActiveFilter}
            onReorderFilter={reorderFilter}
          />
        </Col>

        {/* Mobile Filter Offcanvas */}
        <Offcanvas
          show={showMobileFilters}
          onHide={() => setShowMobileFilters(false)}
          placement="end"
          className="d-lg-none"
        >
          <Offcanvas.Header closeButton className="border-bottom">
            <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="p-0">
            <FilterSidebar
              title="Transactions"
              filterVisibility={filterVisibility}
              onFilterVisibilityChange={setFilterVisibility}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
              allCategories={allCategories}
              categoryTree={categoryTree}
              parentCategoryColors={parentCategoryColors}
              categoryIcons={categoryIcons}
              selectedAccounts={selectedAccounts}
              onSelectedAccountsChange={setSelectedAccounts}
              selectableAccounts={selectableAccounts}
              accountColors={accountColors}
              accountIcons={accountIcons}
              selectedLabelIds={selectedLabelIds}
              onSelectedLabelIdsChange={setSelectedLabelIds}
              labels={labels}
              selectedCurrencies={selectedCurrencies}
              onSelectedCurrenciesChange={setSelectedCurrencies}
              availableCurrencies={availableCurrencies}
              minAmount={minAmount}
              maxAmount={maxAmount}
              onMinAmountChange={setMinAmount}
              onMaxAmountChange={setMaxAmount}
              savedFilters={savedFilters}
              activeFilterId={activeFilterId}
              savedFiltersLoading={savedFiltersLoading}
              onSaveFilter={saveCurrentFilter}
              onLoadFilter={loadFilter}
              onDeleteFilter={deleteFilter}
              onRenameFilter={renameFilter}
              onClearActiveFilter={clearActiveFilter}
              onReorderFilter={reorderFilter}
            />
          </Offcanvas.Body>
        </Offcanvas>

        {/* Main Content */}
        <Col lg={9}>
          {/* Period Navigation */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex justify-content-center align-items-center me-2 flex-grow-1">
              <PeriodNavigation>
                <PeriodRangeSelector
                  label={periodLabel}
                  activePeriod={activePeriod}
                  customRange={customRangeDraft}
                />
              </PeriodNavigation>
            </div>
            {/* Mobile Filter Toggle */}
            <div className="d-lg-none flex-shrink-0">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowMobileFilters(true)}
                className="d-flex align-items-center"
                style={{ padding: '0.375rem 0.5rem', minWidth: '40px', justifyContent: 'center' }}
              >
                <FaFilter size={16} />
              </Button>
            </div>
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
                    className="border-bottom bg-white"
                    style={{ position: 'sticky', top: '65px', zIndex: 100 }}
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

      {/* Debt Specific Modals */}
      <RepaymentModal
        show={showRepaymentModal}
        onHide={() => {
          setShowRepaymentModal(false);
          setTargetDebtTransaction(null);
        }}
        debt={targetDebt}
        onSave={async () => { /* New repayments typically not made from transactions list, handled as edit */ }}
        editTransaction={targetDebtTransaction}
        onEdit={async (debtId, txId, payload) => {
          await debtService.updateRepayment(debtId, txId, payload);
          setShowRepaymentModal(false);
          fetchTransactions(1);
        }}
        accounts={apiAccounts}
      />

      <DebtIncreaseModal
        show={showDebtIncreaseModal}
        onHide={() => {
          setShowDebtIncreaseModal(false);
          setTargetDebtTransaction(null);
        }}
        debt={targetDebt}
        onSave={async () => { /* New increases typically not made from transactions list */ }}
        editTransaction={targetDebtTransaction}
        onEdit={async (debtId, txId, payload) => {
          await debtService.updateIncrease(debtId, txId, payload);
          setShowDebtIncreaseModal(false);
          fetchTransactions(1);
        }}
        accounts={apiAccounts}
      />
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
