/** Sort keys accepted by `GET /transactions`. */
export type TransactionSortBy = 'date' | 'amount' | 'created_at' | 'abs_amount';
export type SortOrder = 'asc' | 'desc';

/** Minimal row shape needed to order by magnitude. */
export interface AmountRow {
  id: string;
  amount: number;
}

/**
 * Orders rows by the magnitude of their amount, ignoring the sign.
 *
 * Expenses are stored negative and income positive, so plain `amount` ordering puts
 * the largest expense first and the largest income last. Sorting by magnitude
 * instead treats a 500k expense and a 500k income as equal in rank, which is what
 * "absolute amount" means to the user.
 *
 * `id` breaks ties so the order is total. Without it two rows of equal magnitude
 * could swap places between requests and the same row would appear on two pages
 * (or none) while paging through results.
 */
export function sortRowsByAbsAmount(rows: readonly AmountRow[], order: SortOrder): AmountRow[] {
  const direction = order === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const diff = Math.abs(a.amount) - Math.abs(b.amount);
    if (diff !== 0) return diff * direction;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Picks the IDs belonging to one page of a magnitude-ordered result set.
 *
 * The database cannot order by `abs(amount)` through Prisma, so the ordering has to
 * happen here. Slicing after the sort keeps pagination consistent with the full
 * result set rather than reordering rows within an already-paginated page.
 */
export function selectAbsAmountPageIds(
  rows: readonly AmountRow[],
  order: SortOrder,
  page: number,
  limit: number
): string[] {
  const start = (page - 1) * limit;
  if (start >= rows.length) return [];

  return sortRowsByAbsAmount(rows, order)
    .slice(start, start + limit)
    .map(row => row.id);
}

/**
 * Restores the requested order after a lookup by ID.
 *
 * `findMany({ id: { in: ids } })` returns rows in whatever order the database finds
 * convenient, which would silently discard the ordering computed above.
 */
export function orderRowsByIds<T extends { id: string }>(rows: readonly T[], ids: readonly string[]): T[] {
  const byId = new Map(rows.map(row => [row.id, row]));

  return ids.reduce<T[]>((ordered, id) => {
    const row = byId.get(id);
    if (row !== undefined) ordered.push(row);
    return ordered;
  }, []);
}
