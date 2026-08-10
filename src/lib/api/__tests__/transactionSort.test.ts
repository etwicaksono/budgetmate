import {
  orderRowsByIds,
  selectAbsAmountPageIds,
  sortRowsByAbsAmount,
  type AmountRow
} from '../transactionSort';

const rows: AmountRow[] = [
  { id: 'a', amount: -500 },
  { id: 'b', amount: 200 },
  { id: 'c', amount: -50 },
  { id: 'd', amount: 1000 }
];

describe('sortRowsByAbsAmount', () => {
  it('ignores the sign when ascending', () => {
    expect(sortRowsByAbsAmount(rows, 'asc').map(r => r.id)).toEqual(['c', 'b', 'a', 'd']);
  });

  it('ignores the sign when descending', () => {
    expect(sortRowsByAbsAmount(rows, 'desc').map(r => r.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('differs from signed ordering, which is the whole point of the option', () => {
    const signedAsc = [...rows].sort((a, b) => a.amount - b.amount).map(r => r.id);
    const absAsc = sortRowsByAbsAmount(rows, 'asc').map(r => r.id);

    expect(signedAsc).toEqual(['a', 'c', 'b', 'd']);
    expect(absAsc).not.toEqual(signedAsc);
  });

  it('ranks an expense and an income of equal magnitude together', () => {
    const pair: AmountRow[] = [
      { id: 'income', amount: 500 },
      { id: 'gap', amount: -10 },
      { id: 'expense', amount: -500 }
    ];

    expect(sortRowsByAbsAmount(pair, 'desc').map(r => r.id)).toEqual(['expense', 'income', 'gap']);
  });

  it('breaks ties by id so the order is stable across requests', () => {
    const ties: AmountRow[] = [
      { id: 'z', amount: -100 },
      { id: 'a', amount: 100 },
      { id: 'm', amount: -100 }
    ];

    expect(sortRowsByAbsAmount(ties, 'asc').map(r => r.id)).toEqual(['a', 'm', 'z']);
    expect(sortRowsByAbsAmount(ties, 'desc').map(r => r.id)).toEqual(['a', 'm', 'z']);
  });

  it('does not mutate the input', () => {
    const original = [...rows];
    sortRowsByAbsAmount(rows, 'desc');

    expect(rows).toEqual(original);
  });

  it('handles an empty set', () => {
    expect(sortRowsByAbsAmount([], 'asc')).toEqual([]);
  });
});

describe('selectAbsAmountPageIds', () => {
  it('returns the first page in magnitude order', () => {
    expect(selectAbsAmountPageIds(rows, 'asc', 1, 2)).toEqual(['c', 'b']);
  });

  it('returns the second page continuing the same order', () => {
    expect(selectAbsAmountPageIds(rows, 'asc', 2, 2)).toEqual(['a', 'd']);
  });

  it('paginates over the whole result set, not within a page', () => {
    const page1 = selectAbsAmountPageIds(rows, 'desc', 1, 2);
    const page2 = selectAbsAmountPageIds(rows, 'desc', 2, 2);

    expect(page1).toEqual(['d', 'a']);
    expect(page2).toEqual(['b', 'c']);
    expect(new Set([...page1, ...page2]).size).toBe(rows.length);
  });

  it('returns nothing past the end', () => {
    expect(selectAbsAmountPageIds(rows, 'asc', 99, 10)).toEqual([]);
  });

  it('returns a partial last page', () => {
    expect(selectAbsAmountPageIds(rows, 'asc', 2, 3)).toEqual(['d']);
  });
});

describe('orderRowsByIds', () => {
  it('restores the requested order', () => {
    const fetched = [
      { id: 'b', label: 'second' },
      { id: 'a', label: 'first' }
    ];

    expect(orderRowsByIds(fetched, ['a', 'b']).map(r => r.label)).toEqual(['first', 'second']);
  });

  it('drops ids that no longer resolve to a row', () => {
    const fetched = [{ id: 'a' }];

    expect(orderRowsByIds(fetched, ['a', 'missing'])).toEqual([{ id: 'a' }]);
  });

  it('returns an empty list when nothing was requested', () => {
    expect(orderRowsByIds([{ id: 'a' }], [])).toEqual([]);
  });
});
