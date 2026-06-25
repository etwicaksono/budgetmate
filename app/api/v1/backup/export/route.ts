/**
 * Backup Export API Endpoint
 * 
 * GET /api/v1/backup/export
 * 
 * Exports all user data as a JSON file for backup purposes.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { commonErrors } from '@/lib/api/response';
import crypto from 'crypto';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const userId = authResult.user.user_id;

    // Get timestamp from query parameter (client's local time)
    const timestamp = request.nextUrl.searchParams.get('timestamp');

    // Validate timestamp format (YYYY-MM-DD_HHMMSS)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}_\d{6}$/;
    const isValidTimestamp = timestamp && timestampRegex.test(timestamp);

    // Use client's local timestamp if valid, otherwise fallback to server UTC time
    const finalTimestamp = isValidTimestamp
      ? timestamp
      : new Date().toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '')
        .replace(/\..+/, '')
        .substring(0, 17); // YYYY-MM-DD_HHMMSS

    // Fetch ALL user data with relations in a transaction
    const userData = await prisma.$transaction(async (tx) => {
      const [accounts, categories, transactions, transfers, labels, transactionLabels, user] =
        await Promise.all([
          // Accounts
          tx.account.findMany({
            where: { user_id: userId, deleted_at: null },
            orderBy: { created_at: 'asc' },
          }),

          // Categories with hierarchy (include all - system and user)
          tx.category.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'asc' },
          }),

          // Transactions
          tx.transaction.findMany({
            where: { user_id: userId, deleted_at: null },
            orderBy: { created_at: 'asc' },
          }),

          // Transfers
          tx.transfer.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'asc' },
          }),

          // Labels
          tx.label.findMany({
            where: { user_id: userId },
            orderBy: { created_at: 'asc' },
          }),

          // Transaction-Label relations
          tx.transactionLabel.findMany({
            where: {
              transaction: {
                user_id: userId,
              },
            },
          }),

          // User settings
          tx.user.findUnique({
            where: { id: userId },
            select: {
              email: true,
              username: true,
              timezone: true,
              locale: true,
              date_format: true,
              number_format: true,
            },
          }),
        ]);

      return {
        accounts,
        categories,
        transactions,
        transfers,
        labels,
        transactionLabels,
        user,
      };
    });

    if (!userData.user) {
      return commonErrors.notFound('User not found');
    }

    // Convert BigInt and Decimal to JSON-safe formats
    const sanitizedDataContent = {
      accounts: userData.accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        account_type: acc.account_type,
        initial_balance: Number(acc.initial_balance),
        icon: acc.icon,
        color: acc.color,
        is_active: acc.is_active,
        is_included_in_total: acc.is_included_in_total,
        created_at: acc.created_at.toISOString(),
        updated_at: acc.updated_at.toISOString(),
      })),
      categories: userData.categories.map((cat) => ({
        id: cat.id,
        parent_id: cat.parent_id,
        name: cat.name,
        type: cat.type,
        nature: cat.nature,
        icon: cat.icon,
        color: cat.color,
        is_active: cat.is_active,
        created_at: cat.created_at.toISOString(),
        updated_at: cat.updated_at.toISOString(),
      })),
      transactions: userData.transactions.map((tx) => ({
        id: tx.id,
        account_id: tx.account_id,
        category_id: tx.category_id,
        type: tx.type,
        amount: Number(tx.amount),
        date: tx.date.toISOString(),
        description: tx.description,
        payee: tx.payee,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        transfer_id: tx.transfer_id,
        created_at: tx.created_at.toISOString(),
        updated_at: tx.updated_at.toISOString(),
      })),
      transfers: userData.transfers.map((tr) => ({
        id: tr.id,
        date: tr.date.toISOString(),
        from_account: tr.from_account,
        to_account: tr.to_account,
        amount: Number(tr.amount),
        description: tr.description,
        created_at: tr.created_at.toISOString(),
        updated_at: tr.updated_at.toISOString(),
      })),
      labels: userData.labels.map((label) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        created_at: label.created_at.toISOString(),
        updated_at: label.updated_at.toISOString(),
      })),
      transactionLabels: userData.transactionLabels.map((tl) => ({
        id: tl.id,
        transaction_id: tl.transaction_id,
        label_id: tl.label_id,
      })),
    };

    // Build complete backup data structure
    const sanitizedData = {
      exportVersion: '1.0.0',
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      user: {
        email: userData.user.email,
        settings: {
          timezone: userData.user.timezone,
          locale: userData.user.locale,
          date_format: userData.user.date_format,
          number_format: userData.user.number_format,
        },
      },
      data: sanitizedDataContent,
      metadata: {
        totalRecords:
          userData.accounts.length +
          userData.categories.length +
          userData.transactions.length +
          userData.transfers.length +
          userData.labels.length +
          userData.transactionLabels.length,
        checksum: generateChecksum(sanitizedDataContent),
        recordCounts: {
          accounts: userData.accounts.length,
          categories: userData.categories.length,
          transactions: userData.transactions.length,
          transfers: userData.transfers.length,
          labels: userData.labels.length,
          transactionLabels: userData.transactionLabels.length,
        },
      },
    };

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json; charset=utf-8');

    // Use timestamp from client (local time) in filename
    const username = userData.user.username;
    headers.set(
      'Content-Disposition',
      `attachment; filename="finance-backup-${username}-${finalTimestamp}.json"`
    );

    return new NextResponse(JSON.stringify(sanitizedData, null, 2), {
      status: 200,
      headers,
    });
  } catch (error) {
    logError('Export error:', error);
    return commonErrors.serverError('Failed to export data');
  }
}

/**
 * Generate SHA-256 checksum for data integrity verification
 */
function generateChecksum(data: unknown): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').substring(0, 16);
}
