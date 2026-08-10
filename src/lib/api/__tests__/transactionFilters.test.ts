import { TransactionType } from '@prisma/client';

import { buildTransactionWhere, InvalidFilterError } from '../transactionFilters';

const USER_ID = 'user_123';

describe('buildTransactionWhere', () => {
  it('scopes to the user and excludes soft-deleted rows when no filters are given', async () => {
    const where = await buildTransactionWhere(USER_ID, undefined);

    expect(where).toEqual({
      user_id: USER_ID,
      deleted_at: null,
      is_draft: false
    });
  });

  it('defaults to excluding drafts when draft_option is absent', async () => {
    const where = await buildTransactionWhere(USER_ID, {});

    expect(where.is_draft).toBe(false);
  });

  it('omits the is_draft filter when draft_option is "include"', async () => {
    const where = await buildTransactionWhere(USER_ID, { draft_option: 'include' });

    expect(where).not.toHaveProperty('is_draft');
  });

  it('only matches drafts when draft_option is "only"', async () => {
    const where = await buildTransactionWhere(USER_ID, { draft_option: 'only' });

    expect(where.is_draft).toBe(true);
  });

  it('throws InvalidFilterError when both transfer and debt are set to "only"', async () => {
    await expect(
      buildTransactionWhere(USER_ID, { transfer_option: 'only', debt_option: 'only' })
    ).rejects.toBeInstanceOf(InvalidFilterError);
  });

  it('advances end_date to the last millisecond of the UTC day', async () => {
    const where = await buildTransactionWhere(USER_ID, {
      start_date: '2026-01-01T00:00:00.000Z',
      end_date: '2026-01-31T00:00:00.000Z'
    });

    const dateFilter = where.date as { gte: Date; lte: Date };
    expect(dateFilter.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(dateFilter.lte.toISOString()).toBe('2026-01-31T23:59:59.999Z');
  });

  it('caps comma-separated ID lists at 50 entries', async () => {
    const many = Array.from({ length: 60 }, (_, i) => `id${i}`).join(',');

    const where = await buildTransactionWhere(USER_ID, {
      account_ids: many,
      category_ids: many,
      label_ids: many
    });

    expect((where.account_id as { in: string[] }).in).toHaveLength(50);
    expect((where.category_id as { in: string[] }).in).toHaveLength(50);
    expect(
      ((where.labels as { some: { label_id: { in: string[] } } }).some.label_id.in)
    ).toHaveLength(50);
  });

  it('pushes amount range and search into AND without overwriting other keys', async () => {
    const where = await buildTransactionWhere(USER_ID, {
      min_amount: 1000,
      max_amount: 5000,
      search: 'kopi',
      account_ids: 'acc1'
    });

    expect(where.account_id).toEqual({ in: ['acc1'] });
    expect(where.AND).toHaveLength(2);
    expect(where.AND).toEqual([
      {
        OR: [
          { amount: { gte: 1000, lte: 5000 } },
          { amount: { gte: -5000, lt: -1000 } }
        ]
      },
      {
        OR: [
          { description: { contains: 'kopi', mode: 'insensitive' } },
          { payee: { contains: 'kopi', mode: 'insensitive' } }
        ]
      }
    ]);
  });

  it('treats keyword as an alias for search', async () => {
    const where = await buildTransactionWhere(USER_ID, { keyword: 'listrik' });

    expect(where.AND).toEqual([
      {
        OR: [
          { description: { contains: 'listrik', mode: 'insensitive' } },
          { payee: { contains: 'listrik', mode: 'insensitive' } }
        ]
      }
    ]);
  });

  it('keeps zero-amount rows in the positive branch when min_amount is 0', async () => {
    const where = await buildTransactionWhere(USER_ID, { max_amount: 200 });

    expect(where.AND).toEqual([
      {
        OR: [
          { amount: { gte: 0, lte: 200 } },
          { amount: { gte: -200, lt: 0 } }
        ]
      }
    ]);
  });

  it('excludes transfer and debt types when both options are "exclude"', async () => {
    const where = await buildTransactionWhere(USER_ID, {
      transfer_option: 'exclude',
      debt_option: 'exclude'
    });

    expect(where.type).toEqual({
      notIn: [
        TransactionType.transfer_in,
        TransactionType.transfer_out,
        TransactionType.debt_in,
        TransactionType.debt_out
      ]
    });
  });

  it('lets an explicit type win over the transfer/debt toggles', async () => {
    const where = await buildTransactionWhere(USER_ID, {
      type: 'expense',
      transfer_option: 'only'
    });

    expect(where.type).toBe(TransactionType.expense);
  });

  it('ignores type="all" and falls back to the toggles', async () => {
    const where = await buildTransactionWhere(USER_ID, {
      type: 'all',
      transfer_option: 'only'
    });

    expect(where.type).toEqual({
      in: [TransactionType.transfer_in, TransactionType.transfer_out]
    });
  });

  it('expands a single category_id into its children when a resolver is supplied', async () => {
    const where = await buildTransactionWhere(
      USER_ID,
      { category_id: 'parent1' },
      { resolveCategoryChildren: async () => ['child1', 'child2'] }
    );

    expect(where.category_id).toEqual({ in: ['parent1', 'child1', 'child2'] });
  });

  it('falls back to the exact category_id when no children exist', async () => {
    const where = await buildTransactionWhere(
      USER_ID,
      { category_id: 'leaf1' },
      { resolveCategoryChildren: async () => [] }
    );

    expect(where.category_id).toBe('leaf1');
  });

  it('prefers category_ids over category_id and skips the resolver', async () => {
    const resolver = jest.fn(async () => ['child1']);

    const where = await buildTransactionWhere(
      USER_ID,
      { category_ids: 'c1,c2', category_id: 'parent1' },
      { resolveCategoryChildren: resolver }
    );

    expect(where.category_id).toEqual({ in: ['c1', 'c2'] });
    expect(resolver).not.toHaveBeenCalled();
  });

  it('omits AND entirely when no range or search filter is used', async () => {
    const where = await buildTransactionWhere(USER_ID, { account_ids: 'acc1' });

    expect(where).not.toHaveProperty('AND');
  });
});
