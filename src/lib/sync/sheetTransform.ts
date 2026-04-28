import { Account, Category, Transaction, Transfer, Label } from '@prisma/client';
import { formatDateForSheet, formatDateOnly } from '@/utils/timezone';

export interface SheetMetadata {
  version: string;
  exported_at: string;
  user_id: string;
  currency: string;
}

export function buildMetadataTab(metadata: SheetMetadata): unknown[][] {
  return [
    ['Property', 'Value'],
    ['Version', metadata.version],
    ['Exported At', metadata.exported_at],
    ['User ID', metadata.user_id],
    ['Currency', metadata.currency],
  ];
}

export function buildAccountsTab(accounts: Account[]): unknown[][] {
  const headers = [
    'ID',
    'Personal ID',
    'Name',
    'Type',
    'Currency',
    'Initial Balance',
    'Credit Limit',
    'Interest Rate',
    'Icon',
    'Color',
    'Is Active',
    'Is Included In Total',
    'Created At',
    'Updated At',
  ];

  const rows = accounts.map((acc) => [
    acc.id,
    '', // Retired personal_id
    acc.name,
    acc.account_type,
    acc.currency,
    acc.initial_balance.toString(),
    acc.credit_limit?.toString() || '',
    acc.interest_rate?.toString() || '',
    acc.icon,
    acc.color,
    acc.is_active ? 'TRUE' : 'FALSE',
    acc.is_included_in_total ? 'TRUE' : 'FALSE',
    formatDateForSheet(acc.created_at),
    formatDateForSheet(acc.updated_at),
  ]);

  return [headers, ...rows];
}

export function buildCategoriesTab(categories: Category[]): unknown[][] {
  const headers = [
    'ID',
    'Personal ID',
    'Parent ID',
    'Name',
    'Type',
    'Nature',
    'Icon',
    'Color',
    'Is System',
    'Is Active',
    'Created At',
    'Updated At',
  ];

  const rows = categories.map((cat) => [
    cat.id,
    '', // Retired personal_id
    cat.parent_id || '',
    cat.name,
    cat.type,
    cat.nature,
    cat.icon,
    cat.color || '',
    cat.is_system ? 'TRUE' : 'FALSE',
    cat.is_active ? 'TRUE' : 'FALSE',
    formatDateForSheet(cat.created_at),
    formatDateForSheet(cat.updated_at),
  ]);

  return [headers, ...rows];
}

export interface TransactionWithLabels extends Transaction {
  labels: Array<{ label: { name: string } }>;
}

export function buildTransactionsTab(
  transactions: TransactionWithLabels[]
): unknown[][] {
  const headers = [
    'ID',
    'Personal ID',
    'Account ID',
    'Category ID',
    'Type',
    'Amount',
    'Currency',
    'Exchange Rate',
    'Date',
    'Description',
    'Payee',
    'Payment Method',
    'Payment Status',
    'Reference Number',
    'Is Recurring',
    'Transfer ID',
    'Labels',
    'Created At',
    'Updated At',
  ];

  const rows = transactions.map((txn) => [
    txn.id,
    '', // Retired personal_id
    txn.account_id,
    txn.category_id || '',
    txn.type,
    txn.amount.toString(),
    txn.currency,
    txn.exchange_rate.toString(),
    formatDateOnly(txn.date),
    txn.description || '',
    txn.payee || '',
    txn.payment_method || '',
    txn.payment_status || '',
    txn.reference_number || '',
    txn.is_recurring ? 'TRUE' : 'FALSE',
    txn.transfer_id || '',
    txn.labels.map((l) => l.label.name).join('|'),
    formatDateForSheet(txn.created_at),
    formatDateForSheet(txn.updated_at),
  ]);

  return [headers, ...rows];
}

export function buildTransfersTab(transfers: Transfer[]): unknown[][] {
  const headers = [
    'ID',
    'Personal ID',
    'From Account',
    'To Account',
    'Amount',
    'Currency',
    'To Amount',
    'To Currency',
    'Date',
    'Description',
    'Created At',
    'Updated At',
  ];

  const rows = transfers.map((transfer) => [
    transfer.id,
    '', // Retired personal_id
    transfer.from_account,
    transfer.to_account,
    transfer.amount.toString(),
    transfer.currency,
    transfer.to_amount?.toString() || '',
    transfer.to_currency || '',
    formatDateOnly(transfer.date),
    transfer.description || '',
    formatDateForSheet(transfer.created_at),
    formatDateForSheet(transfer.updated_at),
  ]);

  return [headers, ...rows];
}

