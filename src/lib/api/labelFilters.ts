import type { Prisma } from '@prisma/client';

const MAX_LABEL_IDS = 50;

/** Splits a comma-separated label ID list, dropping empties and capping the length. */
function parseLabelIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean).slice(0, MAX_LABEL_IDS);
}

/**
 * Builds the label conditions shared by the analytics reports.
 *
 * Include matches transactions carrying at least one of the given labels (`some`),
 * exclude drops transactions carrying any of them (`none`). Both are returned as
 * separate AND entries so callers can compose them onto an existing where clause
 * without a single `labels` key overwriting the other.
 */
export function buildLabelWhereConditions(
  includeLabelIds: string | null | undefined,
  excludeLabelIds: string | null | undefined
): Prisma.TransactionWhereInput[] {
  const conditions: Prisma.TransactionWhereInput[] = [];

  const includeIds = parseLabelIds(includeLabelIds);
  if (includeIds.length > 0) {
    conditions.push({ labels: { some: { label_id: { in: includeIds } } } });
  }

  const excludeIds = parseLabelIds(excludeLabelIds);
  if (excludeIds.length > 0) {
    conditions.push({ labels: { none: { label_id: { in: excludeIds } } } });
  }

  return conditions;
}
