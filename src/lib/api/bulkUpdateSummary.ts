/**
 * Skip reasons reported back for a bulk update, so the UI can explain exactly
 * why a selection of N rows resulted in fewer than N updates.
 */
export interface BulkUpdateSkipSummary {
  /** Transfer and debt rows, which bulk edit never touches. */
  transferOrDebt: number;
  /** Rows whose type conflicts with a single-type (income-only/expense-only) category. */
  categoryTypeMismatch: number;
}

export interface BulkUpdateCounts {
  /** Rows matched by the request before any skip rule is applied. */
  requestedCount: number;
  /**
   * Rows left after removing transfer/debt rows, counted before the write.
   * Pass `null` when no category type constraint applies, in which case every
   * eligible row is updated and the value is implied by `updatedCount`.
   */
  eligibleCount: number | null;
  /** Rows actually written. */
  updatedCount: number;
}

/**
 * Derives the skip breakdown from the three counts taken around the update.
 *
 * The counts satisfy `updatedCount + transferOrDebt + categoryTypeMismatch === requestedCount`,
 * which keeps the reported numbers reconcilable against the user's selection.
 */
export function buildBulkUpdateSkipSummary({
  requestedCount,
  eligibleCount,
  updatedCount
}: BulkUpdateCounts): BulkUpdateSkipSummary {
  // Without a type constraint every eligible row was updated, so the counts coincide
  const eligible = eligibleCount ?? updatedCount;

  return {
    transferOrDebt: requestedCount - eligible,
    categoryTypeMismatch: eligible - updatedCount
  };
}