export function buildLabelsTab(labels: Label[]): unknown[][] {
  const headers = [
    'ID',
    'Personal ID',
    'Name',
    'Color',
    'Created At',
    'Updated At',
  ];

  const rows = labels.map((label) => [
    label.id,
    '', // Retired personal_id
    label.name,
    label.color,
    formatDateForSheet(label.created_at),
    formatDateForSheet(label.updated_at),
  ]);

  return [headers, ...rows];
}

// ==================== SIMPLIFIED SYNC FORMAT (User-Friendly) ====================
// These functions create sheets with "Name::PersonalID" codes instead of UUIDs
// Matching the format users are familiar with from manual entry

export interface AccountWithCode extends Account {
  code: string | null;
}

export interface CategoryWithCode extends Category {
  code: string | null;
  parent?: CategoryWithCode | null;
}

export interface TransactionWithRelations extends Transaction {
  labels: Array<{ label: { name: string } }>;
  account: AccountWithCode;
  category?: CategoryWithCode | null;
}



/**
 * Build simplified accounts tab (9 columns instead of 14)
 * Uses "Code" (Name::PersonalID) format for human readability
 */
export function buildAccountsTabSimple(accounts: AccountWithCode[]): unknown[][] {
  const headers = [
    'Personal ID',
    'Code',
    'Name',
    'Type',
    'Currency',
    'Initial Balance',
    'Icon',
    'Color',
    'Active',
  ];

  const rows = accounts.map((acc) => [
    '', // Retired personal_id
    acc.code || acc.name, // Fallback to name
    acc.name,
    acc.account_type,
    acc.currency,
    acc.initial_balance.toString(),
    acc.icon,
    acc.color,
    acc.is_active ? 'TRUE' : 'FALSE',
  ]);

  return [headers, ...rows];
}

/**
 * Build simplified categories tab (7 columns instead of 12)
 * Uses "Code" (Name::PersonalID) format for human readability
 */
export function buildCategoriesTabSimple(categories: CategoryWithCode[]): unknown[][] {
  const headers = [
    'Personal ID',
    'Code',
    'Parent Code',
    'Name',
    'Type',
    'Nature',
    'Icon',
  ];

  const rows = categories.map((cat) => {
    // Find parent category code if exists
    let parentCode = '';
    if (cat.parent_id && cat.parent) {
      parentCode = cat.parent.code || cat.parent.name;
    }

    return [
      '', // Retired personal_id
      cat.code || cat.name, // Fallback to name
      parentCode,
      cat.name,
      cat.type,
      cat.nature,
      cat.icon,
    ];
  });

  return [headers, ...rows];
}

/**
 * Build simplified transactions tab (8 columns instead of 19)
 * Uses "Code" (Name::PersonalID) format for accounts and categories
 */
export function buildTransactionsTabSimple(
  transactions: TransactionWithRelations[]
): unknown[][] {
  const headers = [
    'Personal ID',
    'Date',
    'Type',
    'Account',
    'Category',
    'Amount',
    'Note',
    'Labels',
  ];

  const rows = transactions.map((txn) => {
    const accountCode = txn.account.code || txn.account.name;

    let categoryCode = '';
    if (txn.category) {
      categoryCode = txn.category.code || txn.category.name;
    }

    return [
      '', // Retired personal_id
      formatDateOnly(txn.date),
      txn.type,
      accountCode,
      categoryCode,
      txn.amount.toString(),
      txn.description || '',
      txn.labels.map((l) => l.label.name).join('|'),
    ];
  });

  return [headers, ...rows];
}

/**
 * Build simplified transfers tab (6 columns instead of 12)
 * Uses "Code" (Name::PersonalID) format for accounts
 */
export function buildTransfersTabSimple(transfers: Transfer[], accounts: AccountWithCode[]): unknown[][] {
  const headers = [
    'Personal ID',
    'Date',
    'From Account',
    'To Account',
    'Amount',
    'Note',
  ];

  const rows = transfers.map((transfer) => {
    const fromAcc = accounts.find(a => a.id === transfer.from_account);
    const toAcc = accounts.find(a => a.id === transfer.to_account);

    const fromAccountCode = fromAcc ? (fromAcc.code || fromAcc.name) : transfer.from_account;
    const toAccountCode = toAcc ? (toAcc.code || toAcc.name) : transfer.to_account;

    return [
      '', // Retired personal_id
      formatDateOnly(transfer.date),
      fromAccountCode,
      toAccountCode,
      transfer.amount.toString(),
      transfer.description || '',
    ];
  });

  return [headers, ...rows];
}
