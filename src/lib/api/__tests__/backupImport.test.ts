import { dedupePairs, resolveAnalyticFlag, resolveImportId } from '../backupImport';

const USER = 'user_1';
const OTHER_USER = 'user_2';
const GENERATED = 'generated_id';
const generateId = () => GENERATED;

describe('resolveImportId', () => {
  it('updates in place when the row already belongs to the user', () => {
    const owners = new Map([['acc_1', USER]]);

    expect(resolveImportId('acc_1', owners, USER, generateId)).toEqual({
      update: true,
      id: 'acc_1'
    });
  });

  it('keeps the original ID when the key is free', () => {
    // This is what makes a repeat import idempotent instead of duplicating everything
    expect(resolveImportId('acc_1', new Map(), USER, generateId)).toEqual({
      update: false,
      id: 'acc_1'
    });
  });

  it('mints a new ID when another user already holds the key', () => {
    const owners = new Map([['acc_1', OTHER_USER]]);

    expect(resolveImportId('acc_1', owners, USER, generateId)).toEqual({
      update: false,
      id: GENERATED
    });
  });

  it('never reassigns a key owned by another user', () => {
    const owners = new Map([['acc_1', OTHER_USER]]);

    expect(resolveImportId('acc_1', owners, USER, generateId).id).not.toBe('acc_1');
  });

  it('is idempotent across two consecutive imports of the same record', () => {
    const owners = new Map<string, string>();

    const first = resolveImportId('acc_1', owners, USER, generateId);
    expect(first).toEqual({ update: false, id: 'acc_1' });

    // Simulate the row the first pass inserted
    owners.set(first.id, USER);

    const second = resolveImportId('acc_1', owners, USER, generateId);
    expect(second).toEqual({ update: true, id: 'acc_1' });
  });
});

describe('resolveAnalyticFlag', () => {
  it('keeps an explicit flag from a 1.1.0 backup', () => {
    expect(resolveAnalyticFlag({ type: 'both', analytic_flag: 'income' })).toBe('income');
  });

  it('defaults a both category to expense when the flag is missing', () => {
    expect(resolveAnalyticFlag({ type: 'both' })).toBe('expense');
  });

  it('mirrors the type for single-type categories', () => {
    expect(resolveAnalyticFlag({ type: 'income' })).toBe('income');
    expect(resolveAnalyticFlag({ type: 'expense' })).toBe('expense');
  });
});

describe('dedupePairs', () => {
  const key = (r: { a: string; b: string }) => `${r.a}|${r.b}`;

  it('removes repeated pairs that would violate the unique constraint', () => {
    const rows = [
      { a: 'tx_1', b: 'lbl_1' },
      { a: 'tx_1', b: 'lbl_1' },
      { a: 'tx_1', b: 'lbl_2' }
    ];

    expect(dedupePairs(rows, key)).toEqual([
      { a: 'tx_1', b: 'lbl_1' },
      { a: 'tx_1', b: 'lbl_2' }
    ]);
  });

  it('keeps the first occurrence', () => {
    const rows = [
      { a: 'tx_1', b: 'lbl_1', tag: 'first' },
      { a: 'tx_1', b: 'lbl_1', tag: 'second' }
    ];

    expect(dedupePairs(rows, key)[0]?.tag).toBe('first');
  });

  it('leaves an already unique list untouched', () => {
    const rows = [
      { a: 'tx_1', b: 'lbl_1' },
      { a: 'tx_2', b: 'lbl_1' }
    ];

    expect(dedupePairs(rows, key)).toHaveLength(2);
  });

  it('handles an empty list', () => {
    expect(dedupePairs([], key)).toEqual([]);
  });
});
