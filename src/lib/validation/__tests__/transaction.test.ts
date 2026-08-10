import { BulkUpdateTransactionsSchema } from '../transaction';

const TX_ID = 'clq1234560000000000000000';
const LABEL_ID = 'clqlabel1234560000000000';

const parse = (input: unknown) => BulkUpdateTransactionsSchema.safeParse(input);

describe('BulkUpdateTransactionsSchema', () => {
  it('requires either ids or allMatching', () => {
    const result = parse({ data: { payee: 'Toko' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('Must provide ids or set allMatching to true');
    }
  });

  it('accepts allMatching without ids', () => {
    expect(parse({ allMatching: true, data: { payee: 'Toko' } }).success).toBe(true);
  });

  it('rejects an empty data object', () => {
    const result = parse({ ids: [TX_ID], data: {} });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('At least one field must be provided');
    }
  });

  it('still rejects empty data even though label_mode is defaulted', () => {
    // label_mode carries a default, so it must not be counted as a user-provided change
    const result = parse({ ids: [TX_ID], data: { label_mode: 'append' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe('At least one field must be provided');
    }
  });

  it('defaults label_mode to append when labels are sent without a mode', () => {
    const result = parse({ ids: [TX_ID], data: { label_ids: [LABEL_ID] } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.label_mode).toBe('append');
    }
  });

  it('accepts an explicit replace mode with an empty label list', () => {
    const result = parse({ ids: [TX_ID], data: { label_ids: [], label_mode: 'replace' } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.label_mode).toBe('replace');
      expect(result.data.data.label_ids).toEqual([]);
    }
  });

  it('rejects an unknown label mode', () => {
    expect(parse({ ids: [TX_ID], data: { label_ids: [], label_mode: 'merge' } }).success).toBe(false);
  });

  it('rejects whitespace-only text so it cannot wipe a field', () => {
    expect(parse({ ids: [TX_ID], data: { payee: '   ' } }).success).toBe(false);
  });

  it('trims text values that survive validation', () => {
    const result = parse({ ids: [TX_ID], data: { payee: '  Toko  ' } });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.payee).toBe('Toko');
    }
  });

  it.each([
    ['payee', 'a'.repeat(256)],
    ['payment_method', 'a'.repeat(51)],
    ['payment_status', 'a'.repeat(33)]
  ])('rejects %s beyond its column length', (field, value) => {
    expect(parse({ ids: [TX_ID], data: { [field]: value } }).success).toBe(false);
  });

  it('rejects a non-CUID category id', () => {
    expect(parse({ ids: [TX_ID], data: { category_id: 'not-a-cuid' } }).success).toBe(false);
  });

  it('caps the number of ids per request', () => {
    const result = parse({ ids: Array(1001).fill(TX_ID), data: { payee: 'Toko' } });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toBe(
        'Cannot update more than 1000 transactions by ID'
      );
    }
  });
});
