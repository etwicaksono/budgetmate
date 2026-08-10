import {
  buildBulkEditPayload,
  hasBulkEditChanges,
  type BulkEditFormState
} from '../bulkEditPayload';

const emptyState: BulkEditFormState = {
  description: '',
  payee: '',
  paymentMethod: '',
  paymentStatus: '',
  categoryId: null,
  replaceLabels: false,
  labelIds: []
};

const stateWith = (overrides: Partial<BulkEditFormState>): BulkEditFormState => ({
  ...emptyState,
  ...overrides
});

describe('buildBulkEditPayload', () => {
  it('returns an empty payload when nothing was filled in', () => {
    const payload = buildBulkEditPayload(emptyState);

    expect(payload).toEqual({});
    expect(hasBulkEditChanges(payload)).toBe(false);
  });

  it('sends only payee when payee alone is filled', () => {
    const payload = buildBulkEditPayload(stateWith({ payee: 'Starbucks' }));

    expect(payload).toEqual({ payee: 'Starbucks' });
    expect(hasBulkEditChanges(payload)).toBe(true);
  });

  it('sends only category_id when a category alone is picked', () => {
    const payload = buildBulkEditPayload(stateWith({ categoryId: 'cat_1' }));

    expect(payload).toEqual({ category_id: 'cat_1' });
    expect(hasBulkEditChanges(payload)).toBe(true);
  });

  it('omits category_id after the category is cleared', () => {
    const payload = buildBulkEditPayload(stateWith({ categoryId: null, payee: 'Kopi' }));

    expect(payload).not.toHaveProperty('category_id');
    expect(payload).toEqual({ payee: 'Kopi' });
  });

  it('treats whitespace-only text as no change', () => {
    const payload = buildBulkEditPayload(stateWith({ description: '   ', payee: '\t\n ' }));

    expect(payload).toEqual({});
    expect(hasBulkEditChanges(payload)).toBe(false);
  });

  it('trims surrounding whitespace on text fields', () => {
    const payload = buildBulkEditPayload(
      stateWith({ description: '  Lunch  ', payee: '  Warung Padang ' })
    );

    expect(payload).toEqual({ description: 'Lunch', payee: 'Warung Padang' });
  });

  it('omits payment select keys when left on "no change"', () => {
    const payload = buildBulkEditPayload(stateWith({ description: 'Lunch' }));

    expect(payload).not.toHaveProperty('payment_method');
    expect(payload).not.toHaveProperty('payment_status');
  });

  it('sends payment method and status once chosen', () => {
    const payload = buildBulkEditPayload(
      stateWith({ paymentMethod: 'Cash', paymentStatus: 'Cleared' })
    );

    expect(payload).toEqual({ payment_method: 'Cash', payment_status: 'Cleared' });
  });

  describe('label truth table', () => {
    it('replace + labels swaps the existing labels', () => {
      const payload = buildBulkEditPayload(
        stateWith({ replaceLabels: true, labelIds: ['lbl_1', 'lbl_2'] })
      );

      expect(payload).toEqual({ label_ids: ['lbl_1', 'lbl_2'], label_mode: 'replace' });
      expect(hasBulkEditChanges(payload)).toBe(true);
    });

    it('replace + no labels clears every label', () => {
      const payload = buildBulkEditPayload(stateWith({ replaceLabels: true, labelIds: [] }));

      expect(payload).toEqual({ label_ids: [], label_mode: 'replace' });
      expect(hasBulkEditChanges(payload)).toBe(true);
    });

    it('append + labels adds to whatever is already there', () => {
      const payload = buildBulkEditPayload(
        stateWith({ replaceLabels: false, labelIds: ['lbl_1'] })
      );

      expect(payload).toEqual({ label_ids: ['lbl_1'], label_mode: 'append' });
      expect(hasBulkEditChanges(payload)).toBe(true);
    });

    it('append + no labels leaves labels out of the payload entirely', () => {
      const payload = buildBulkEditPayload(stateWith({ replaceLabels: false, labelIds: [] }));

      expect(payload).not.toHaveProperty('label_ids');
      expect(payload).not.toHaveProperty('label_mode');
      expect(hasBulkEditChanges(payload)).toBe(false);
    });

    it('never sends label_mode without label_ids', () => {
      const states: BulkEditFormState[] = [
        stateWith({ replaceLabels: true, labelIds: ['lbl_1'] }),
        stateWith({ replaceLabels: true, labelIds: [] }),
        stateWith({ replaceLabels: false, labelIds: ['lbl_1'] }),
        stateWith({ replaceLabels: false, labelIds: [] }),
        stateWith({ payee: 'Toko' })
      ];

      for (const state of states) {
        const payload = buildBulkEditPayload(state);
        if (payload.label_mode !== undefined) {
          expect(payload.label_ids).toBeDefined();
        }
      }
    });
  });

  it('includes every field when all of them are set', () => {
    const payload = buildBulkEditPayload({
      description: 'Monthly groceries',
      payee: 'Superindo',
      paymentMethod: 'Debit Card',
      paymentStatus: 'Cleared',
      categoryId: 'cat_groceries',
      replaceLabels: true,
      labelIds: ['lbl_food']
    });

    expect(payload).toEqual({
      description: 'Monthly groceries',
      payee: 'Superindo',
      payment_method: 'Debit Card',
      payment_status: 'Cleared',
      category_id: 'cat_groceries',
      label_ids: ['lbl_food'],
      label_mode: 'replace'
    });
  });
});
