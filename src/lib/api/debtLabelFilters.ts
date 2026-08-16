import type { Prisma } from '@prisma/client';

const MAX_LABEL_IDS = 50;

/** Splits a comma-separated label ID list, dropping empties and capping the length. */
function parseLabelIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean).slice(0, MAX_LABEL_IDS);
}

/**
 * Builds the label conditions for the debts list.
 *
 * Include matches debts carrying at least one of the given labels (`some`),
 * exclude drops debts carrying any of them (`none`). Both are returned as
 * separate AND entries so callers can compose them onto an existing where clause
 * without a single `labels` key overwriting the other.
 *
 * These target DebtLabel, which is independent of the labels on a debt's linked
 * ledger transactions.
 */
export function buildDebtLabelWhereConditions(
  includeLabelIds: string | null | undefined,
  excludeLabelIds: string | null | undefined
): Prisma.DebtWhereInput[] {
  const conditions: Prisma.DebtWhereInput[] = [];

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
