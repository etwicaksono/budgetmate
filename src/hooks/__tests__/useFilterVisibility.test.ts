import { mergeStoredVisibility } from '../useFilterVisibility';

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const DEFAULTS = {
  accounts: true,
  drafts: true,
} as const;

describe('mergeStoredVisibility', () => {
  it('uses the defaults when nothing is stored', () => {
    expect(mergeStoredVisibility({ ...DEFAULTS }, null)).toEqual({
      accounts: true,
      drafts: true,
    });
  });

  it('restores a hidden filter so it stays hidden after a reload', () => {
    expect(mergeStoredVisibility({ ...DEFAULTS }, '{"accounts":false}')).toEqual({
      accounts: false,
      drafts: true,
    });
  });

  it('falls back to the defaults when the stored value is malformed', () => {
    expect(mergeStoredVisibility({ ...DEFAULTS }, 'not json')).toEqual({
      accounts: true,
      drafts: true,
    });
  });

  it('ignores non-object JSON', () => {
    expect(mergeStoredVisibility({ ...DEFAULTS }, '[false]')).toEqual(DEFAULTS);
    expect(mergeStoredVisibility({ ...DEFAULTS }, 'null')).toEqual(DEFAULTS);
    expect(mergeStoredVisibility({ ...DEFAULTS }, '"accounts"')).toEqual(DEFAULTS);
  });

  it('ignores non-boolean values rather than treating them as truthy', () => {
    expect(mergeStoredVisibility({ ...DEFAULTS }, '{"accounts":"false","drafts":0}')).toEqual({
      accounts: true,
      drafts: true,
    });
  });

  it('drops keys the sidebar no longer offers, so a stale entry cannot add a filter', () => {
    const merged = mergeStoredVisibility({ ...DEFAULTS }, '{"currencies":false,"drafts":false}');

    expect(merged).toEqual({ accounts: true, drafts: false });
    expect(merged).not.toHaveProperty('currencies');
  });

  it('does not mutate the defaults it was given', () => {
    const defaults = { ...DEFAULTS };
    mergeStoredVisibility(defaults, '{"accounts":false,"drafts":false}');

    expect(defaults).toEqual({ accounts: true, drafts: true });
  });
});
