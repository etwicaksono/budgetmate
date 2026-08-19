/**
 * Pure helpers for the backup import route.
 *
 * Kept out of the route handler so the parts that decide *what* gets written can be
 * unit tested without a database or an SSE stream.
 */

/** Which primary key an incoming backup record should be written to. */
export interface ResolvedId {
  /** True when the row already belongs to this user and should be updated in place. */
  update: boolean;
  id: string;
}

/**
 * Decides which primary key an imported record should land on.
 *
 * Preserving the backup's original ID is what makes importing the same file twice
 * idempotent: a later import finds the existing row and updates it instead of
 * inserting a near-identical copy. Previously every insert minted a fresh ID, so the
 * IDs in the database could never match the IDs in the file again and every re-import
 * duplicated the whole dataset.
 *
 * A fresh ID is only minted when the backup ID is already held by a *different* user,
 * where reusing it would collide on the primary key.
 *
 * @param owners Map of existing row ID to its owning user ID, for the current chunk.
 * @param generateId Fallback ID factory, used only on cross-user collisions.
 */
export function resolveImportId(
  backupId: string,
  owners: Map<string, string>,
  userId: string,
  generateId: () => string
): ResolvedId {
  const ownerId = owners.get(backupId);

  if (ownerId === userId) return { update: true, id: backupId };
  if (ownerId !== undefined) return { update: false, id: generateId() };

  return { update: false, id: backupId };
}

/**
 * Resolves the `analytic_flag` for an imported category.
 *
 * The column only carries meaning for `both` categories; for single-type categories it
 * mirrors the type. Backups written before exportVersion 1.1.0 omit the field entirely,
 * so it has to be derived. Mirrors the convention in the categories route.
 */
export function resolveAnalyticFlag(category: {
  type: string;
  analytic_flag?: string | undefined;
}): string {
  return category.analytic_flag ?? (category.type === 'both' ? 'expense' : category.type);
}

/**
 * Drops repeated pairs from a junction table payload, keeping the first occurrence.
 *
 * Junction rows carry a composite UNIQUE constraint, so a backup that somehow contains
 * the same pair twice would abort the entire insert batch.
 */
export function dedupePairs<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const k = key(row);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
