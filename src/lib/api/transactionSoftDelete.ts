import type { Prisma } from '@prisma/client';

/** Timestamps written when a transaction is soft deleted. */
export interface SoftDeleteStamp {
  deleted_at: Date;
  updated_at: Date;
  updated_by: string;
}

/**
 * Widens a selection so it also covers the remaining legs of any transfer it touches.
 *
 * A transfer is two rows that must appear or disappear together; deleting only the
 * selected leg would leave the two accounts permanently unbalanced. The pairing is
 * expressed as a relation filter rather than a materialised ID list so it stays a
 * single statement no matter how many rows match.
 *
 * `deleted_at: null` is what makes a repeat request a no-op instead of re-stamping
 * rows that were already deleted.
 */
export function buildSoftDeleteWhere(
  userId: string,
  baseWhere: Prisma.TransactionWhereInput
): Prisma.TransactionWhereInput {
  return {
    user_id: userId,
    deleted_at: null,
    OR: [baseWhere, { transfer: { transactions: { some: baseWhere } } }]
  };
}

/**
 * Finds the transfer records whose legs are about to be deleted, so they can be
 * audit-stamped.
 *
 * Must be evaluated *before* the legs are stamped: `baseWhere` matches only rows
 * with `deleted_at: null`, so afterwards it would find nothing.
 */
export function buildAffectedTransferWhere(
  userId: string,
  baseWhere: Prisma.TransactionWhereInput
): Prisma.TransferWhereInput {
  return {
    user_id: userId,
    transactions: { some: baseWhere }
  };
}

export function buildSoftDeleteStamp(userId: string, now: Date): SoftDeleteStamp {
  return { deleted_at: now, updated_at: now, updated_by: userId };
}
