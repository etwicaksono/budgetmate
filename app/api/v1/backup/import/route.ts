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
import type { Prisma } from '@prisma/client';
import { SavedFilterContext } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { commonErrors } from '@/lib/api/response';
import { BackupDataSchema, isVersionCompatible } from '@/lib/validation/backupSchemas';
import {
  dedupePairs,
  remapSavedFilterReferences,
  resolveAnalyticFlag,
  resolveImportId,
} from '@/lib/api/backupImport';
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
  transactions: { start: 65, end: 88 },
  transactionLabels: { start: 88, end: 96 },
  debtLabels: { start: 96, end: 98 },
  savedFilters: { start: 98, end: 100 },
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

const ENTITY_KEYS = [
  'accounts',
  'categories',
  'categoryBudgets',
  'debts',
  'transactions',
  'transfers',
  'labels',
  'transactionLabels',
  'debtLabels',
  'savedFilters',
] as const;

type EntityKey = (typeof ENTITY_KEYS)[number];

interface Counter {
  created: number;
  updated: number;
  skipped: number;
}

/** Binds the shared resolver to this route's ID factory. */
const resolveId = (backupId: string, owners: Map<string, string>, userId: string) =>
  resolveImportId(backupId, owners, userId, createId);

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
    // Zod's safeParse reorders object keys to match schema definition order and fills in
    // defaults for fields absent from older backups (e.g. debtLabels), both of which change
    // the JSON.stringify output and would cause checksum mismatches.
    if (backupData.metadata.checksum) {
      const expectedChecksum = backupData.metadata.checksum;
      const rawDataString = JSON.stringify(body.data);
      const computedChecksum = crypto
        .createHash('sha256')
        .update(rawDataString)
        .digest('hex')
        .substring(0, 16);

      if (computedChecksum !== expectedChecksum) {
        const metadataCounts = backupData.metadata.recordCounts;
        const recordCounts = {
          accounts: backupData.data.accounts.length,
          categories: backupData.data.categories.length,
          categoryBudgets: backupData.data.categoryBudgets.length,
          debts: backupData.data.debts.length,
          transactions: backupData.data.transactions.length,
          transfers: backupData.data.transfers.length,
          labels: backupData.data.labels.length,
          transactionLabels: backupData.data.transactionLabels.length,
          // Only compare debtLabels when the file actually declares it (1.1.0+),
          // otherwise Zod's [] default would fake a mismatch on 1.0.x backups.
          ...(metadataCounts.debtLabels !== undefined
            ? { debtLabels: backupData.data.debtLabels.length }
            : {}),
          // Only compare savedFilters when the file declares it (1.2.0+).
          ...(metadataCounts.savedFilters !== undefined
            ? { savedFilters: backupData.data.savedFilters.length }
            : {}),
        };

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
    const debtIdMap = new Map<string, string>();
    const labelIdMap = new Map<string, string>();
    const transferIdMap = new Map<string, string>();
    const transactionIdMap = new Map<string, string>();

    // Per-entity outcome counters
    const counters = ENTITY_KEYS.reduce((acc, key) => {
      acc[key] = { created: 0, updated: 0, skipped: 0 };
      return acc;
    }, {} as Record<EntityKey, Counter>);

    const tally = (pick: (counter: Counter) => number): Record<EntityKey, number> =>
      ENTITY_KEYS.reduce((acc, key) => {
        acc[key] = pick(counters[key]);
        return acc;
      }, {} as Record<EntityKey, number>);

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
              await tx.debtLabel.deleteMany({
                where: { debt: { user_id: userId } },
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
              await tx.savedFilter.deleteMany({ where: { user_id: userId } });
            });
            sendEvent({ progress: 5, step: 'cleared', message: 'Existing data cleared' });
          }

          // Step 2: Import Accounts
          const accountChunks = chunkArray(backupData.data.accounts, CHUNK_SIZE);
          for (const [i, chunk] of accountChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.account.findMany({
                where: { id: { in: chunk.map((a) => a.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const account of chunk) {
                const { update, id } = resolveId(account.id, owners, userId);
                const fields = {
                  name: account.name,
                  account_type: account.account_type,
                  initial_balance: account.initial_balance,
                  icon: account.icon,
                  color: account.color,
                  is_active: account.is_active,
                  is_included_in_total: account.is_included_in_total,
                  order: account.order ?? 0,
                };

                if (update) {
                  await tx.account.update({
                    where: { id },
                    // Backups only carry live rows, so a locally soft-deleted account
                    // present in the file is meant to come back.
                    data: { ...fields, deleted_at: null },
                  });
                  counters.accounts.updated++;
                } else {
                  await tx.account.create({
                    data: { id, user_id: userId, ...fields },
                  });
                  counters.accounts.created++;
                }
                accountIdMap.set(account.id, id);
              }
            });
            sendEvent({
              progress: calculateProgress('accounts', (i + 1) * CHUNK_SIZE, backupData.data.accounts.length),
              step: 'accounts',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.accounts.length),
              total: backupData.data.accounts.length,
            });
          }

          // Step 3: Import Categories (root first, then children so parents resolve)
          const rootCategories = backupData.data.categories.filter((c) => !c.parent_id);
          const childCategories = backupData.data.categories.filter((c) => c.parent_id);
          const totalCategories = backupData.data.categories.length;

          const importCategoryChunk = async (
            chunk: typeof backupData.data.categories,
            withParent: boolean
          ) => {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.category.findMany({
                where: { id: { in: chunk.map((c) => c.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const category of chunk) {
                const { update, id } = resolveId(category.id, owners, userId);
                const fields = {
                  name: category.name,
                  // Preserve 'both' — the previous income/expense ternary silently
                  // downgraded it to 'expense' and broke analytic_flag handling.
                  type: category.type,
                  nature: category.nature,
                  analytic_flag: resolveAnalyticFlag(category),
                  icon: category.icon,
                  color: category.color ?? null,
                  is_active: category.is_active,
                  ...(withParent
                    ? { parent_id: categoryIdMap.get(category.parent_id!) ?? null }
                    : {}),
                };

                if (update) {
                  await tx.category.update({ where: { id }, data: fields });
                  counters.categories.updated++;
                } else {
                  await tx.category.create({ data: { id, user_id: userId, ...fields } });
                  counters.categories.created++;
                }
                categoryIdMap.set(category.id, id);
              }
            });
          };

          const rootChunks = chunkArray(rootCategories, CHUNK_SIZE);
          for (const [i, chunk] of rootChunks.entries()) {
            await importCategoryChunk(chunk, false);
            sendEvent({
              progress: calculateProgress('categories', (i + 1) * CHUNK_SIZE, totalCategories),
              step: 'categories',
              done: Math.min((i + 1) * CHUNK_SIZE, totalCategories),
              total: totalCategories,
            });
          }

          const childChunks = chunkArray(childCategories, CHUNK_SIZE);
          for (const [i, chunk] of childChunks.entries()) {
            await importCategoryChunk(chunk, true);
            const done = Math.min(rootCategories.length + (i + 1) * CHUNK_SIZE, totalCategories);
            sendEvent({
              progress: calculateProgress('categories', done, totalCategories),
              step: 'categories',
              done,
              total: totalCategories,
            });
          }

          // Step 4: Import Category Budgets
          // CategoryBudget.category_id is UNIQUE (one budget per category), so the
          // category is the merge key — matching on the budget's own id let a second
          // import insert a duplicate or trip the unique constraint.
          const categoryBudgetChunks = chunkArray(backupData.data.categoryBudgets, CHUNK_SIZE);
          for (const [i, chunk] of categoryBudgetChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const takenRows = await tx.categoryBudget.findMany({
                where: { id: { in: chunk.map((cb) => cb.id) } },
                select: { id: true },
              });
              const takenIds = new Set(takenRows.map((r) => r.id));

              for (const cb of chunk) {
                const newCategoryId = categoryIdMap.get(cb.category_id);

                if (!newCategoryId) {
                  counters.categoryBudgets.skipped++;
                  continue;
                }

                const amounts = {
                  basic_monthly_amount: cb.basic_monthly_amount,
                  extend_monthly_amount: cb.extend_monthly_amount,
                  basic_annual_amount: cb.basic_annual_amount,
                  extend_annual_amount: cb.extend_annual_amount,
                };

                const existing = await tx.categoryBudget.findUnique({
                  where: { category_id: newCategoryId },
                  select: { id: true },
                });

                if (existing) {
                  await tx.categoryBudget.update({
                    where: { category_id: newCategoryId },
                    data: amounts,
                  });
                  counters.categoryBudgets.updated++;
                } else {
                  await tx.categoryBudget.create({
                    data: {
                      id: takenIds.has(cb.id) ? createId() : cb.id,
                      category_id: newCategoryId,
                      ...amounts,
                    },
                  });
                  counters.categoryBudgets.created++;
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

          // Step 5: Import Debts
          const debtChunks = chunkArray(backupData.data.debts, CHUNK_SIZE);
          for (const [i, chunk] of debtChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.debt.findMany({
                where: { id: { in: chunk.map((d) => d.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const debt of chunk) {
                const newAccountId = accountIdMap.get(debt.account_id);

                if (!newAccountId) {
                  counters.debts.skipped++;
                  continue;
                }

                const { update, id } = resolveId(debt.id, owners, userId);
                const fields = {
                  date: new Date(debt.date),
                  type: debt.type,
                  account_id: newAccountId,
                  counterparty: debt.counterparty,
                  description: debt.description ?? null,
                  status: debt.status,
                };

                if (update) {
                  await tx.debt.update({ where: { id }, data: fields });
                  counters.debts.updated++;
                } else {
                  await tx.debt.create({ data: { id, user_id: userId, ...fields } });
                  counters.debts.created++;
                }
                debtIdMap.set(debt.id, id);
              }
            });
            sendEvent({
              progress: calculateProgress('debts', (i + 1) * CHUNK_SIZE, backupData.data.debts.length),
              step: 'debts',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.debts.length),
              total: backupData.data.debts.length,
            });
          }

          // Step 6: Import Labels
          const labelChunks = chunkArray(backupData.data.labels, CHUNK_SIZE);
          for (const [i, chunk] of labelChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.label.findMany({
                where: { id: { in: chunk.map((l) => l.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const label of chunk) {
                const { update, id } = resolveId(label.id, owners, userId);
                const fields = { name: label.name, color: label.color };

                if (update) {
                  await tx.label.update({ where: { id }, data: fields });
                  counters.labels.updated++;
                } else {
                  await tx.label.create({ data: { id, user_id: userId, ...fields } });
                  counters.labels.created++;
                }
                labelIdMap.set(label.id, id);
              }
            });
            sendEvent({
              progress: calculateProgress('labels', (i + 1) * CHUNK_SIZE, backupData.data.labels.length),
              step: 'labels',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.labels.length),
              total: backupData.data.labels.length,
            });
          }

          // Step 7: Import Transfers
          const transferChunks = chunkArray(backupData.data.transfers, CHUNK_SIZE);
          for (const [i, chunk] of transferChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.transfer.findMany({
                where: { id: { in: chunk.map((t) => t.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const transfer of chunk) {
                const newFromAccountId = accountIdMap.get(transfer.from_account);
                const newToAccountId = accountIdMap.get(transfer.to_account);

                if (!newFromAccountId || !newToAccountId) {
                  counters.transfers.skipped++;
                  continue;
                }

                const { update, id } = resolveId(transfer.id, owners, userId);
                const fields = {
                  date: new Date(transfer.date),
                  from_account: newFromAccountId,
                  to_account: newToAccountId,
                  amount: transfer.amount,
                  description: transfer.description ?? null,
                };

                if (update) {
                  await tx.transfer.update({ where: { id }, data: fields });
                  counters.transfers.updated++;
                } else {
                  await tx.transfer.create({ data: { id, user_id: userId, ...fields } });
                  counters.transfers.created++;
                }
                transferIdMap.set(transfer.id, id);
              }
            });
            sendEvent({
              progress: calculateProgress('transfers', (i + 1) * CHUNK_SIZE, backupData.data.transfers.length),
              step: 'transfers',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.transfers.length),
              total: backupData.data.transfers.length,
            });
          }

          // Step 8: Import Transactions
          const transactionChunks = chunkArray(backupData.data.transactions, CHUNK_SIZE);
          for (const [i, chunk] of transactionChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.transaction.findMany({
                where: { id: { in: chunk.map((t) => t.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              for (const transaction of chunk) {
                const newAccountId = accountIdMap.get(transaction.account_id);

                if (!newAccountId) {
                  counters.transactions.skipped++;
                  continue;
                }

                const newCategoryId = transaction.category_id
                  ? categoryIdMap.get(transaction.category_id)
                  : null;
                const newTransferId = transaction.transfer_id
                  ? transferIdMap.get(transaction.transfer_id)
                  : null;
                const newDebtId = transaction.debt_id
                  ? debtIdMap.get(transaction.debt_id)
                  : null;

                const { update, id } = resolveId(transaction.id, owners, userId);
                const fields = {
                  account_id: newAccountId,
                  category_id: newCategoryId ?? null,
                  type: transaction.type,
                  amount: transaction.amount,
                  date: new Date(transaction.date),
                  description: transaction.description ?? null,
                  payee: transaction.payee ?? null,
                  payment_method: transaction.payment_method ?? null,
                  payment_status: transaction.payment_status ?? null,
                  transfer_id: newTransferId ?? null,
                  debt_id: newDebtId ?? null,
                  is_draft: transaction.is_draft ?? false,
                };

                if (update) {
                  await tx.transaction.update({
                    where: { id },
                    // Backups only carry live rows, so restore soft-deleted matches.
                    data: { ...fields, deleted_at: null },
                  });
                  counters.transactions.updated++;
                } else {
                  await tx.transaction.create({
                    data: { id, user_id: userId, ...fields },
                  });
                  counters.transactions.created++;
                }
                transactionIdMap.set(transaction.id, id);
              }
            });
            sendEvent({
              progress: calculateProgress('transactions', (i + 1) * CHUNK_SIZE, backupData.data.transactions.length),
              step: 'transactions',
              done: Math.min((i + 1) * CHUNK_SIZE, backupData.data.transactions.length),
              total: backupData.data.transactions.length,
            });
          }

          // Step 9: Import Transaction-Label relations
          // Junction rows carry a UNIQUE(transaction_id, label_id); duplicate pairs
          // inside the file would otherwise abort the whole chunk on insert.
          const JUNCTION_CHUNK_SIZE = CHUNK_SIZE * 2;
          const uniqueTransactionLabels = dedupePairs(
            backupData.data.transactionLabels,
            (tl) => `${tl.transaction_id}|${tl.label_id}`
          );
          const totalTransactionLabels = backupData.data.transactionLabels.length;
          counters.transactionLabels.skipped +=
            totalTransactionLabels - uniqueTransactionLabels.length;

          const tlChunks = chunkArray(uniqueTransactionLabels, JUNCTION_CHUNK_SIZE);
          for (const [i, chunk] of tlChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const pending: { id: string; transaction_id: string; label_id: string }[] = [];

              for (const tl of chunk) {
                const newTransactionId = transactionIdMap.get(tl.transaction_id);
                const newLabelId = labelIdMap.get(tl.label_id);

                if (!newTransactionId || !newLabelId) {
                  counters.transactionLabels.skipped++;
                  continue;
                }
                pending.push({ id: tl.id, transaction_id: newTransactionId, label_id: newLabelId });
              }

              if (pending.length === 0) return;

              const [existingRows, takenRows] = await Promise.all([
                tx.transactionLabel.findMany({
                  where: {
                    transaction_id: { in: pending.map((p) => p.transaction_id) },
                    label_id: { in: pending.map((p) => p.label_id) },
                  },
                  select: { transaction_id: true, label_id: true },
                }),
                tx.transactionLabel.findMany({
                  where: { id: { in: pending.map((p) => p.id) } },
                  select: { id: true },
                }),
              ]);
              const existingPairs = new Set(
                existingRows.map((r) => `${r.transaction_id}|${r.label_id}`)
              );
              const takenIds = new Set(takenRows.map((r) => r.id));

              const toCreate = pending.filter((p) => {
                if (existingPairs.has(`${p.transaction_id}|${p.label_id}`)) {
                  counters.transactionLabels.updated++;
                  return false;
                }
                return true;
              });

              if (toCreate.length > 0) {
                const result = await tx.transactionLabel.createMany({
                  data: toCreate.map((p) => ({
                    id: takenIds.has(p.id) ? createId() : p.id,
                    transaction_id: p.transaction_id,
                    label_id: p.label_id,
                  })),
                  skipDuplicates: true,
                });
                counters.transactionLabels.created += result.count;
              }
            });
            sendEvent({
              progress: calculateProgress('transactionLabels', (i + 1) * JUNCTION_CHUNK_SIZE, uniqueTransactionLabels.length),
              step: 'transactionLabels',
              done: Math.min((i + 1) * JUNCTION_CHUNK_SIZE, uniqueTransactionLabels.length),
              total: uniqueTransactionLabels.length,
            });
          }

          // Step 10: Import Debt-Label relations (absent from exportVersion 1.0.x files)
          const uniqueDebtLabels = dedupePairs(
            backupData.data.debtLabels,
            (dl) => `${dl.debt_id}|${dl.label_id}`
          );
          counters.debtLabels.skipped +=
            backupData.data.debtLabels.length - uniqueDebtLabels.length;

          const dlChunks = chunkArray(uniqueDebtLabels, JUNCTION_CHUNK_SIZE);
          for (const [i, chunk] of dlChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const pending: { id: string; debt_id: string; label_id: string }[] = [];

              for (const dl of chunk) {
                const newDebtId = debtIdMap.get(dl.debt_id);
                const newLabelId = labelIdMap.get(dl.label_id);

                if (!newDebtId || !newLabelId) {
                  counters.debtLabels.skipped++;
                  continue;
                }
                pending.push({ id: dl.id, debt_id: newDebtId, label_id: newLabelId });
              }

              if (pending.length === 0) return;

              const [existingRows, takenRows] = await Promise.all([
                tx.debtLabel.findMany({
                  where: {
                    debt_id: { in: pending.map((p) => p.debt_id) },
                    label_id: { in: pending.map((p) => p.label_id) },
                  },
                  select: { debt_id: true, label_id: true },
                }),
                tx.debtLabel.findMany({
                  where: { id: { in: pending.map((p) => p.id) } },
                  select: { id: true },
                }),
              ]);
              const existingPairs = new Set(existingRows.map((r) => `${r.debt_id}|${r.label_id}`));
              const takenIds = new Set(takenRows.map((r) => r.id));

              const toCreate = pending.filter((p) => {
                if (existingPairs.has(`${p.debt_id}|${p.label_id}`)) {
                  counters.debtLabels.updated++;
                  return false;
                }
                return true;
              });

              if (toCreate.length > 0) {
                const result = await tx.debtLabel.createMany({
                  data: toCreate.map((p) => ({
                    id: takenIds.has(p.id) ? createId() : p.id,
                    debt_id: p.debt_id,
                    label_id: p.label_id,
                  })),
                  skipDuplicates: true,
                });
                counters.debtLabels.created += result.count;
              }
            });
            sendEvent({
              progress: calculateProgress('debtLabels', (i + 1) * JUNCTION_CHUNK_SIZE, uniqueDebtLabels.length),
              step: 'debtLabels',
              done: Math.min((i + 1) * JUNCTION_CHUNK_SIZE, uniqueDebtLabels.length),
              total: uniqueDebtLabels.length,
            });
          }

          // Step 11: Import Saved Filters (absent from exportVersion < 1.2.0 files)
          // SavedFilter has no hard FK to the entities it references — its `filters`
          // JSON stores their IDs denormalized — so references are remapped through
          // the category/account/label maps instead of being skipped when unresolved.
          const savedFilterChunks = chunkArray(backupData.data.savedFilters, CHUNK_SIZE);
          for (const [i, chunk] of savedFilterChunks.entries()) {
            await prisma.$transaction(async (tx) => {
              const rows = await tx.savedFilter.findMany({
                where: { id: { in: chunk.map((sf) => sf.id) } },
                select: { id: true, user_id: true },
              });
              const owners = new Map(rows.map((r) => [r.id, r.user_id] as const));

              // Rows are unique per (user, name, context), so look up existing
              // matches for the file's pairs before deciding create vs. update.
              const pairKeys = [
                ...new Set(chunk.map((sf) => `${sf.name}\u0000${sf.context}`)),
              ];
              const keyedRows = await tx.savedFilter.findMany({
                where: {
                  user_id: userId,
                  OR: pairKeys.map((pairKey) => {
                    const separator = pairKey.indexOf('\u0000');
                    return {
                      name: pairKey.slice(0, separator),
                      context: pairKey.slice(separator + 1) as SavedFilterContext,
                    };
                  }),
                },
                select: { id: true, name: true, context: true },
              });
              const keyed = new Map(
                keyedRows.map((r) => [`${r.name}\u0000${r.context}`, r.id])
              );

              for (const savedFilter of chunk) {
                const filters = remapSavedFilterReferences(savedFilter.filters, {
                  categories: categoryIdMap,
                  accounts: accountIdMap,
                  labels: labelIdMap,
                });
                const data = {
                  name: savedFilter.name,
                  context: savedFilter.context,
                  filters: filters as Prisma.InputJsonValue,
                  sort_order: savedFilter.sort_order,
                };

                const pairKey = `${savedFilter.name}\u0000${savedFilter.context}`;
                const existingByKey = keyed.get(pairKey);

                // Prefer the unique (name, context) match: updating the row the
                // preset was renamed to avoids colliding with a locally created
                // filter that now holds that name.
                if (existingByKey) {
                  await tx.savedFilter.update({ where: { id: existingByKey }, data });
                  counters.savedFilters.updated++;
                  continue;
                }

                const { update, id } = resolveId(savedFilter.id, owners, userId);
                if (update) {
                  // Same row re-imported — restore its name/filters in place.
                  await tx.savedFilter.update({ where: { id }, data });
                  counters.savedFilters.updated++;
                } else {
                  await tx.savedFilter.create({
                    data: { id, user_id: userId, ...data },
                  });
                  counters.savedFilters.created++;
                }
              }
            });
            sendEvent({
              progress: calculateProgress(
                'savedFilters',
                (i + 1) * CHUNK_SIZE,
                backupData.data.savedFilters.length
              ),
              step: 'savedFilters',
              done: Math.min(
                (i + 1) * CHUNK_SIZE,
                backupData.data.savedFilters.length
              ),
              total: backupData.data.savedFilters.length,
            });
          }

          // Final event
          sendEvent({
            progress: 100,
            done: true,
            result: tally((c) => c.created + c.updated),
            updated: tally((c) => c.updated),
            skipped: tally((c) => c.skipped),
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
