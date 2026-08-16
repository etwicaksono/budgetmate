'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import Swal from 'sweetalert2';

import { transactionService, type Transaction, type TransactionFilters, type BulkUpdateTransactionsRequest } from '@/services/transactionService';
import { FaFilter } from 'react-icons/fa';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { RecordsHeader, RecordsList, RecordsSkeleton, type GroupedTransactions, type TransactionRecord } from '@/components/Records';


import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import { isTransferTransaction } from '@/utils/transferUtils';

import { TransactionFilterSidebar } from './_components/TransactionFilterSidebar';
import { BulkEditModal, type BulkEditValues } from './_components/BulkEditModal';
import { useTransactionActions } from '@/hooks/useTransactionActions';
import { logError } from '@/lib/logger';

function TransactionsContent() {
  const {
    state: { dateRange, periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Filter state from hook
  const filterData = useFilterData();
  const {
    searchTerm,
    debouncedSearchTerm,
    selectedCategories,
    selectedAccounts,
    selectedLabelIds,
    setSelectedLabelIds,
    excludedLabelIds,
    setExcludedLabelIds,
    sortOption,
    transferOption,
    debtOption,
    draftOption,
    minAmount,
    maxAmount,
    parentCategoryColors,
    categoryTree,
    categories, // Full category objects
    apiAccounts, // Full account objects
    labels, // Full label objects
  } = filterData;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isGlobalSelectAll, setIsGlobalSelectAll] = useState(false);
  const netTotal = useMemo(() => transactions.reduce((sum, transaction) => sum + transaction.amount, 0), [transactions]);
  const selectedNetTotal = useMemo(() => {
    if (selectedTransactionIds.size > 0 && !isGlobalSelectAll) {
      return transactions
        .filter(transaction => selectedTransactionIds.has(transaction.id))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }

    return netTotal;
  }, [transactions, selectedTransactionIds, isGlobalSelectAll, netTotal]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  // Saved filters
  const savedFiltersData = useSavedFilters({
    categories,
    accounts: apiAccounts,
    current: { selectedCategories, selectedAccounts, selectedLabelIds, excludedLabelIds, sortOption, transferOption, debtOption, draftOption },
    dispatchers: { 
      setSelectedCategories: filterData.setSelectedCategories, 
      setSelectedAccounts: filterData.setSelectedAccounts, 
      setSelectedLabelIds, 
      setExcludedLabelIds,
      setSortOption: filterData.setSortOption, 
      setTransferOption: filterData.setTransferOption, 
      setDebtOption: filterData.setDebtOption,
      setDraftOption: filterData.setDraftOption
    },
  });

  // Ref for infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);
  // Generation counter: each new fetchTransactions(1) call increments this.
  // Responses belonging to a superseded generation are silently discarded.
  const fetchGenerationRef = useRef(0);

  const { handleEditRecord, handleDeleteRecord, handleCloneAsDraft, handleConfirmDraft } = useTransactionActions({
    transactions
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
    // Fix 3: reset hasMore immediately on a fresh query so the IntersectionObserver
    // cannot race and trigger a page+1 append before the new page-1 response arrives.
    if (pageNum === 1) {
      setHasMore(false);
      setPage(1);
    }

    // Fix 2: stamp this invocation; bail out if a newer fetch has started by the
    // time the response comes back (guards against out-of-order API responses).
    const generation = ++fetchGenerationRef.current;

    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      // Convert date-only format to ISO datetime for API
      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const filters: Record<string, string | number> = {};
      if (startDateTime) filters['start_date'] = startDateTime;
      if (endDateTime) filters['end_date'] = endDateTime;

      // Fix 1: use debouncedSearchTerm so we only query once typing has settled
      if (debouncedSearchTerm) {
        filters['search'] = debouncedSearchTerm;
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

      // Add excluded label filter
      if (excludedLabelIds.length > 0) {
        filters['exclude_label_ids'] = excludedLabelIds.join(',');
      }

      // Add amount range filter
      if (minAmount > 0) {
        filters['min_amount'] = minAmount;
      }
      if (maxAmount < Infinity) {
        filters['max_amount'] = maxAmount;
      }

      // Add transfer option filter
      if (transferOption) {
        filters['transfer_option'] = transferOption;
      }

      // Add debt option filter
      if (debtOption) {
        filters['debt_option'] = debtOption;
      }

      // Add draft option filter
      if (draftOption) {
        filters['draft_option'] = draftOption;
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
            filters['sort_by'] = 'abs_amount';
            filters['sort_order'] = 'desc';
            break;
          case 'absAmountAsc':
            filters['sort_by'] = 'abs_amount';
            filters['sort_order'] = 'asc';
            break;
        }
      }

      // Add pagination
      filters['page'] = pageNum;

      const result = await transactionService.fetchTransactions(filters);

      // Discard stale responses from superseded fetches
      if (generation !== fetchGenerationRef.current) return;

      if (pageNum === 1) {
        setTransactions(result.transactions);
        setTotalRecords(result.meta.total || 0);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }

      const totalPages = result.meta.totalPages || result.meta.total_pages || 1;
      setHasMore(result.meta.page < totalPages);
      setPage(pageNum);
    } catch (error) {
      if (generation !== fetchGenerationRef.current) return;
      logError('Failed to fetch transactions:', error);
    } finally {
      if (generation === fetchGenerationRef.current) {
        if (pageNum === 1) setLoading(false);
        else setIsLoadingMore(false);
      }
    }
  }, [
    dateRange.start,
    dateRange.end,
    debouncedSearchTerm,
    selectedCategories,
    selectedAccounts,
    selectedLabelIds,
    excludedLabelIds,
    minAmount,
    maxAmount,
    sortOption,
    transferOption,
    debtOption,
    draftOption,
    categories,
    apiAccounts
  ]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      
      if (!detail) return;

      if (detail.action === 'edit' && detail.data && detail.data.id) {
        // Optimistic local update for edits to preserve scroll position and page.
        // The incoming payload carries a positive amount (form uses Math.abs)
        // and a generic type (income/expense/transfer), so re-apply the correct
        // sign and keep the original directional type for transfers/debts.
        const data = detail.data;
        setTransactions(prev => {
          const editedRow = prev.find(t => t.id === data.id);

          // A transfer is stored as two rows sharing one transfer_id:
          // - transfer_out (source): negative amount
          // - transfer_in (destination): positive amount
          // Editing one leg must update both legs so their amounts stay in sync.
          const isTransferEdit =
            !!editedRow &&
            (editedRow.type === 'transfer_out' || editedRow.type === 'transfer_in') &&
            !!editedRow.transfer_id;

          if (isTransferEdit) {
            const newAbsAmount =
              typeof data.amount === 'number'
                ? Math.abs(data.amount)
                : Math.abs(parseFloat(String(data.amount ?? 0)));

            // A transfer edit may reassign both accounts. The source leg
            // (transfer_out) uses from_account_id, the destination leg
            // (transfer_in) uses to_account_id. Resolve the nested `account`
            // relation so displayed names/icons update optimistically.
            const resolveAccount = (accountId?: string) => {
              if (!accountId) return undefined;
              const acc = apiAccounts.find(a => a.id === accountId);
              return acc
                ? { id: acc.id, name: acc.name, icon: acc.icon, color: acc.color }
                : undefined;
            };

            return prev.map(t => {
              if (t.transfer_id !== editedRow.transfer_id) return t;

              const signedAmount = t.type === 'transfer_out' ? -newAbsAmount : newAbsAmount;
              const nextAccountId =
                t.type === 'transfer_out' ? data.account_id : data.to_account_id;
              const nextAccount = resolveAccount(nextAccountId);

              return {
                ...t,
                ...(Number.isNaN(newAbsAmount) ? {} : { amount: signedAmount }),
                ...(data.date !== undefined && { date: data.date }),
                ...(data.description !== undefined && { description: data.description }),
                ...(nextAccountId !== undefined && { account_id: nextAccountId }),
                ...(nextAccount && { account: nextAccount }),
              };
            });
          }

          // Regular income/expense (type may change via modal) or debt rows.
          return prev.map(t => {
            if (t.id !== data.id) return t;

            const merged = { ...t, ...data };

            // The payload carries only account_id, but rows render the nested
            // `account` relation (name/icon). Refresh it so the displayed
            // account matches the persisted change.
            if (data.account_id !== undefined && data.account_id !== t.account_id) {
              const nextAccount = apiAccounts.find(acc => acc.id === data.account_id);
              if (nextAccount) {
                merged.account = {
                  id: nextAccount.id,
                  name: nextAccount.name,
                  icon: nextAccount.icon,
                  color: nextAccount.color,
                };
              }
            }

            // Likewise, the payload carries only category_id, but rows render
            // the nested `category` relation (name/icon/color). Refresh it.
            if (data.category_id !== undefined && data.category_id !== t.category_id) {
              const nextCategory = categories.find(cat => cat.id === data.category_id);
              if (nextCategory) {
                merged.category = {
                  id: nextCategory.id,
                  name: nextCategory.name,
                  icon: nextCategory.icon,
                  color: nextCategory.color ?? '#6c757d',
                  type: String(nextCategory.type),
                };
              }
            }

            // The modal sends label_ids, but rows render the `labels` relation
            // (name/color badges). Resolve the IDs so badges update optimistically
            // instead of keeping the pre-edit set until the next fetch.
            if (Array.isArray(data.label_ids)) {
              merged.labels = (data.label_ids as string[])
                .map(labelId => labels.find(label => label.id === labelId))
                .filter((label): label is NonNullable<typeof label> => !!label)
                .map(label => ({ id: label.id, name: label.name, color: label.color }));
            }

            if (typeof merged.amount === 'number') {
              const absAmount = Math.abs(merged.amount);
              // Debt rows keep their original directional type; only regular
              // income/expense rows may switch type from the modal.
              const isDirectionalOriginal =
                t.type === 'debt_in' || t.type === 'debt_out';
              const effectiveType = isDirectionalOriginal ? t.type : (data.type ?? t.type);
              const shouldBeNegative =
                effectiveType === 'expense' || effectiveType === 'debt_out';

              merged.amount = shouldBeNegative ? -absAmount : absAmount;
              merged.type = effectiveType;
            }

            return merged;
          });
        });
      } else if (detail.action === 'add' && detail.data) {
        // Optimistic add (prepend to top)
        setTransactions(prev => [detail.data, ...prev]);
        setTotalRecords(prev => prev + 1);
      } else if (detail.action === 'delete' && detail.data && detail.data.id) {
        // Collect all IDs to delete (transfer pairs are deleted together)
        const idsToDelete = new Set([detail.data.id]);
        if (detail.data.pairedId) {
          idsToDelete.add(detail.data.pairedId);
        }

        // Optimistic delete
        setTransactions(prev => prev.filter(t => !idsToDelete.has(t.id)));
        setTotalRecords(prev => Math.max(0, prev - idsToDelete.size));
      } else {
        // Fallback to full fetch for others
        fetchTransactions(1);
      }
    };
    
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [fetchTransactions, apiAccounts, categories, labels]);

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
  const isSortByAmount = sortOption === 'amountAsc' || sortOption === 'amountDesc' || sortOption === 'absAmountAsc' || sortOption === 'absAmountDesc';

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
        type: isTransfer ? 'TRANSFER' : (
          transaction.type === 'debt_in' ? 'DEBT_IN' :
            transaction.type === 'debt_out' ? 'DEBT_OUT' :
              transaction.type === 'income' ? 'INCOME' : 'EXPENSE'
        ),
        is_draft: transaction.is_draft,
        debt_id: transaction.debt_id,
        labels: transaction.labels || [],
      } as TransactionRecord;

      // When sorting by amount, use a single flat group to preserve API sort order
      const groupKey = isSortByAmount ? '_flat' : dateKey;
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(record);
    });

    return grouped;
  }, [transactions, parentCategoryColors, categoryTree, isSortByAmount]);

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

  /** Current filter set, shared by every "all matching" bulk operation. */
  const buildCurrentFilters = useCallback((): TransactionFilters => {
    const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
    const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

    return {
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
      ...(excludedLabelIds.length > 0 && { exclude_label_ids: excludedLabelIds.join(',') }),
      ...(minAmount > 0 && { min_amount: minAmount }),
      ...(maxAmount < Infinity && { max_amount: maxAmount }),
      ...(transferOption && { transfer_option: transferOption }),
      ...(debtOption && { debt_option: debtOption }),
      ...(draftOption && { draft_option: draftOption })
    };
  }, [
    dateRange,
    searchTerm,
    selectedCategories,
    categories,
    selectedAccounts,
    apiAccounts,
    selectedLabelIds,
    excludedLabelIds,
    minAmount,
    maxAmount,
    transferOption,
    debtOption,
    draftOption
  ]);

  const handleBulkEdit = useCallback(() => {
    setShowBulkEdit(true);
  }, []);

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
    // Deleting one leg of a transfer also removes its pair, so the count the user
    // sees confirmed can be lower than the number of rows actually deleted.
    const selectionTouchesTransfer = isGlobalSelectAll
      ? transactions.some(t => !!t.transfer_id)
      : transactions.some(t => selectedTransactionIds.has(t.id) && !!t.transfer_id);

    const transferNote = selectionTouchesTransfer
      ? ' Deleting a transfer also removes its paired transaction.'
      : '';

    const result = await Swal.fire({
      icon: 'warning',
      title: isGlobalSelectAll ? 'Delete ALL Matching Records' : 'Bulk Delete',
      text: isGlobalSelectAll
        ? `Are you sure you want to delete ALL ${totalRecords} transactions matching your current filters?${transferNote}`
        : `Are you sure you want to delete ${selectedTransactionIds.size} transaction(s)?${transferNote}`,
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
          payload = {
            allMatching: true,
            filters: buildCurrentFilters()
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
        logError('Failed to bulk delete:', error);
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
    transactions,
    buildCurrentFilters,
    fetchTransactions
  ]);

  const handleBulkEditSubmit = useCallback(async (values: BulkEditValues) => {
    const payload: BulkUpdateTransactionsRequest = isGlobalSelectAll
      ? { allMatching: true, filters: buildCurrentFilters(), data: values }
      : { allMatching: false, ids: Array.from(selectedTransactionIds), data: values };

    try {
      const res = await transactionService.bulkUpdateTransactions(payload);
      setShowBulkEdit(false);

      const reasons: string[] = [];
      if (res.skipped.transferOrDebt > 0) {
        reasons.push(`${res.skipped.transferOrDebt} transfer/debt`);
      }
      if (res.skipped.categoryTypeMismatch > 0) {
        reasons.push(`${res.skipped.categoryTypeMismatch} with a mismatched category type`);
      }

      await Swal.fire({
        icon: reasons.length > 0 ? 'warning' : 'success',
        title: 'Updated',
        text: reasons.length > 0
          ? `Updated ${res.updatedCount} transaction(s). Skipped ${reasons.join(' and ')}.`
          : `Successfully updated ${res.updatedCount} transaction(s)`,
        ...(reasons.length === 0 && { timer: 2000, showConfirmButton: false })
      });

      setSelectedTransactionIds(new Set());
      setIsGlobalSelectAll(false);
      fetchTransactions(1);
    } catch (error) {
      logError('Failed to bulk edit:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update transactions',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
      // Rethrow so the modal stays open with the user's input intact
      throw error;
    }
  }, [isGlobalSelectAll, selectedTransactionIds, buildCurrentFilters, fetchTransactions]);


  const formatNetTotal = useCallback((net: number) => {
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(net));
    return `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatted}`;
  }, []);

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
                      summaryText={formatNetTotal(selectedNetTotal)}
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
                      onCloneAsDraft={handleCloneAsDraft}
                      onConfirmDraft={handleConfirmDraft}
                      showCheckboxes
                      showDropdownMenu
                      isGroupedByDate={!isSortByAmount}
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

      <BulkEditModal
        show={showBulkEdit}
        onHide={() => setShowBulkEdit(false)}
        targetCount={isGlobalSelectAll ? totalRecords : selectedTransactionIds.size}
        isGlobalSelectAll={isGlobalSelectAll}
        onSubmit={handleBulkEditSubmit}
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
