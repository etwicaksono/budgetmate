import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';

/**
 * Balance Service
 *
 * Calculates account balances from transactions on-demand.
 * Formula: current_balance = initial_balance + SUM(transaction.amount WHERE deleted_at IS NULL [AND is_draft = false])
 *
 * Benefits:
 * - Always mathematically correct (no sync issues)
 * - Simpler code (no balance management)
 * - Audit trail preserved
 * - Time-travel queries possible
 */
export class BalanceService {
  /**
   * Calculate current balance for a single account
   * Uses optimized SQL query with index
   * @param options.includeDraft - If true, include draft transactions in balance. Default: false.
   */
  async calculateAccountBalance(
    accountId: string,
    options?: { includeDraft?: boolean }
  ): Promise<number> {
    const includeDraft = options?.includeDraft ?? false;
    const result = await prisma.$queryRaw<Array<{ balance: Prisma.Decimal }>>`
      SELECT
        (a.initial_balance + COALESCE(SUM(t.amount), 0)) as balance
      FROM "Account" a
      LEFT JOIN "Transaction" t
        ON t.account_id = a.id
        AND t.deleted_at IS NULL
        ${includeDraft ? Prisma.empty : Prisma.sql`AND (t.is_draft = false OR t.is_draft IS NULL)`}
      WHERE a.id = ${accountId}
      GROUP BY a.id, a.initial_balance
    `;

    if (!result || result.length === 0 || !result[0]) {
      return 0;
    }

    const balance = result[0].balance;
    if (!balance) return 0;

    return typeof balance === 'number'
      ? balance
      : balance.toNumber();
  }

  /**
   * Calculate balances for multiple accounts efficiently
   * Uses single query for all accounts
   * @param options.includeDraft - If true, include draft transactions in balance. Default: false.
   */
  async calculateAccountBalances(
    accountIds: string[],
    options?: { includeDraft?: boolean }
  ): Promise<Map<string, number>> {
    if (accountIds.length === 0) {
      return new Map();
    }

    const includeDraft = options?.includeDraft ?? false;
    const result = await prisma.$queryRaw<Array<{ id: string; balance: Prisma.Decimal }>>`
      SELECT
        a.id,
        (a.initial_balance + COALESCE(SUM(t.amount), 0)) as balance
      FROM "Account" a
      LEFT JOIN "Transaction" t
        ON t.account_id = a.id
        AND t.deleted_at IS NULL
        ${includeDraft ? Prisma.empty : Prisma.sql`AND (t.is_draft = false OR t.is_draft IS NULL)`}
      WHERE a.id = ANY(${accountIds}::text[])
      GROUP BY a.id, a.initial_balance
    `;

    const balanceMap = new Map<string, number>();
    for (const row of result) {
      if (!row || !row.balance) continue;

      const balance = typeof row.balance === 'number'
        ? row.balance
        : row.balance.toNumber();
      balanceMap.set(row.id, balance);
    }

    return balanceMap;
  }

  /**
   * Calculate total balance for a user
   * Only includes active accounts that are marked as included_in_total
   * @param options.includeDraft - If true, include draft transactions in balance. Default: false.
   */
  async calculateUserTotalBalance(
    userId: string,
    options?: { includeInactive?: boolean; includeDraft?: boolean }
  ): Promise<number> {
    const includeInactive = options?.includeInactive ?? false;
    const includeDraft = options?.includeDraft ?? false;

    const result = await prisma.$queryRaw<Array<{ total: Prisma.Decimal }>>`
      SELECT
        SUM(a.initial_balance + COALESCE(t.amount_sum, 0)) as total
      FROM "Account" a
      LEFT JOIN (
        SELECT account_id, SUM(amount) as amount_sum
        FROM "Transaction"
        WHERE deleted_at IS NULL
        ${includeDraft ? Prisma.empty : Prisma.sql`AND (is_draft = false OR is_draft IS NULL)`}
        GROUP BY account_id
      ) t ON t.account_id = a.id
      WHERE a.user_id = ${userId}
        AND a.deleted_at IS NULL
        AND a.is_included_in_total = true
        ${includeInactive ? Prisma.empty : Prisma.sql`AND a.is_active = true`}
    `;

    if (!result || result.length === 0 || !result[0] || result[0].total === null) {
      return 0;
    }

    const total = result[0].total;
    if (!total) return 0;

    return typeof total === 'number'
      ? total
      : total.toNumber();
  }

  /**
   * Calculate balance at a specific date (time-travel query)
   * Useful for historical reports and balance verification
   * @param options.includeDraft - If true, include draft transactions in balance. Default: false.
   */
  async calculateBalanceAtDate(
    accountId: string,
    date: Date,
    options?: { includeDraft?: boolean }
  ): Promise<number> {
    const includeDraft = options?.includeDraft ?? false;
    const result = await prisma.$queryRaw<Array<{ balance: Prisma.Decimal }>>`
      SELECT
        (a.initial_balance + COALESCE(SUM(t.amount), 0)) as balance
      FROM "Account" a
      LEFT JOIN "Transaction" t
        ON t.account_id = a.id
        AND t.date <= ${date}
        AND t.deleted_at IS NULL
        ${includeDraft ? Prisma.empty : Prisma.sql`AND (t.is_draft = false OR t.is_draft IS NULL)`}
      WHERE a.id = ${accountId}
      GROUP BY a.id, a.initial_balance
    `;

    if (!result || result.length === 0 || !result[0]) {
      return 0;
    }

    const balance = result[0].balance;
    if (!balance) return 0;

    return typeof balance === 'number'
      ? balance
      : balance.toNumber();
  }

  /**
   * Verify balance integrity
   * NOTE: This method is deprecated since current_balance column was removed.
   * All balances are now calculated on-demand and are always correct.
   * Kept for reference/documentation purposes.
   */
  async verifyBalanceIntegrity(): Promise<Array<{
    accountId: string;
    accountName: string;
    storedBalance: number;
    calculatedBalance: number;
    drift: number;
  }>> {
    // Method deprecated - all balances are now calculated and always correct
    return [];
  }
}

export const balanceService = new BalanceService();
