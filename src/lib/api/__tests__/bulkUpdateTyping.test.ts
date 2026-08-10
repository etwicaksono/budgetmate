import type { Prisma } from '@prisma/client';

// Regression guard: category_id is a foreign-key scalar, so it only exists on the
// Unchecked variant. Typing the bulk update payload as the checked
// TransactionUpdateManyMutationInput silently dropped category_id past tsc
// (conditional spreads skip excess-property checks) and blew up at runtime.
describe('Prisma bulk update payload typing', () => {
  it('accepts category_id on the unchecked update-many input', () => {
    const update: Prisma.TransactionUncheckedUpdateManyInput = {
      category_id: 'cat_1',
      payee: 'Supermarket',
      updated_at: new Date(),
      updated_by: 'user_1'
    };

    expect(update.category_id).toBe('cat_1');
  });

  it('does not expose category_id on the checked update-many input', () => {
    type CheckedKeys = keyof Prisma.TransactionUpdateManyMutationInput;

    // Fails to compile if a future Prisma version starts exposing category_id here,
    // at which point the handler's Unchecked annotation can be revisited.
    const hasCategoryId: 'category_id' extends CheckedKeys ? true : false = false;

    expect(hasCategoryId).toBe(false);
  });
});
