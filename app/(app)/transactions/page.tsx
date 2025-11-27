'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useTransaction } from '@/contexts/TransactionContext';
import { transactionService, type Transaction } from '@/services/transactionService';
import { labelService, type Label } from '@/services/labelService';
import { useFilterData } from '@/hooks/useFilterData';
import { DesktopFilterSidebar } from '@/components/FilterSidebar';
import { RecordsHeader, RecordsList, type GroupedTransactions, type TransactionRecord } from '@/components/Records';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
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
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

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
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
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
      
      const result = await transactionService.fetchTransactions(filters);
      setTransactions(result.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
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
    fetchTransactions();
  }, [fetchTransactions]);

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = () => fetchTransactions();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [fetchTransactions]);

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
        type: isTransfer ? 'TRANSFER' : (transaction.type === 'income' ? 'INCOME' : 'EXPENSE'),
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
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTransactionIds.size === sortedTransactions.length) {
      setSelectedTransactionIds(new Set());
    } else {
      setSelectedTransactionIds(new Set(sortedTransactions.map((t) => t.id)));
    }
  }, [selectedTransactionIds.size, sortedTransactions]);



  // Edit handler following Single Responsibility Principle
  const handleEditRecord = useCallback((record: TransactionRecord) => {
    const transaction = transactions.find((t) => t.id === record.id);
    if (!transaction) return;

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
      ? (transaction as any).transfer_currency || transaction.currency
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
      text: `Bulk editing ${selectedTransactionIds.size} transaction(s) is not yet implemented`,
      confirmButtonColor: '#0d6efd',
    });
  }, [selectedTransactionIds.size]);

  const handleBulkExport = useCallback(() => {
    Swal.fire({
      icon: 'info',
      title: 'Bulk Export',
      text: `Exporting ${selectedTransactionIds.size} transaction(s) is not yet implemented`,
      confirmButtonColor: '#0d6efd',
    });
  }, [selectedTransactionIds.size]);

  const handleBulkDelete = useCallback(async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Bulk Delete',
      text: `Are you sure you want to delete ${selectedTransactionIds.size} transaction(s)?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      Swal.fire({
        icon: 'info',
        title: 'Coming Soon',
        text: 'Bulk delete is not yet implemented',
        confirmButtonColor: '#0d6efd',
      });
    }
  }, [selectedTransactionIds.size]);

  // Format currency
  // Calculate net total per currency (all or selected)
  const netTotalsByCurrency = useMemo(() => {
    const hasSelection = selectedTransactionIds.size > 0;
    const transactionsToSum = hasSelection
      ? sortedTransactions.filter(t => selectedTransactionIds.has(t.id))
      : sortedTransactions;
    
    const totals: Record<string, number> = {};
    transactionsToSum.forEach((t) => {
      const currency = t.currency || 'USD';
      totals[currency] = (totals[currency] || 0) + t.amount;
    });
    
    return totals;
  }, [sortedTransactions, selectedTransactionIds]);

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
          <DesktopFilterSidebar
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
          />
        </Col>

        {/* Main Content */}
        <Col lg={9}>
          {/* Period Navigation */}
          <div className="d-flex justify-content-center mb-3">
            <PeriodNavigation>
              <PeriodRangeSelector
                label={periodLabel}
                activePeriod={activePeriod}
                customRange={customRangeDraft}
              />
            </PeriodNavigation>
          </div>

          {/* Transactions Card */}
          <Card>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <RecordsHeader
                    selectedCount={selectedTransactionIds.size}
                    totalCount={sortedTransactions.length}
                    allSelected={allSelected}
                    onSelectAll={handleSelectAll}
                    onBulkEdit={handleBulkEdit}
                    onBulkExport={handleBulkExport}
                    onBulkDelete={handleBulkDelete}
                    summaryText={formatNetTotals(netTotalsByCurrency)}
                    showBulkActions
                  />
                  <RecordsList
                    groupedTransactions={groupedTransactions}
                    selectedRecords={selectedTransactionIds}
                    onSelectRecord={handleSelectRecord}
                    onEditRecord={handleEditRecord}
                    onDeleteRecord={handleDeleteRecord}
                    showCheckboxes
                    showDropdownMenu
                  />
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
