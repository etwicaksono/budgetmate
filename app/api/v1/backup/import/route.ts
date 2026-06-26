/**
 * Backup Import API Endpoint
 *
 * POST /api/v1/backup/import?mode=replace|merge
 *
 * Imports and restores user data from backup JSON file.
 * Uses SSE (Server-Sent Events) to stream progress updates.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AccountType, CategoryNature, CategoryType, DebtStatus, DebtType, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { commonErrors } from '@/lib/api/response';
import { BackupDataSchema, isVersionCompatible } from '@/lib/validation/backupSchemas';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { logError } from '@/lib/logger';

// Allow up to 5 minutes for large imports
export const maxDuration = 300;

// Chunk size for batch processing
const CHUNK_SIZE = 50;

// Split array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Progress weight ranges per step
const PROGRESS_RANGES = {
  cleared: { start: 0, end: 5 },
  accounts: { start: 5, end: 20 },
  categories: { start: 20, end: 30 },
  categoryBudgets: { start: 30, end: 35 },
  debts: { start: 35, end: 45 },
  labels: { start: 45, end: 55 },
  transfers: { start: 55, end: 65 },
  transactions: { start: 65, end: 90 },
  transactionLabels: { start: 90, end: 100 },
} as const;

function calculateProgress(
  step: keyof typeof PROGRESS_RANGES,
  currentIndex: number,
  totalCount: number
): number {
  const { start, end } = PROGRESS_RANGES[step];
  if (totalCount === 0) return end;
  return Math.min(end, Math.round(start + (currentIndex / totalCount) * (end - start)));
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);

    if ('error' in authResult) {
      return authResult.error;
    }

    const userId = authResult.user.user_id;

    // Get import mode from query params
    const mode = request.nextUrl.searchParams.get('mode') || 'replace';

    if (mode !== 'replace' && mode !== 'merge') {
      return commonErrors.badRequest('Invalid import mode. Use "replace" or "merge"');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = BackupDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid backup file format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const backupData = validationResult.data;

    // Check version compatibility
    if (!isVersionCompatible(backupData.exportVersion)) {
      return commonErrors.badRequest(
        `Backup version ${backupData.exportVersion} is not compatible with current version`
      );
    }

    // Verify checksum if present
    // IMPORTANT: Compute checksum on body.data (raw parsed JSON) NOT backupData.data (Zod-parsed).
    // Zod's safeParse reorders object keys to match schema definition order, which changes
    // the JSON.stringify output and would cause checksum mismatches for backups exported
    // from versions with different key ordering.
    if (backupData.metadata.checksum) {
      const expectedChecksum = backupData.metadata.checksum;
      const rawDataString = JSON.stringify(body.data);
      const computedChecksum = crypto
        .createHash('sha256')
        .update(rawDataString)
        .digest('hex')
        .substring(0, 16);

      if (computedChecksum !== expectedChecksum) {
        const recordCounts = {
          accounts: backupData.data.accounts.length,
          categories: backupData.data.categories.length,
          categoryBudgets: backupData.data.categoryBudgets.length,
          debts: backupData.data.debts.length,
          transactions: backupData.data.transactions.length,
          transfers: backupData.data.transfers.length,
          labels: backupData.data.labels.length,
          transactionLabels: backupData.data.transactionLabels.length,
        };
        const metadataCounts = backupData.metadata.recordCounts;

        logError('[Backup Import] Checksum mismatch:', {
          expected: expectedChecksum,
          computed: computedChecksum,
          dataStringLength: rawDataString.length,
          recordCounts,
          metadataCounts,
          exportVersion: backupData.exportVersion,
          exportDate: backupData.exportDate,
        });

        const countsMatch = JSON.stringify(recordCounts) === JSON.stringify(metadataCounts);
        if (!countsMatch) {
          logError('[Backup Import] Record count mismatch:', {
            actual: recordCounts,
            metadata: metadataCounts,
          });
        }

        return commonErrors.badRequest(
          `Backup file checksum mismatch — data may be corrupted. ` +
          `Expected: ${expectedChecksum}, Computed: ${computedChecksum}. ` +
          `Data size: ${rawDataString.length} chars, Records: ${JSON.stringify(recordCounts)}.`
        );
      }
    } else {
      console.warn('[Backup Import] No checksum in backup file, skipping verification');
    }

    // Fetch the authenticated user's email for ownership validation
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!userRecord) {
      return commonErrors.notFound('User not found');
    }

    // Validate backup ownership for merge mode
    const isOwner = backupData.user.email === userRecord.email;

    if (!isOwner && mode === 'merge') {
      return commonErrors.forbidden(
        'Merge mode can only be used with your own backup file. Use replace mode to restore data from another account.'
      );
    }

    // --- SSE streaming import ---

    const encoder = new TextEncoder();

    // ID mapping tables (maintained across chunks)
    const accountIdMap = new Map<string, string>();
    const categoryIdMap = new Map<string, string>();
    const categoryBudgetIdMap = new Map<string, string>();
    const debtIdMap = new Map<string, string>();
    const labelIdMap = new Map<string, string>();
    const transferIdMap = new Map<string, string>();
    const transactionIdMap = new Map<string, string>();

    // Result counters
    let createdAccounts = 0;
    let createdCategories = 0;
    let createdCategoryBudgets = 0;
    let createdDebts = 0;
    let createdLabels = 0;
    let createdTransfers = 0;
    let createdTransactions = 0;
    let createdTransactionLabels = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Heartbeat every 5 seconds to keep connection alive
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        }, 5000);

        try {
          // Step 1: Replace mode — delete existing data
          if (mode === 'replace') {
            await prisma.$transaction(async (tx) => {
              await tx.transactionLabel.deleteMany({
                where: { transaction: { user_id: userId } },
              });
              await tx.transaction.deleteMany({ where: { user_id: userId } });
              await tx.transfer.deleteMany({ where: { user_id: userId } });
              await tx.debt.deleteMany({ where: { user_id: userId } });
              await tx.categoryBudget.deleteMany({
                where: { category: { user_id: userId } },
              });
              await tx.label.deleteMany({ where: { user_id: userId } });
              await tx.category.deleteMany({ where: { user_id: userId } });
              await tx.account.deleteMany({ where: { user_id: userId } });
            });
            sendEvent({ progress: 5, step: 'cleared', message: 'Existing data cleared' });
          }

          // Step 2: Import Accounts in chunks
          const accountChunks = chunkArray(backupData.data.accounts, CHUNK_SIZE);
          for (let i = 0; i < accountChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const account of accountChunks[i]!) {
                if (mode === 'merge') {
                  const existing = await tx.account.findFirst({
                    where: { user_id: userId, id: account.id },
                  });

                  if (existing) {
                    await tx.account.update({
                      where: { id: existing.id },
                      data: {
                        name: account.name,
                        account_type: account.account_type as AccountType,
                        initial_balance: account.initial_balance,
                        icon: account.icon,
                        color: account.color,
                        is_active: account.is_active,
                        is_included_in_total: account.is_included_in_total,
                      },
                    });
                    accountIdMap.set(account.id, existing.id);
                  } else {
                    const newId = createId();
                    await tx.account.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        name: account.name,
                        account_type: account.account_type as AccountType,
                        initial_balance: account.initial_balance,
                        icon: account.icon,
                        color: account.color,
                        is_active: account.is_active,
                        is_included_in_total: account.is_included_in_total,
                      },
                    });
                    accountIdMap.set(account.id, newId);
                  }
                } else {
                  const newId = createId();
                  await tx.account.create({
                    data: {
                      id: newId,
                      user_id: userId,
                      name: account.name,
                      account_type: account.account_type as AccountType,
                      initial_balance: account.initial_balance,
                      icon: account.icon,
                      color: account.color,
                      is_active: account.is_active,
                      is_included_in_total: account.is_included_in_total,
                    },
                  });
                  accountIdMap.set(account.id, newId);
                }
                createdAccounts++;
              }
            });
            sendEvent({
              progress: calculateProgress('accounts', (i + 1) * CHUNK_SIZE, backupData.data.accounts.length),
              step: 'accounts',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.accounts.length),
              total: backupData.data.accounts.length,
            });
          }

          // Step 3: Import Categories in chunks (root first, then children)
          const rootCategories = backupData.data.categories.filter((c) => !c.parent_id);
          const childCategories = backupData.data.categories.filter((c) => c.parent_id);

          const rootChunks = chunkArray(rootCategories, CHUNK_SIZE);
          for (let i = 0; i < rootChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const category of rootChunks[i]!) {
                if (mode === 'merge') {
                  const existing = await tx.category.findFirst({
                    where: { user_id: userId, id: category.id },
                  });

                  if (existing) {
                    await tx.category.update({
                      where: { id: existing.id },
                      data: {
                        name: category.name,
                        type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                        nature: category.nature as CategoryNature,
                        icon: category.icon,
                        color: category.color ?? null,
                        is_active: category.is_active,
                      },
                    });
                    categoryIdMap.set(category.id, existing.id);
                  } else {
                    const newId = createId();
                    await tx.category.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        name: category.name,
                        type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                        nature: category.nature as CategoryNature,
                        icon: category.icon,
                        color: category.color ?? null,
                        is_active: category.is_active,
                      },
                    });
                    categoryIdMap.set(category.id, newId);
                  }
                } else {
                  const newId = createId();
                  await tx.category.create({
                    data: {
                      id: newId,
                      user_id: userId,
                      name: category.name,
                      type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                      nature: category.nature as CategoryNature,
                      icon: category.icon,
                      color: category.color ?? null,
                      is_active: category.is_active,
                    },
                  });
                  categoryIdMap.set(category.id, newId);
                }
                createdCategories++;
              }
            });
            sendEvent({
              progress: calculateProgress('categories', (i + 1) * CHUNK_SIZE, backupData.data.categories.length),
              step: 'categories',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.categories.length),
              total: backupData.data.categories.length,
            });
          }

          // Child categories (need parent IDs from root pass)
          const childChunks = chunkArray(childCategories, CHUNK_SIZE);
          for (let i = 0; i < childChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const category of childChunks[i]!) {
                const newParentId = categoryIdMap.get(category.parent_id!);

                if (mode === 'merge') {
                  const existing = await tx.category.findFirst({
                    where: { user_id: userId, id: category.id },
                  });

                  if (existing) {
                    await tx.category.update({
                      where: { id: existing.id },
                      data: {
                        parent_id: newParentId || null,
                        name: category.name,
                        type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                        nature: category.nature as CategoryNature,
                        icon: category.icon,
                        color: category.color ?? null,
                        is_active: category.is_active,
                      },
                    });
                    categoryIdMap.set(category.id, existing.id);
                  } else {
                    const newId = createId();
                    await tx.category.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        parent_id: newParentId || null,
                        name: category.name,
                        type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                        nature: category.nature as CategoryNature,
                        icon: category.icon,
                        color: category.color ?? null,
                        is_active: category.is_active,
                      },
                    });
                    categoryIdMap.set(category.id, newId);
                  }
                } else {
                  const newId = createId();
                  await tx.category.create({
                    data: {
                      id: newId,
                      user_id: userId,
                      parent_id: newParentId || null,
                      name: category.name,
                      type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                      nature: category.nature as CategoryNature,
                      icon: category.icon,
                      color: category.color ?? null,
                      is_active: category.is_active,
                    },
                  });
                  categoryIdMap.set(category.id, newId);
                }
                createdCategories++;
              }
            });
            sendEvent({
              progress: calculateProgress('categories', rootCategories.length + (i + 1) * CHUNK_SIZE, backupData.data.categories.length),
              step: 'categories',
              done: Math.min(rootCategories.length + (i + 1) * CHUNK_SIZE, backupData.data.categories.length),
              total: backupData.data.categories.length,
            });
          }

          // Step 4: Import Category Budgets in chunks
          const categoryBudgetChunks = chunkArray(backupData.data.categoryBudgets, CHUNK_SIZE);
          for (let i = 0; i < categoryBudgetChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const cb of categoryBudgetChunks[i]!) {
                const newCategoryId = categoryIdMap.get(cb.category_id);

                if (newCategoryId) {
                  if (mode === 'merge') {
                    const existing = await tx.categoryBudget.findFirst({
                      where: { id: cb.id, category: { user_id: userId } },
                    });

                    if (existing) {
                      await tx.categoryBudget.update({
                        where: { id: existing.id },
                        data: {
                          category_id: newCategoryId,
                          basic_monthly_amount: cb.basic_monthly_amount,
                          extend_monthly_amount: cb.extend_monthly_amount,
                          basic_annual_amount: cb.basic_annual_amount,
                          extend_annual_amount: cb.extend_annual_amount,
                        },
                      });
                      categoryBudgetIdMap.set(cb.id, existing.id);
                    } else {
                      const newId = createId();
                      await tx.categoryBudget.create({
                        data: {
                          id: newId,
                          category_id: newCategoryId,
                          basic_monthly_amount: cb.basic_monthly_amount,
                          extend_monthly_amount: cb.extend_monthly_amount,
                          basic_annual_amount: cb.basic_annual_amount,
                          extend_annual_amount: cb.extend_annual_amount,
                        },
                      });
                      categoryBudgetIdMap.set(cb.id, newId);
                    }
                  } else {
                    const newId = createId();
                    await tx.categoryBudget.create({
                      data: {
                        id: newId,
                        category_id: newCategoryId,
                        basic_monthly_amount: cb.basic_monthly_amount,
                        extend_monthly_amount: cb.extend_monthly_amount,
                        basic_annual_amount: cb.basic_annual_amount,
                        extend_annual_amount: cb.extend_annual_amount,
                      },
                    });
                    categoryBudgetIdMap.set(cb.id, newId);
                  }
                  createdCategoryBudgets++;
                }
              }
            });
            sendEvent({
              progress: calculateProgress('categoryBudgets', (i + 1) * CHUNK_SIZE, backupData.data.categoryBudgets.length),
              step: 'categoryBudgets',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.categoryBudgets.length),
              total: backupData.data.categoryBudgets.length,
            });
          }

          // Step 5: Import Debts in chunks
          const debtChunks = chunkArray(backupData.data.debts, CHUNK_SIZE);
          for (let i = 0; i < debtChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const debt of debtChunks[i]!) {
                const newAccountId = accountIdMap.get(debt.account_id);

                if (newAccountId) {
                  if (mode === 'merge') {
                    const existing = await tx.debt.findFirst({
                      where: { user_id: userId, id: debt.id },
                    });

                    if (existing) {
                      await tx.debt.update({
                        where: { id: existing.id },
                        data: {
                          date: new Date(debt.date),
                          type: debt.type as DebtType,
                          account_id: newAccountId,
                          counterparty: debt.counterparty,
                          description: debt.description ?? null,
                          status: debt.status as DebtStatus,
                        },
                      });
                      debtIdMap.set(debt.id, existing.id);
                    } else {
                      const newId = createId();
                      await tx.debt.create({
                        data: {
                          id: newId,
                          user_id: userId,
                          date: new Date(debt.date),
                          type: debt.type as DebtType,
                          account_id: newAccountId,
                          counterparty: debt.counterparty,
                          description: debt.description ?? null,
                          status: debt.status as DebtStatus,
                        },
                      });
                      debtIdMap.set(debt.id, newId);
                    }
                  } else {
                    const newId = createId();
                    await tx.debt.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        date: new Date(debt.date),
                        type: debt.type as DebtType,
                        account_id: newAccountId,
                        counterparty: debt.counterparty,
                        description: debt.description ?? null,
                        status: debt.status as DebtStatus,
                      },
                    });
                    debtIdMap.set(debt.id, newId);
                  }
                  createdDebts++;
                }
              }
            });
            sendEvent({
              progress: calculateProgress('debts', (i + 1) * CHUNK_SIZE, backupData.data.debts.length),
              step: 'debts',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.debts.length),
              total: backupData.data.debts.length,
            });
          }

          // Step 6: Import Labels in chunks
          const labelChunks = chunkArray(backupData.data.labels, CHUNK_SIZE);
          for (let i = 0; i < labelChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const label of labelChunks[i]!) {
                if (mode === 'merge') {
                  const existing = await tx.label.findFirst({
                    where: { user_id: userId, id: label.id },
                  });

                  if (existing) {
                    await tx.label.update({
                      where: { id: existing.id },
                      data: {
                        name: label.name,
                        color: label.color,
                      },
                    });
                    labelIdMap.set(label.id, existing.id);
                  } else {
                    const newId = createId();
                    await tx.label.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        name: label.name,
                        color: label.color,
                      },
                    });
                    labelIdMap.set(label.id, newId);
                  }
                } else {
                  const newId = createId();
                  await tx.label.create({
                    data: {
                      id: newId,
                      user_id: userId,
                      name: label.name,
                      color: label.color,
                    },
                  });
                  labelIdMap.set(label.id, newId);
                }
                createdLabels++;
              }
            });
            sendEvent({
              progress: calculateProgress('labels', (i + 1) * CHUNK_SIZE, backupData.data.labels.length),
              step: 'labels',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.labels.length),
              total: backupData.data.labels.length,
            });
          }

          // Step 7: Import Transfers in chunks
          const transferChunks = chunkArray(backupData.data.transfers, CHUNK_SIZE);
          for (let i = 0; i < transferChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const transfer of transferChunks[i]!) {
                const newFromAccountId = accountIdMap.get(transfer.from_account);
                const newToAccountId = accountIdMap.get(transfer.to_account);

                if (newFromAccountId && newToAccountId) {
                  if (mode === 'merge') {
                    const existing = await tx.transfer.findFirst({
                      where: { user_id: userId, id: transfer.id },
                    });

                    if (existing) {
                      await tx.transfer.update({
                        where: { id: existing.id },
                        data: {
                          date: new Date(transfer.date),
                          from_account: newFromAccountId,
                          to_account: newToAccountId,
                          amount: transfer.amount,
                          description: transfer.description ?? null,
                        },
                      });
                      transferIdMap.set(transfer.id, existing.id);
                    } else {
                      const newId = createId();
                      await tx.transfer.create({
                        data: {
                          id: newId,
                          user_id: userId,
                          date: new Date(transfer.date),
                          from_account: newFromAccountId,
                          to_account: newToAccountId,
                          amount: transfer.amount,
                          description: transfer.description ?? null,
                        },
                      });
                      transferIdMap.set(transfer.id, newId);
                    }
                  } else {
                    const newId = createId();
                    await tx.transfer.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        date: new Date(transfer.date),
                        from_account: newFromAccountId,
                        to_account: newToAccountId,
                        amount: transfer.amount,
                        description: transfer.description ?? null,
                      },
                    });
                    transferIdMap.set(transfer.id, newId);
                  }
                  createdTransfers++;
                }
              }
            });
            sendEvent({
              progress: calculateProgress('transfers', (i + 1) * CHUNK_SIZE, backupData.data.transfers.length),
              step: 'transfers',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.transfers.length),
              total: backupData.data.transfers.length,
            });
          }

          // Step 8: Import Transactions in chunks
          const transactionChunks = chunkArray(backupData.data.transactions, CHUNK_SIZE);
          for (let i = 0; i < transactionChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const transaction of transactionChunks[i]!) {
                const newAccountId = accountIdMap.get(transaction.account_id);
                const newCategoryId = transaction.category_id
                  ? categoryIdMap.get(transaction.category_id)
                  : null;
                const newTransferId = transaction.transfer_id
                  ? transferIdMap.get(transaction.transfer_id)
                  : null;
                const newDebtId = transaction.debt_id
                  ? debtIdMap.get(transaction.debt_id)
                  : null;

                if (newAccountId) {
                  if (mode === 'merge') {
                    const existing = await tx.transaction.findFirst({
                      where: { user_id: userId, id: transaction.id },
                    });

                    if (existing) {
                      await tx.transaction.update({
                        where: { id: existing.id },
                        data: {
                          account_id: newAccountId,
                          category_id: newCategoryId ?? null,
                          type: transaction.type as TransactionType,
                          amount: transaction.amount,
                          date: new Date(transaction.date),
                          description: transaction.description ?? null,
                          payee: transaction.payee ?? null,
                          payment_method: transaction.payment_method ?? null,
                          payment_status: transaction.payment_status ?? null,
                          transfer_id: newTransferId ?? null,
                          debt_id: newDebtId ?? null,
                        },
                      });
                      transactionIdMap.set(transaction.id, existing.id);
                    } else {
                      const newId = createId();
                      await tx.transaction.create({
                        data: {
                          id: newId,
                          user_id: userId,
                          account_id: newAccountId,
                          category_id: newCategoryId ?? null,
                          type: transaction.type as TransactionType,
                          amount: transaction.amount,
                          date: new Date(transaction.date),
                          description: transaction.description ?? null,
                          payee: transaction.payee ?? null,
                          payment_method: transaction.payment_method ?? null,
                          payment_status: transaction.payment_status ?? null,
                          transfer_id: newTransferId ?? null,
                          debt_id: newDebtId ?? null,
                        },
                      });
                      transactionIdMap.set(transaction.id, newId);
                    }
                  } else {
                    const newId = createId();
                    await tx.transaction.create({
                      data: {
                        id: newId,
                        user_id: userId,
                        account_id: newAccountId,
                        category_id: newCategoryId ?? null,
                        type: transaction.type as TransactionType,
                        amount: transaction.amount,
                        date: new Date(transaction.date),
                        description: transaction.description ?? null,
                        payee: transaction.payee ?? null,
                        payment_method: transaction.payment_method ?? null,
                        payment_status: transaction.payment_status ?? null,
                        transfer_id: newTransferId ?? null,
                        debt_id: newDebtId ?? null,
                      },
                    });
                    transactionIdMap.set(transaction.id, newId);
                  }
                  createdTransactions++;
                }
              }
            });
            sendEvent({
              progress: calculateProgress('transactions', (i + 1) * CHUNK_SIZE, backupData.data.transactions.length),
              step: 'transactions',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.transactions.length),
              total: backupData.data.transactions.length,
            });
          }

          // Step 9: Import Transaction-Label relations in chunks
          const tlChunks = chunkArray(backupData.data.transactionLabels, CHUNK_SIZE * 2);
          for (let i = 0; i < tlChunks.length; i++) {
            await prisma.$transaction(async (tx) => {
              for (const tl of tlChunks[i]!) {
                const newTransactionId = transactionIdMap.get(tl.transaction_id);
                const newLabelId = labelIdMap.get(tl.label_id);

                if (newTransactionId && newLabelId) {
                  if (mode === 'merge') {
                    const existing = await tx.transactionLabel.findFirst({
                      where: {
                        transaction_id: newTransactionId,
                        label_id: newLabelId,
                      },
                    });

                    if (!existing) {
                      await tx.transactionLabel.create({
                        data: {
                          id: createId(),
                          transaction_id: newTransactionId,
                          label_id: newLabelId,
                        },
                      });
                      createdTransactionLabels++;
                    }
                  } else {
                    await tx.transactionLabel.create({
                      data: {
                        id: createId(),
                        transaction_id: newTransactionId,
                        label_id: newLabelId,
                      },
                    });
                    createdTransactionLabels++;
                  }
                }
              }
            });
            sendEvent({
              progress: calculateProgress('transactionLabels', (i + 1) * CHUNK_SIZE * 2, backupData.data.transactionLabels.length),
              step: 'transactionLabels',
              done: Math.min((i + 1) * CHUNK_SIZE * 2, backupData.data.transactionLabels.length),
              total: backupData.data.transactionLabels.length,
            });
          }

          // Final event
          sendEvent({
            progress: 100,
            done: true,
            result: {
              accounts: createdAccounts,
              categories: createdCategories,
              categoryBudgets: createdCategoryBudgets,
              debts: createdDebts,
              transactions: createdTransactions,
              transfers: createdTransfers,
              labels: createdLabels,
              transactionLabels: createdTransactionLabels,
            },
            ...(mode === 'replace' && !isOwner
              ? { warning: 'Restored data from a different account' }
              : {}),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Import failed';
          logError('[Backup Import] SSE stream error:', {
            message,
            stack: error instanceof Error ? error.stack : undefined,
            mode,
            step: 'unknown',
          });
          sendEvent({
            error: true,
            message,
            ...(mode === 'replace'
              ? { warning: 'Replace mode already deleted your existing data. Please retry the import with the same backup file.' }
              : {}),
          });
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logError('Import error:', error);

    if (error instanceof Error) {
      return commonErrors.serverError(`Failed to import data: ${error.message}`);
    }

    return commonErrors.serverError('Failed to import data');
  }
}
