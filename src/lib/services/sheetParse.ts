import { parseDateFromSheet, parseDateOnly } from '@/utils/timezone';
import { Prisma } from '@prisma/client';

export interface ParsedAccount {
  id: string;
  name: string;
  account_type: string;
  currency: string;
  initial_balance: Prisma.Decimal;
  credit_limit?: Prisma.Decimal | undefined;
  interest_rate?: Prisma.Decimal | undefined;
  icon: string;
  color: string;
  is_active: boolean;
  is_included_in_total: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ParsedCategory {
  id: string;
  parent_id?: string | undefined;
  name: string;
  type: string;
  nature: string;
  icon: string;
  color?: string | undefined;
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ParsedTransaction {
  id: string;
  account_id: string;
  category_id?: string | undefined;
  type: string;
  amount: Prisma.Decimal;
  currency: string;
  exchange_rate: Prisma.Decimal;
  date: Date;
  description?: string | undefined;
  payee?: string | undefined;
  payment_method?: string | undefined;
  payment_status?: string | undefined;
  reference_number?: string | undefined;
  is_recurring: boolean;
  transfer_id?: string | undefined;
  labels: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ParsedTransfer {
  id: string;
  from_account: string;
  to_account: string;
  amount: Prisma.Decimal;
  currency: string;
  to_amount?: Prisma.Decimal | undefined;
  to_currency?: string | undefined;
  date: Date;
  description?: string | undefined;
  created_at: Date;
  updated_at: Date;
}

export interface ParsedLabel {
  id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
}

function parseBool(value: string): boolean {
  return value.toUpperCase() === 'TRUE';
}

function parseDecimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value || '0');
}

export function parseAccountsFromSheet(rows: string[][]): ParsedAccount[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length > 0 && row[0]).map((row) => ({
    id: row[0]!,
    name: row[2]!,
    account_type: row[3]!,
    currency: row[4]!,
    initial_balance: parseDecimal(row[5]!),
    credit_limit: row[6] ? parseDecimal(row[6]) : undefined,
    interest_rate: row[7] ? parseDecimal(row[7]) : undefined,
    icon: row[8]!,
    color: row[9]!,
    is_active: parseBool(row[10]!),
    is_included_in_total: parseBool(row[11]!),
    created_at: parseDateFromSheet(row[12]!),
    updated_at: parseDateFromSheet(row[13]!),
  }));
}

export function parseCategoriesFromSheet(rows: string[][]): ParsedCategory[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length > 0 && row[0]).map((row) => ({
    id: row[0]!,
    parent_id: row[2] || undefined,
    name: row[3]!,
    type: row[4]!,
    nature: row[5]!,
    icon: row[6]!,
    color: row[7] || undefined,
    is_system: parseBool(row[8]!),
    is_active: parseBool(row[9]!),
    created_at: parseDateFromSheet(row[10]!),
    updated_at: parseDateFromSheet(row[11]!),
  }));
}

export function parseTransactionsFromSheet(
  rows: string[][]
): ParsedTransaction[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length > 0 && row[0]).map((row) => ({
    id: row[0]!,
    account_id: row[2]!,
    category_id: row[3] || undefined,
    type: row[4]!,
    amount: parseDecimal(row[5]!),
    currency: row[6]!,
    exchange_rate: parseDecimal(row[7]!),
    date: parseDateOnly(row[8]!),
    description: row[9] || undefined,
    payee: row[10] || undefined,
    payment_method: row[11] || undefined,
    payment_status: row[12] || undefined,
    reference_number: row[13] || undefined,
    is_recurring: parseBool(row[14]!),
    transfer_id: row[15] || undefined,
    labels: row[16] ? row[16].split('|').filter((l) => l) : [],
    created_at: parseDateFromSheet(row[17]!),
    updated_at: parseDateFromSheet(row[18]!),
  }));
}

export function parseTransfersFromSheet(rows: string[][]): ParsedTransfer[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length > 0 && row[0]).map((row) => ({
    id: row[0]!,
    from_account: row[2]!,
    to_account: row[3]!,
    amount: parseDecimal(row[4]!),
    currency: row[5]!,
    to_amount: row[6] ? parseDecimal(row[6]) : undefined,
    to_currency: row[7] || undefined,
    date: parseDateOnly(row[8]!),
    description: row[9] || undefined,
    created_at: parseDateFromSheet(row[10]!),
    updated_at: parseDateFromSheet(row[11]!),
  }));
}

