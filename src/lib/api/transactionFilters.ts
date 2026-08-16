import { Prisma, TransactionType } from '@prisma/client';

/**
 * Thrown when a filter combination can never be satisfied.
 * Callers should map this to an HTTP 400 response.
 */
export class InvalidFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFilterError';
  }
}

/** Raw filter payload as received from a request body or query string. */
export type TransactionFilterInputMap = Record<string, unknown>;

/** Resolves child category IDs so filtering by a parent includes its children. */
export type CategoryChildrenResolver = (categoryId: string) => Promise<string[]>;

export interface BuildTransactionWhereOptions {
  /**
   * Used only for the single `category_id` filter, to expand a parent category
   * into itself plus its children. Omit to filter on the exact ID.
   */
  resolveCategoryChildren?: CategoryChildrenResolver;
}

const MAX_ID_LIST = 50;

const TRANSFER_TYPES: TransactionType[] = [
  TransactionType.transfer_in,
  TransactionType.transfer_out
];

const DEBT_TYPES: TransactionType[] = [TransactionType.debt_in, TransactionType.debt_out];

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Splits a comma-separated ID list, dropping empties and capping the length. */
function parseIdList(value: unknown): string[] {
  const raw = asString(value);
  if (!raw) return [];
  return raw.split(',').filter(Boolean).slice(0, MAX_ID_LIST);
}

function isTransactionType(value: string): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * Builds the Prisma `where` clause shared by transaction list, bulk delete and
 * bulk update. Always scopes to the given user and excludes soft-deleted rows.
 *
 * Filter semantics mirror `GET /api/v1/transactions`:
 * - `draft_option` defaults to excluding drafts
 * - amount range matches absolute value across both signs
 * - `keyword` and `search` are interchangeable
 */
export async function buildTransactionWhere(
  userId: string,
  filters: TransactionFilterInputMap | undefined,
  options: BuildTransactionWhereOptions = {}
): Promise<Prisma.TransactionWhereInput> {
  const and: Prisma.TransactionWhereInput[] = [];
  const where: Prisma.TransactionWhereInput = {
    user_id: userId,
    deleted_at: null
  };

  const f = filters ?? {};

  // Account filter — single ID takes precedence over the comma-separated list
  const accountId = asString(f['account_id']);
  if (accountId) {
    where.account_id = accountId;
  } else {
    const accountIds = parseIdList(f['account_ids']);
    if (accountIds.length > 0) {
      where.account_id = { in: accountIds };
    }
  }

  // Category filter — a single parent ID expands to include its children
  const categoryIds = parseIdList(f['category_ids']);
  const categoryId = asString(f['category_id']);
  if (categoryIds.length > 0) {
    where.category_id = { in: categoryIds };
  } else if (categoryId) {
    const childIds = options.resolveCategoryChildren
      ? await options.resolveCategoryChildren(categoryId)
      : [];
    where.category_id = childIds.length > 0 ? { in: [categoryId, ...childIds] } : categoryId;
  }

  // Type filter — an explicit type wins over the transfer/debt toggles
  const explicitType = asString(f['type']);
  if (explicitType && explicitType !== 'all' && isTransactionType(explicitType)) {
    where.type = explicitType;
  } else {
    const transferOption = asString(f['transfer_option']);
    const debtOption = asString(f['debt_option']);

    const includeTypes: TransactionType[] = [];
    const excludeTypes: TransactionType[] = [];

    if (transferOption === 'only') {
      includeTypes.push(...TRANSFER_TYPES);
    } else if (transferOption === 'exclude') {
      excludeTypes.push(...TRANSFER_TYPES);
    }

    if (debtOption === 'only') {
      // Both 'only' options select disjoint sets, so together they can never match
      if (transferOption === 'only') {
        throw new InvalidFilterError(
          "Cannot combine transfer_option='only' and debt_option='only' simultaneously"
        );
      }
      includeTypes.push(...DEBT_TYPES);
    } else if (debtOption === 'exclude') {
      excludeTypes.push(...DEBT_TYPES);
    }

    if (includeTypes.length > 0 && excludeTypes.length > 0) {
      const filtered = includeTypes.filter(t => !excludeTypes.includes(t));
      if (filtered.length > 0) where.type = { in: filtered };
    } else if (includeTypes.length > 0) {
      where.type = { in: includeTypes };
    } else if (excludeTypes.length > 0) {
      where.type = { notIn: excludeTypes };
    }
  }

  // Draft option (default: exclude drafts)
  const draftOption = asString(f['draft_option']);
  if (draftOption === 'only') {
    where.is_draft = true;
  } else if (draftOption !== 'include') {
    where.is_draft = false;
  }

  // Date range — end_date is advanced to end-of-day so the full day is included
  const startDate = asString(f['start_date']);
  const endDate = asString(f['end_date']);
  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    }
    where.date = dateFilter;
  }

  // Amount range, matched on absolute value across both signs.
  // `lt: -min` keeps zero-amount rows in the positive branch only.
  const minAmount = asNumber(f['min_amount']);
  const maxAmount = asNumber(f['max_amount']);
  if (minAmount !== undefined || maxAmount !== undefined) {
    const min = minAmount ?? 0;
    const max = maxAmount ?? Number.MAX_SAFE_INTEGER;

    and.push({
      OR: [
        { amount: { gte: min, lte: max } },
        { amount: { gte: -max, lt: min > 0 ? -min : 0 } }
      ]
    });
  }

  // Keyword search across description and payee ('keyword' and 'search' are aliases)
  const searchTerm = (asString(f['keyword']) ?? asString(f['search']))?.trim();
  if (searchTerm) {
    and.push({
      OR: [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { payee: { contains: searchTerm, mode: 'insensitive' } }
      ]
    });
  }

  const labelIds = parseIdList(f['label_ids']);
  if (labelIds.length > 0) {
    where.labels = {
      some: {
        label_id: { in: labelIds }
      }
    };
  }

  // Excluded labels go through AND so they compose with the include filter above
  // instead of overwriting `where.labels`
  const excludeLabelIds = parseIdList(f['exclude_label_ids']);
  if (excludeLabelIds.length > 0) {
    and.push({
      labels: {
        none: {
          label_id: { in: excludeLabelIds }
        }
      }
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}
