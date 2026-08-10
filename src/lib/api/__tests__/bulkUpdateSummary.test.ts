import { buildBulkUpdateSkipSummary } from '../bulkUpdateSummary';

describe('buildBulkUpdateSkipSummary', () => {
  it('attributes every non-updated row to the transfer/debt skip when no category is applied', () => {
    // 5 expense + 2 transfer + 1 debt
    const skipped = buildBulkUpdateSkipSummary({
      requestedCount: 8,
      eligibleCount: null,
      updatedCount: 5
    });

    expect(skipped).toEqual({ transferOrDebt: 3, categoryTypeMismatch: 0 });
  });

  it('attributes rows of the wrong type to the category mismatch skip', () => {
    // expense-only category applied to 4 expense + 3 income
    const skipped = buildBulkUpdateSkipSummary({
      requestedCount: 7,
      eligibleCount: 7,
      updatedCount: 4
    });

    expect(skipped).toEqual({ transferOrDebt: 0, categoryTypeMismatch: 3 });
  });

  it('reports no skips for a both-type category over a mixed selection', () => {
    const skipped = buildBulkUpdateSkipSummary({
      requestedCount: 5,
      eligibleCount: null,
      updatedCount: 5
    });

    expect(skipped).toEqual({ transferOrDebt: 0, categoryTypeMismatch: 0 });
  });

  it('separates both skip reasons when they occur together', () => {
    // expense-only category over 2 expense + 2 income + 1 transfer + 1 debt
    const skipped = buildBulkUpdateSkipSummary({
      requestedCount: 6,
      eligibleCount: 4,
      updatedCount: 2
    });

    expect(skipped).toEqual({ transferOrDebt: 2, categoryTypeMismatch: 2 });
  });

  it('reports everything as skipped when the selection is only transfers', () => {
    const skipped = buildBulkUpdateSkipSummary({
      requestedCount: 2,
      eligibleCount: null,
      updatedCount: 0
    });

    expect(skipped).toEqual({ transferOrDebt: 2, categoryTypeMismatch: 0 });
  });

  it('keeps the counts reconcilable against the original selection', () => {
    const cases = [
      { requestedCount: 8, eligibleCount: null, updatedCount: 5 },
      { requestedCount: 7, eligibleCount: 7, updatedCount: 4 },
      { requestedCount: 6, eligibleCount: 4, updatedCount: 2 },
      { requestedCount: 0, eligibleCount: null, updatedCount: 0 }
    ];

    for (const counts of cases) {
      const skipped = buildBulkUpdateSkipSummary(counts);
      expect(
        counts.updatedCount + skipped.transferOrDebt + skipped.categoryTypeMismatch
      ).toBe(counts.requestedCount);
    }
  });
});