export function parseLabelsFromSheet(rows: string[][]): ParsedLabel[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length > 0 && row[0]).map((row) => ({
    id: row[0]!,
    name: row[2]!,
    color: row[3]!,
    created_at: parseDateFromSheet(row[4]!),
    updated_at: parseDateFromSheet(row[5]!),
  }));
}

// ==================== SIMPLIFIED SYNC FORMAT PARSERS ====================
// These functions parse sheets with "Name::PersonalID" codes instead of UUIDs

export interface CodeParseResult {
  name: string;
  raw: string;
}

/**
 * Parse code format: "Name::Code" or just "Name"
 * Examples:
 *  - "Cash Eko::ACC1" → { name: "Cash Eko", raw: "ACC1" }
 *  - "Groceries::CAT3" → { name: "Groceries", raw: "CAT3" }
 *  - "Cash" → { name: "Cash", raw: "Cash" } (fallback to name lookup)
 */
export function parseCode(code: string): CodeParseResult {
  if (!code || code.trim() === '') {
    throw new Error('Code cannot be empty');
  }

  const parts = code.split('::');
  const name = parts[0]!.trim();

  if (!name) {
    throw new Error(`Invalid code format: "${code}". Name part is empty`);
  }

  return { name, raw: code };
}

export interface ParsedAccountSimple {
  code: string;
  name: string;
  account_type: string;
  currency: string;
  initial_balance: Prisma.Decimal;
  icon: string;
  color: string;
  is_active: boolean;
}

export interface ParsedCategorySimple {
  code: string;
  parent_code?: string | undefined;
  name: string;
  type: string;
  nature: string;
  icon: string;
}

export interface ParsedTransactionSimple {
  date: Date;
  type: string;
  account_code: string;
  category_code?: string | undefined;
  amount: Prisma.Decimal;
  description?: string | undefined;
  labels: string[];
}

export interface ParsedTransferSimple {
  date: Date;
  from_account_code: string;
  to_account_code: string;
  amount: Prisma.Decimal;
  description?: string | undefined;
}

/**
 * Parse simplified accounts sheet (9 columns)
 * Format: Personal ID | Code | Name | Type | Currency | Initial Balance | Icon | Color | Active
 */
export function parseAccountsFromSheetSimple(rows: string[][]): ParsedAccountSimple[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length >= 9 && row[0]).map((row) => {
    // Validate code format
    parseCode(row[1]!);

    return {
      code: row[1]!,
      name: row[2]!,
      account_type: row[3]!,
      currency: row[4]!,
      initial_balance: parseDecimal(row[5]!),
      icon: row[6]!,
      color: row[7]!,
      is_active: parseBool(row[8]!),
    };
  });
}

/**
 * Parse simplified categories sheet (7 columns)
 * Format: Personal ID | Code | Parent Code | Name | Type | Nature | Icon
 */
export function parseCategoriesFromSheetSimple(rows: string[][]): ParsedCategorySimple[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length >= 7 && row[0]).map((row) => {
    // Validate code format
    parseCode(row[1]!);

    return {
      code: row[1]!,
      parent_code: row[2] || undefined,
      name: row[3]!,
      type: row[4]!,
      nature: row[5]!,
      icon: row[6]!,
    };
  });
}

/**
 * Parse simplified transactions sheet (8 columns)
 * Format: Personal ID | Date | Type | Account | Category | Amount | Note | Labels
 */
export function parseTransactionsFromSheetSimple(rows: string[][]): ParsedTransactionSimple[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length >= 8 && row[0]).map((row) => {
    return {
      date: parseDateOnly(row[1]!),
      type: row[2]!,
      account_code: row[3]!,
      category_code: row[4] || undefined,
      amount: parseDecimal(row[5]!),
      description: row[6] || undefined,
      labels: row[7] ? row[7].split('|').filter((l) => l.trim()) : [],
    };
  });
}

/**
 * Parse simplified transfers sheet (6 columns)
 * Format: Personal ID | Date | From Account | To Account | Amount | Note
 */
export function parseTransfersFromSheetSimple(rows: string[][]): ParsedTransferSimple[] {
  if (rows.length <= 1) return [];

  return rows.slice(1).filter(row => row.length >= 6 && row[0]).map((row) => {
    return {
      date: parseDateOnly(row[1]!),
      from_account_code: row[2]!,
      to_account_code: row[3]!,
      amount: parseDecimal(row[4]!),
      description: row[5] || undefined,
    };
  });
}
