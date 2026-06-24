/**
 * Backup Import API Endpoint
 * 
 * POST /api/v1/backup/import?mode=replace|merge
 * 
 * Imports and restores user data from backup JSON file.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { AccountType, CategoryNature, CategoryType, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { commonErrors } from '@/lib/api/response';
import { BackupDataSchema, isVersionCompatible } from '@/lib/validation/backupSchemas';
import { createId } from '@paralleldrive/cuid2';

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

    // Import data in transaction
    const result = await prisma.$transaction(
      async (tx) => {
        // ID mapping tables for rebuilding relationships
        const accountIdMap = new Map<string, string>();
        const categoryIdMap = new Map<string, string>();
        const labelIdMap = new Map<string, string>();
        const transferIdMap = new Map<string, string>();

        // If replace mode, delete existing data in correct order
        if (mode === 'replace') {
          await tx.transactionLabel.deleteMany({
            where: { transaction: { user_id: userId } },
          });
          await tx.transaction.deleteMany({ where: { user_id: userId } });
          await tx.transfer.deleteMany({ where: { user_id: userId } });
          await tx.label.deleteMany({ where: { user_id: userId } });
          await tx.category.deleteMany({ where: { user_id: userId } });
          await tx.account.deleteMany({ where: { user_id: userId } });
        }

        // 1. Import Accounts
        const createdAccounts = [];
        for (const account of backupData.data.accounts) {
          if (mode === 'merge') {
            // Check if account with same id exists
            const existing = await tx.account.findFirst({
              where: {
                user_id: userId,
                id: account.id,
              },
            });

            if (existing) {
              // Update existing account
              const updated = await tx.account.update({
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
              createdAccounts.push(updated);
            } else {
              // Insert as new
              const newId = createId();
              const created = await tx.account.create({
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
              createdAccounts.push(created);
            }
          } else {
            // Replace mode: insert with new id
            const newId = createId();
            const created = await tx.account.create({
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
            createdAccounts.push(created);
          }
        }

        // 2. Import Categories (handle hierarchy)
        // Import all categories and flag them as user categories (is_system: false)
        const createdCategories = [];
        const categoriesWithParent: typeof backupData.data.categories = [];

        // First pass: Root categories
        for (const category of backupData.data.categories) {
          if (!category.parent_id) {
            if (mode === 'merge') {
              // Check if category with same id exists
              const existing = await tx.category.findFirst({
                where: {
                  user_id: userId,
                  id: category.id,
                },
              });

              if (existing) {
                // Update existing category (force is_system: false)
                const updated = await tx.category.update({
                  where: { id: existing.id },
                  data: {
                    name: category.name,
                    type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                    nature: category.nature as CategoryNature,
                    icon: category.icon,
                    color: category.color ?? null,
                    is_system: false,
                    is_active: category.is_active,
                  },
                });

                categoryIdMap.set(category.id, existing.id);
                createdCategories.push(updated);
              } else {
                // Insert as new (force is_system: false)
                const newId = createId();
                const created = await tx.category.create({
                  data: {
                    id: newId,
                    user_id: userId,
                    name: category.name,
                    type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                    nature: category.nature as CategoryNature,
                    icon: category.icon,
                    color: category.color ?? null,
                    is_system: false,
                    is_active: category.is_active,
                  },
                });

                categoryIdMap.set(category.id, newId);
                createdCategories.push(created);
              }
            } else {
              // Replace mode: insert with new id (force is_system: false)
              const newId = createId();
              const created = await tx.category.create({
                data: {
                  id: newId,
                  user_id: userId,
                  name: category.name,
                  type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                  nature: category.nature as CategoryNature,
                  icon: category.icon,
                  color: category.color ?? null,
                  is_system: false,
                  is_active: category.is_active,
                },
              });

              categoryIdMap.set(category.id, newId);
              createdCategories.push(created);
            }
          } else {
            categoriesWithParent.push(category);
          }
        }

        // Second pass: Child categories
        for (const category of categoriesWithParent) {
          const newParentId = categoryIdMap.get(category.parent_id!);

          if (mode === 'merge') {
            const existing = await tx.category.findFirst({
              where: {
                user_id: userId,
                id: category.id,
              },
            });

            if (existing) {
              const updated = await tx.category.update({
                where: { id: existing.id },
                data: {
                  parent_id: newParentId || null,
                  name: category.name,
                  type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                  nature: category.nature as CategoryNature,
                  icon: category.icon,
                  color: category.color ?? null,
                  is_system: false,
                  is_active: category.is_active,
                },
              });

              categoryIdMap.set(category.id, existing.id);
              createdCategories.push(updated);
            } else {
              const newId = createId();
              const created = await tx.category.create({
                data: {
                  id: newId,
                  user_id: userId,
                  parent_id: newParentId || null,
                  name: category.name,
                  type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                  nature: category.nature as CategoryNature,
                  icon: category.icon,
                  color: category.color ?? null,
                  is_system: false,
                  is_active: category.is_active,
                },
              });

              categoryIdMap.set(category.id, newId);
              createdCategories.push(created);
            }
          } else {
            const newId = createId();
            const created = await tx.category.create({
              data: {
                id: newId,
                user_id: userId,
                parent_id: newParentId || null,
                name: category.name,
                type: category.type === 'income' ? CategoryType.income : CategoryType.expense,
                nature: category.nature as CategoryNature,
                icon: category.icon,
                color: category.color ?? null,
                is_system: false,
                is_active: category.is_active,
              },
            });

            categoryIdMap.set(category.id, newId);
            createdCategories.push(created);
          }
        }

        // 3. Import Labels
        const createdLabels = [];
        for (const label of backupData.data.labels) {
          if (mode === 'merge') {
            const existing = await tx.label.findFirst({
              where: {
                user_id: userId,
                id: label.id,
              },
            });

            if (existing) {
              const updated = await tx.label.update({
                where: { id: existing.id },
                data: {
                  name: label.name,
                  color: label.color,
                },
              });

              labelIdMap.set(label.id, existing.id);
              createdLabels.push(updated);
            } else {
              const newId = createId();
              const created = await tx.label.create({
                data: {
                  id: newId,
                  user_id: userId,
                  name: label.name,
                  color: label.color,
                },
              });

              labelIdMap.set(label.id, newId);
              createdLabels.push(created);
            }
          } else {
            const newId = createId();
            const created = await tx.label.create({
              data: {
                id: newId,
                user_id: userId,
                name: label.name,
                color: label.color,
              },
            });

            labelIdMap.set(label.id, newId);
            createdLabels.push(created);
          }
        }

        // 4. Import Transfers
        const createdTransfers = [];
        for (const transfer of backupData.data.transfers) {
          const newFromAccountId = accountIdMap.get(transfer.from_account);
          const newToAccountId = accountIdMap.get(transfer.to_account);

          if (newFromAccountId && newToAccountId) {
            if (mode === 'merge') {
              const existing = await tx.transfer.findFirst({
                where: {
                  user_id: userId,
                  id: transfer.id,
                },
              });

              if (existing) {
                const updated = await tx.transfer.update({
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
                createdTransfers.push(updated);
              } else {
                const newId = createId();
                const created = await tx.transfer.create({
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
                createdTransfers.push(created);
              }
            } else {
              const newId = createId();
              const created = await tx.transfer.create({
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
              createdTransfers.push(created);
            }
          }
        }

        // 5. Import Transactions
        // Build a transaction ID map for label re-association
        const transactionIdMap = new Map<string, string>();
        const createdTransactions = [];
        for (const transaction of backupData.data.transactions) {
          const newAccountId = accountIdMap.get(transaction.account_id);
          const newCategoryId = transaction.category_id
            ? categoryIdMap.get(transaction.category_id)
            : null;
          const newTransferId = transaction.transfer_id
            ? transferIdMap.get(transaction.transfer_id)
            : null;

          if (newAccountId) {
            if (mode === 'merge') {
              const existing = await tx.transaction.findFirst({
                where: {
                  user_id: userId,
                  id: transaction.id,
                },
              });

              if (existing) {
                const updated = await tx.transaction.update({
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
                  },
                });

                transactionIdMap.set(transaction.id, existing.id);
                createdTransactions.push(updated);
              } else {
                const newId = createId();
                const created = await tx.transaction.create({
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
                  },
                });

                transactionIdMap.set(transaction.id, newId);
                createdTransactions.push(created);
              }
            } else {
              const newId = createId();
              const created = await tx.transaction.create({
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
                },
              });

              transactionIdMap.set(transaction.id, newId);
              createdTransactions.push(created);
            }
          }
        }

        // 6. Import Transaction-Label relationships
        let createdTransactionLabels = 0;
        for (const tl of backupData.data.transactionLabels) {
          // Use the transaction ID map to find the new transaction ID
          const newTransactionId = transactionIdMap.get(tl.transaction_id);
          const newLabelId = labelIdMap.get(tl.label_id);

          if (newTransactionId && newLabelId) {
            if (mode === 'merge') {
              // Check if relationship already exists
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

        return {
          accounts: createdAccounts.length,
          categories: createdCategories.length,
          transactions: createdTransactions.length,
          transfers: createdTransfers.length,
          labels: createdLabels.length,
          transactionLabels: createdTransactionLabels,
        };
      },
      {
        timeout: 60000, // 60 seconds timeout for large imports
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          message: `Data ${mode === 'replace' ? 'restored' : 'merged'} successfully`,
          imported: result,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof Error) {
      return commonErrors.serverError(`Failed to import data: ${error.message}`);
    }

    return commonErrors.serverError('Failed to import data');
  }
}
