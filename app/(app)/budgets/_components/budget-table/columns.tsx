import { useMemo } from 'react';
import { Column } from 'react-data-grid';
import { Row } from './types';
import { NameFormatter, CurrencyFormatter, PercentageFormatter, numberEditor } from './formatters';

interface UseBudgetColumnsProps {
  currency: string;
  dirtyRowIds: Set<string>;
  toggleCollapse: (rowId: string) => void;
}

export function useBudgetColumns({ currency, dirtyRowIds, toggleCollapse }: UseBudgetColumnsProps) {
  const getEditableCellClass = (row: Row) => {
    if (row.isSummary) return 'fw-bold bg-light';
    if (row.isParent) return 'text-muted'; 
    return 'cell-editable';
  };

  const allColumns: Column<Row>[] = useMemo(() => [
    { 
      key: 'name', 
      name: 'Category Name', 
      width: 250, 
      frozen: true,
      sortable: true,
      headerCellClass: 'header-readonly',
      renderCell: (props) => props.row.isSummary ? <div className="fw-bold text-end pe-2">Total</div> : <NameFormatter row={props.row} toggleCollapse={toggleCollapse} />,
    },
    { 
      key: 'basicMonthly', 
      name: 'Monthly Basic', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter currency={currency} value={props.row.basicMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendMonthly', 
      name: 'Monthly Extend', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter currency={currency} value={props.row.extendMonthly} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentMonthly', 
      name: 'Monthly Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter currency={currency} value={-Math.abs(props.row.spentMonthly)} />,
    },
    { 
      key: 'periodicMargin', 
      name: 'Monthly Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => (
        <div className={`text-end h-100 d-flex align-items-center justify-content-end ${props.row.periodicMargin < 0 ? 'text-danger fw-bold' : 'text-success'}`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(props.row.periodicMargin)}
        </div>
      ),
    },
    { 
      key: 'dailyBudget', 
      name: 'Daily Budget (Est)', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter currency={currency} value={props.row.dailyBudget} />,
    },
    { 
      key: 'periodicAvailablePercentage', 
      name: 'Monthly % Used', 
      width: 130, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <PercentageFormatter value={props.row.periodicAvailablePercentage} />,
    },
    { 
      key: 'basicAnnual', 
      name: 'Annual Basic', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter currency={currency} value={props.row.basicAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'extendAnnual', 
      name: 'Annual Extend', 
      width: 150, 
      cellClass: (row) => getEditableCellClass(row),
      headerCellClass: 'header-editable',
      sortable: true,
      renderEditCell: (props) => props.row.isSummary || props.row.isParent ? null : numberEditor(props),
      renderCell: (props) => <CurrencyFormatter currency={currency} value={props.row.extendAnnual} isDirty={!props.row.isSummary && dirtyRowIds.has(props.row.id)} />,
    },
    { 
      key: 'spentAnnual', 
      name: 'Annual Expense', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => <CurrencyFormatter currency={currency} value={-Math.abs(props.row.spentAnnual)} />,
    },
    { 
      key: 'annualMargin', 
      name: 'Annual Margin', 
      width: 150, 
      cellClass: (row) => row.isSummary ? 'fw-bold bg-light' : '',
      headerCellClass: 'header-readonly',
      sortable: true,
      renderCell: (props) => (
        <div className={`text-end h-100 d-flex align-items-center justify-content-end ${props.row.annualMargin < 0 ? 'text-danger fw-bold' : 'text-success'}`}>
          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(props.row.annualMargin)}
        </div>
      ),
    },
  ], [dirtyRowIds, currency, toggleCollapse]);

  return allColumns;
}
