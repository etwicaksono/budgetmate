import { parseAnalyticsFilters, buildAnalyticsTransactionWhere } from '../analyticsFilters';

const params = (query: string) => new URLSearchParams(query);

describe('parseAnalyticsFilters', () => {
  it('defaults to excluding drafts with no other filters', () => {
    expect(parseAnalyticsFilters(params(''))).toEqual({
      accountIds: [],
      categoryIds: [],
      draftOption: 'exclude',
      labelConditions: []
    });
  });

  it('parses comma-separated account and category IDs', () => {
    const filters = parseAnalyticsFilters(params('account_ids=acc1,acc2&category_ids=cat1'));

    expect(filters.accountIds).toEqual(['acc1', 'acc2']);
    expect(filters.categoryIds).toEqual(['cat1']);
  });

  it('ignores empty entries in the ID lists', () => {
    expect(parseAnalyticsFilters(params('account_ids=,,')).accountIds).toEqual([]);
  });

  it('accepts only the known draft options and falls back to exclude', () => {
    expect(parseAnalyticsFilters(params('draft_option=include')).draftOption).toBe('include');
    expect(parseAnalyticsFilters(params('draft_option=only')).draftOption).toBe('only');
    expect(parseAnalyticsFilters(params('draft_option=bogus')).draftOption).toBe('exclude');
  });

  it('builds label conditions from both include and exclude params', () => {
    expect(parseAnalyticsFilters(params('label_ids=lbl1&exclude_label_ids=lbl2')).labelConditions).toEqual([
      { labels: { some: { label_id: { in: ['lbl1'] } } } },
      { labels: { none: { label_id: { in: ['lbl2'] } } } }
    ]);
  });

  it('caps each ID list at 50 entries', () => {
    const many = Array.from({ length: 60 }, (_, i) => `id${i}`).join(',');
    const filters = parseAnalyticsFilters(params(`account_ids=${many}&category_ids=${many}`));

    expect(filters.accountIds).toHaveLength(50);
    expect(filters.categoryIds).toHaveLength(50);
  });
});

describe('buildAnalyticsTransactionWhere', () => {
  it('hides drafts by default', () => {
    expect(buildAnalyticsTransactionWhere(parseAnalyticsFilters(params('')))).toEqual({ is_draft: false });
  });

  it('omits is_draft entirely when drafts are included', () => {
    expect(buildAnalyticsTransactionWhere(parseAnalyticsFilters(params('draft_option=include')))).toEqual({});
  });

  it('keeps only drafts when asked', () => {
    expect(buildAnalyticsTransactionWhere(parseAnalyticsFilters(params('draft_option=only')))).toEqual({
      is_draft: true
    });
  });

  it('maps account and category IDs onto `in` filters', () => {
    expect(
      buildAnalyticsTransactionWhere(parseAnalyticsFilters(params('account_ids=acc1&category_ids=cat1,cat2')))
    ).toEqual({
      is_draft: false,
      account_id: { in: ['acc1'] },
      category_id: { in: ['cat1', 'cat2'] }
    });
  });

  it('passes label conditions through as AND entries', () => {
    expect(
      buildAnalyticsTransactionWhere(parseAnalyticsFilters(params('label_ids=lbl1&exclude_label_ids=lbl2')))
    ).toEqual({
      is_draft: false,
      AND: [
        { labels: { some: { label_id: { in: ['lbl1'] } } } },
        { labels: { none: { label_id: { in: ['lbl2'] } } } }
      ]
    });
  });
});
