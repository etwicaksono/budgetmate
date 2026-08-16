import type { Prisma } from '@prisma/client';
import { buildLabelWhereConditions } from './labelFilters';

const MAX_IDS = 50;

export type DraftOption = 'include' | 'only' | 'exclude';

export interface AnalyticsFilters {
  accountIds: string[];
  categoryIds: string[];
  draftOption: DraftOption;
  labelConditions: Prisma.TransactionWhereInput[];
}

/** Splits a comma-separated ID list, dropping empties and capping the length. */
function parseIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean).slice(0, MAX_IDS);
}

function parseDraftOption(value: string | null | undefined): DraftOption {
  // Defaults to 'exclude' so reports keep hiding drafts unless asked otherwise.
  return value === 'include' || value === 'only' ? value : 'exclude';
}

/**
 * Reads the filter params the dashboard and analytics reports share.
 *
 * Label filters are returned as ready-to-compose AND entries because include and
 * exclude both target the `labels` relation and would otherwise overwrite each other.
 */
export function parseAnalyticsFilters(searchParams: URLSearchParams): AnalyticsFilters {
  return {
    accountIds: parseIds(searchParams.get('account_ids')),
    categoryIds: parseIds(searchParams.get('category_ids')),
    draftOption: parseDraftOption(searchParams.get('draft_option')),
    labelConditions: buildLabelWhereConditions(
      searchParams.get('label_ids'),
      searchParams.get('exclude_label_ids')
    ),
  };
}

/**
 * Turns the parsed filters into a Prisma transaction where fragment.
 *
 * 'include' intentionally omits `is_draft` entirely so both drafts and confirmed
 * transactions are counted.
 */
export function buildAnalyticsTransactionWhere(filters: AnalyticsFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = {};

  if (filters.draftOption === 'exclude') where.is_draft = false;
  else if (filters.draftOption === 'only') where.is_draft = true;

  if (filters.accountIds.length > 0) where.account_id = { in: filters.accountIds };
  if (filters.categoryIds.length > 0) where.category_id = { in: filters.categoryIds };
  if (filters.labelConditions.length > 0) where.AND = filters.labelConditions;

  return where;
}
