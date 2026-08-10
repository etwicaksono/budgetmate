import type { Prisma } from '@prisma/client';
import {
  buildAffectedTransferWhere,
  buildSoftDeleteStamp,
  buildSoftDeleteWhere
} from '../transactionSoftDelete';

const USER = 'user_1';

describe('buildSoftDeleteWhere', () => {
  const baseWhere: Prisma.TransactionWhereInput = {
    id: { in: ['tx_1', 'tx_2'] },
    user_id: USER,
    deleted_at: null
  };

  it('scopes the update to the user', () => {
    expect(buildSoftDeleteWhere(USER, baseWhere).user_id).toBe(USER);
  });

  it('only touches rows that are not already deleted', () => {
    // Without this a repeated request would re-stamp rows and inflate deletedCount
    expect(buildSoftDeleteWhere(USER, baseWhere).deleted_at).toBeNull();
  });

  it('keeps the original selection as the first branch', () => {
    const where = buildSoftDeleteWhere(USER, baseWhere);

    expect(where.OR?.[0]).toEqual(baseWhere);
  });

  it('pulls in sibling legs of any transfer the selection touches', () => {
    const where = buildSoftDeleteWhere(USER, baseWhere);

    expect(where.OR?.[1]).toEqual({ transfer: { transactions: { some: baseWhere } } });
  });

  it('does not materialise an id list for the paired legs', () => {
    const serialised = JSON.stringify(buildSoftDeleteWhere(USER, baseWhere));

    expect(serialised).not.toContain('transfer_id');
  });

  it('passes a filter-based selection through untouched', () => {
    const filterWhere: Prisma.TransactionWhereInput = {
      user_id: USER,
      deleted_at: null,
      AND: [{ date: { gte: new Date('2026-01-01') } }]
    };

    const where = buildSoftDeleteWhere(USER, filterWhere);

    expect(where.OR?.[0]).toEqual(filterWhere);
    expect(where.OR?.[1]).toEqual({ transfer: { transactions: { some: filterWhere } } });
  });
});

describe('buildAffectedTransferWhere', () => {
  const baseWhere: Prisma.TransactionWhereInput = {
    id: { in: ['tx_1'] },
    user_id: USER,
    deleted_at: null
  };

  it('scopes transfers to the user', () => {
    expect(buildAffectedTransferWhere(USER, baseWhere).user_id).toBe(USER);
  });

  it('matches transfers that own at least one selected leg', () => {
    expect(buildAffectedTransferWhere(USER, baseWhere).transactions).toEqual({
      some: baseWhere
    });
  });
});

describe('buildSoftDeleteStamp', () => {
  it('writes deleted_at, updated_at and updated_by from a single timestamp', () => {
    const now = new Date('2026-08-10T10:00:00.000Z');

    expect(buildSoftDeleteStamp(USER, now)).toEqual({
      deleted_at: now,
      updated_at: now,
      updated_by: USER
    });
  });

  it('uses the same instant for deleted_at and updated_at', () => {
    const stamp = buildSoftDeleteStamp(USER, new Date());

    expect(stamp.deleted_at.getTime()).toBe(stamp.updated_at.getTime());
  });
});
