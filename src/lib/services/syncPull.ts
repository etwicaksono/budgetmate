import { prisma } from '@/lib/db/prisma';
import { GoogleSheetsService } from './googleSheets';
import {
  parseAccountsFromSheet,
  parseCategoriesFromSheet,
  parseTransactionsFromSheet,
  parseTransfersFromSheet,
  parseLabelsFromSheet,
  parseAccountsFromSheetSimple,
  parseCategoriesFromSheetSimple,
  parseTransactionsFromSheetSimple,
  parseTransfersFromSheetSimple,
  parseCode,
} from './sheetParse';

export interface PullOptions {
  userId: string;
  spreadsheetId: string;
  mode: 'merge' | 'replace';
}

export interface PullResult {
  success: boolean;
  counts: {
    accounts: { added: number; updated: number; deleted: number };
    categories: { added: number; updated: number; deleted: number };
    transactions: { added: number; updated: number; deleted: number };
    transfers: { added: number; updated: number; deleted: number };
    labels: { added: number; updated: number; deleted: number };
  };
  error?: string;
}

export async function pullFromSheets(
  options: PullOptions
): Promise<PullResult> {
  const { userId, spreadsheetId, mode } = options;

  const counts = {
    accounts: { added: 0, updated: 0, deleted: 0 },
    categories: { added: 0, updated: 0, deleted: 0 },
    transactions: { added: 0, updated: 0, deleted: 0 },
    transfers: { added: 0, updated: 0, deleted: 0 },
    labels: { added: 0, updated: 0, deleted: 0 },
  };

  try {
    const sheetsService = await GoogleSheetsService.forUser(userId);

    const [metadataData, accountsData, categoriesData, transactionsData, transfersData, labelsData] =
      await Promise.all([
        sheetsService.getValues(spreadsheetId, 'Metadata!A:Z').catch(() => []),
        sheetsService.getValues(spreadsheetId, 'Accounts!A:Z'),
        sheetsService.getValues(spreadsheetId, 'Categories!A:Z'),
        sheetsService.getValues(spreadsheetId, 'Transactions!A:Z'),
        sheetsService.getValues(spreadsheetId, 'Transfers!A:Z'),
        sheetsService.getValues(spreadsheetId, 'Labels!A:Z'),
      ]);

    // Detect format version from Metadata OR by checking sheet structure
    const version = detectSheetFormat(metadataData, accountsData, transactionsData);

    if (version === '2.0') {
      // Use simplified format parsers (v2.0)
      return await pullSimplifiedFormat({
        userId,
        spreadsheetId,
        mode,
        sheetsService,
        accountsData,
        categoriesData,
        transactionsData,
        transfersData,
        labelsData,
        counts,
      });
    } else {
      // Use full format parsers (v1.0)
      const accounts = parseAccountsFromSheet(accountsData);
      const categories = parseCategoriesFromSheet(categoriesData);
      const transactions = parseTransactionsFromSheet(transactionsData);
      const transfers = parseTransfersFromSheet(transfersData);
      const labels = parseLabelsFromSheet(labelsData);

      if (mode === 'replace') {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.deleteMany({ where: { user_id: userId } });
          await tx.transfer.deleteMany({ where: { user_id: userId } });
          await tx.label.deleteMany({ where: { user_id: userId } });
          await tx.account.deleteMany({ where: { user_id: userId } });
          await tx.category.deleteMany({ where: { user_id: userId, is_system: false } });
        });
      }

      await prisma.$transaction(async (tx) => {
        for (const label of labels) {
          const existing = await tx.label.findUnique({ where: { id: label.id } });
          if (existing) {
            await tx.label.update({
              where: { id: label.id },
              data: {
                name: label.name,
                color: label.color,
              },
            });
            counts.labels.updated++;
          } else {
            await tx.label.create({
              data: {
                ...label,
                user_id: userId,
              },
            });
            counts.labels.added++;
          }
        }

        for (const account of accounts) {
          const existing = await tx.account.findUnique({ where: { id: account.id } });
          if (existing) {
            await tx.account.update({
              where: { id: account.id },
              data: {
                name: account.name,
                account_type: account.account_type,
                currency: account.currency,
                initial_balance: account.initial_balance,
                credit_limit: account.credit_limit ?? null,
                interest_rate: account.interest_rate ?? null,
                icon: account.icon,
                color: account.color,
                is_active: account.is_active,
                is_included_in_total: account.is_included_in_total,
              },
            });
            counts.accounts.updated++;
          } else {
            await tx.account.create({
              data: {
                ...account,
                credit_limit: account.credit_limit ?? null,
                interest_rate: account.interest_rate ?? null,
                user_id: userId,
                group_id: null,
              },
            });
            counts.accounts.added++;
          }
        }

        for (const category of categories) {
          const existing = await tx.category.findUnique({ where: { id: category.id } });
          if (existing) {
            await tx.category.update({
              where: { id: category.id },
              data: {
                name: category.name,
                type: category.type,
                nature: category.nature,
                icon: category.icon,
                color: category.color ?? null,
                is_active: category.is_active,
                parent_id: category.parent_id ?? null,
              },
            });
            counts.categories.updated++;
          } else {
            await tx.category.create({
              data: {
                ...category,
                parent_id: category.parent_id ?? null,
                color: category.color ?? null,
                user_id: userId,
              },
            });
            counts.categories.added++;
          }
        }

        for (const transfer of transfers) {
          const existing = await tx.transfer.findUnique({ where: { id: transfer.id } });
          if (existing) {
            await tx.transfer.update({
              where: { id: transfer.id },
              data: {
                from_account: transfer.from_account,
                to_account: transfer.to_account,
                amount: transfer.amount,
                currency: transfer.currency,
                to_amount: transfer.to_amount ?? null,
                to_currency: transfer.to_currency ?? null,
                date: transfer.date,
                description: transfer.description ?? null,
              },
            });
            counts.transfers.updated++;
          } else {
            await tx.transfer.create({
              data: {
                ...transfer,
                to_amount: transfer.to_amount ?? null,
                to_currency: transfer.to_currency ?? null,
                description: transfer.description ?? null,
                user_id: userId,
              },
            });
            counts.transfers.added++;
          }
        }

        for (const transaction of transactions) {
          const existing = await tx.transaction.findUnique({ where: { id: transaction.id } });
          if (existing) {
            await tx.transaction.update({
              where: { id: transaction.id },
              data: {
                account_id: transaction.account_id,
                category_id: transaction.category_id ?? null,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                exchange_rate: transaction.exchange_rate,
                date: transaction.date,
                description: transaction.description ?? null,
                payee: transaction.payee ?? null,
                payment_method: transaction.payment_method ?? null,
                payment_status: transaction.payment_status ?? null,
                reference_number: transaction.reference_number ?? null,
                is_recurring: transaction.is_recurring,
                transfer_id: transaction.transfer_id ?? null,
              },
            });
            counts.transactions.updated++;
          } else {
            await tx.transaction.create({
              data: {
                id: transaction.id,
                user_id: userId,
                account_id: transaction.account_id,
                category_id: transaction.category_id ?? null,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                exchange_rate: transaction.exchange_rate,
                date: transaction.date,
                description: transaction.description ?? null,
                payee: transaction.payee ?? null,
                payment_method: transaction.payment_method ?? null,
                payment_status: transaction.payment_status ?? null,
                reference_number: transaction.reference_number ?? null,
                is_recurring: transaction.is_recurring,
                transfer_id: transaction.transfer_id ?? null,
                recurring_id: null,
              },
            });
            counts.transactions.added++;
          }
        }
      });

      await prisma.syncHistory.create({
        data: {
          user_id: userId,
          direction: 'pull',
          mode,
          status: 'success',
          accounts_added: counts.accounts.added,
          accounts_updated: counts.accounts.updated,
          accounts_deleted: counts.accounts.deleted,
          categories_added: counts.categories.added,
          categories_updated: counts.categories.updated,
          categories_deleted: counts.categories.deleted,
          transactions_added: counts.transactions.added,
          transactions_updated: counts.transactions.updated,
          transactions_deleted: counts.transactions.deleted,
          transfers_added: counts.transfers.added,
          transfers_updated: counts.transfers.updated,
          transfers_deleted: counts.transfers.deleted,
          labels_added: counts.labels.added,
          labels_updated: counts.labels.updated,
          labels_deleted: counts.labels.deleted,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { last_synced_at: new Date() },
      });

      return {
        success: true,
        counts,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.syncHistory.create({
      data: {
        user_id: userId,
        direction: 'pull',
        mode,
        status: 'error',
        error_message: errorMessage,
      },
    });

    return {
      success: false,
      counts,
      error: errorMessage,
    };
  }
}

// Helper function to detect sheet format from Metadata or sheet structure
function detectSheetFormat(
  metadataData: string[][],
  accountsData: string[][],
  transactionsData: string[][]
): string {
  // First, try to read version from Metadata sheet
  if (metadataData && metadataData.length >= 2) {
    for (let i = 0; i < metadataData.length; i++) {
      const row = metadataData[i];
      if (row && row[0] === 'Version' && row[1]) {
        return row[1]; // Return version value (e.g., "1.0" or "2.0")
      }
    }
  }

  // If no Metadata or no version, detect by checking column headers
  // Check if headers contain specific column names (not position-dependent)

  if (accountsData && accountsData.length > 0) {
    const headers = accountsData[0];
    if (!headers) return '2.0'; // Safety check

    // Convert to lowercase and check if "Code" column exists (v2.0 simplified format)
    // Also check column count - v2.0 has fewer columns (9 vs 14)
    const hasCodeColumn = headers.some(h => h && h.trim().toLowerCase() === 'code');
    const hasIDColumn = headers.some(h => h && h.trim() === 'ID');

    if (hasCodeColumn) {
      console.log('[Format Detection] Detected v2.0: Found "Code" column in Accounts');
      return '2.0';
    }

    if (hasIDColumn && headers.length > 12) {
      // v1.0 has ID column and 14+ columns
      console.log('[Format Detection] Detected v1.0: Found "ID" column with many columns');
      return '1.0';
    }
  }

  // Fallback: check transaction headers
  if (transactionsData && transactionsData.length > 0) {
    const headers = transactionsData[0];
    if (!headers) return '2.0'; // Safety check

    // Check if "Account ID" exists (v1.0) or just "Account" (v2.0)
    const hasAccountID = headers.some(h => h && h.trim() === 'Account ID');
    const hasAccount = headers.some(h => h && h.trim() === 'Account');
    const hasCategoryID = headers.some(h => h && h.trim() === 'Category ID');

    if (hasAccountID || hasCategoryID) {
      console.log('[Format Detection] Detected v1.0: Found "Account ID" or "Category ID" column');
      return '1.0';
    }

    if (hasAccount && !hasAccountID && headers.length <= 10) {
      // v2.0 has "Account" but not "Account ID", and fewer columns (8)
      console.log('[Format Detection] Detected v2.0: Found "Account" column (no ID suffix) with few columns');
      return '2.0';
    }
  }

  // Log headers for debugging
  console.log('[Format Detection] Could not determine, defaulting to v2.0');
  console.log('[Format Detection] Accounts headers:', accountsData?.[0]?.slice(0, 5));
  console.log('[Format Detection] Transactions headers:', transactionsData?.[0]?.slice(0, 5));

  // Default to simplified format if we can't determine
  return '2.0';
}

// Pull using simplified format (v2.0) with code lookup
async function pullSimplifiedFormat(params: {
  userId: string;
  spreadsheetId: string;
  mode: 'merge' | 'replace';
  sheetsService: GoogleSheetsService;
  accountsData: string[][];
  categoriesData: string[][];
  transactionsData: string[][];
  transfersData: string[][];
  labelsData: string[][];
  counts: PullResult['counts'];
}): Promise<PullResult> {
  const {
    userId,
    mode,
    accountsData,
    categoriesData,
    transactionsData,
    transfersData,
    labelsData,
    counts,
  } = params;

  try {
    // Parse using simplified format parsers
    const accountsParsed = parseAccountsFromSheetSimple(accountsData);
    const categoriesParsed = parseCategoriesFromSheetSimple(categoriesData);
    const transactionsParsed = parseTransactionsFromSheetSimple(transactionsData);
    const transfersParsed = parseTransfersFromSheetSimple(transfersData);
    const labelsParsed = parseLabelsFromSheet(labelsData); // Labels unchanged

    if (mode === 'replace') {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.deleteMany({ where: { user_id: userId } });
        await tx.transfer.deleteMany({ where: { user_id: userId } });
        await tx.label.deleteMany({ where: { user_id: userId } });
        await tx.account.deleteMany({ where: { user_id: userId } });
        await tx.category.deleteMany({ where: { user_id: userId, is_system: false } });
      });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Import Labels (unchanged)
      for (const label of labelsParsed) {
        const existing = await tx.label.findFirst({
          where: { user_id: userId, name: label.name },
        });

        if (existing) {
          await tx.label.update({
            where: { id: existing.id },
            data: {
              name: label.name,
              color: label.color,
            },
          });
          counts.labels.updated++;
        } else {
          await tx.label.create({
            data: {
              id: label.id,
              name: label.name,
              color: label.color,
              user_id: userId,
            },
          });
          counts.labels.added++;
        }
      }

      // 2. Import Accounts (lookup by code or name)
      for (const account of accountsParsed) {
        let existing = await tx.account.findFirst({
          where: { user_id: userId, code: account.code },
        });
        if (!existing) {
          existing = await tx.account.findFirst({
            where: { user_id: userId, name: account.name },
          });
        }

        if (existing) {
          await tx.account.update({
            where: { id: existing.id },
            data: {
              name: account.name,
              code: account.code,
              account_type: account.account_type,
              currency: account.currency,
              initial_balance: account.initial_balance,
              icon: account.icon,
              color: account.color,
              is_active: account.is_active,
            },
          });
          counts.accounts.updated++;
        } else {
          await tx.account.create({
            data: {
              name: account.name,
              code: account.code,
              account_type: account.account_type,
              currency: account.currency,
              initial_balance: account.initial_balance,
              icon: account.icon,
              color: account.color,
              is_active: account.is_active,
              user_id: userId,
              group_id: null,
            },
          });
          counts.accounts.added++;
        }
      }

      // 3. Import Categories (lookup by code, resolve parent by code)
      for (const category of categoriesParsed) {
        let parent_id: string | null = null;

        // Resolve parent by parent_code if exists
        if (category.parent_code) {
          const parentCodeParsed = parseCode(category.parent_code);
          const parentCategory = await tx.category.findFirst({
            where: {
              user_id: userId,
              OR: [
                { code: parentCodeParsed.raw },
                { name: parentCodeParsed.name }
              ]
            },
          });
          if (parentCategory) {
            parent_id = parentCategory.id;
          }
        }

        let existing = await tx.category.findFirst({
          where: { user_id: userId, code: category.code },
        });
        if (!existing) {
          existing = await tx.category.findFirst({
            where: { user_id: userId, name: category.name },
          });
        }

        if (existing) {
          await tx.category.update({
            where: { id: existing.id },
            data: {
              name: category.name,
              code: category.code,
              type: category.type,
              nature: category.nature,
              icon: category.icon,
              parent_id,
            },
          });
          counts.categories.updated++;
        } else {
          await tx.category.create({
            data: {
              name: category.name,
              code: category.code,
              type: category.type,
              nature: category.nature,
              icon: category.icon,
              parent_id,
              user_id: userId,
              is_system: false,
            },
          });
          counts.categories.added++;
        }
      }

      // 4. Import Transactions (resolve account & category by code)
      for (const txn of transactionsParsed) {
        // Resolve account by code
        const accountCodeParsed = parseCode(txn.account_code);
        const account = await tx.account.findFirst({
          where: {
            user_id: userId,
            OR: [
              { code: accountCodeParsed.raw },
              { name: accountCodeParsed.name }
            ]
          },
        });

        if (!account) {
          throw new Error(`Account not found for code: ${txn.account_code}`);
        }

        // Resolve category by code if exists
        let category_id: string | null = null;
        if (txn.category_code) {
          const categoryCodeParsed = parseCode(txn.category_code);
          if (categoryCodeParsed.raw) {
            const category = await tx.category.findFirst({
              where: {
                user_id: userId,
                OR: [
                  { code: categoryCodeParsed.raw },
                  { name: categoryCodeParsed.name }
                ]
              },
            });
            if (category) {
              category_id = category.id;
            }
          }
        }

        const existing = await tx.transaction.findFirst({
          where: {
            user_id: userId,
            account_id: account.id,
            type: txn.type,
            amount: txn.amount,
            date: txn.date,
          },
        });

        if (existing) {
          await tx.transaction.update({
            where: { id: existing.id },
            data: {
              account_id: account.id,
              category_id,
              type: txn.type,
              amount: txn.amount,
              date: txn.date,
              description: txn.description ?? null,
            },
          });
          counts.transactions.updated++;
        } else {
          const newTxn = await tx.transaction.create({
            data: {
              account_id: account.id,
              category_id,
              type: txn.type,
              amount: txn.amount,
              currency: account.currency,
              exchange_rate: 1,
              date: txn.date,
              description: txn.description ?? null,
              user_id: userId,
            },
          });
          counts.transactions.added++;

          // Add labels
          if (txn.labels && txn.labels.length > 0) {
            for (const labelName of txn.labels) {
              const label = await tx.label.findFirst({
                where: { user_id: userId, name: labelName },
              });
              if (label) {
                await tx.transactionLabel.create({
                  data: {
                    transaction_id: newTxn.id,
                    label_id: label.id,
                  },
                });
              }
            }
          }
        }
      }

      // 5. Import Transfers (resolve accounts by code)
      for (const transfer of transfersParsed) {
        // Resolve from_account by code
        const fromAccountCodeParsed = parseCode(transfer.from_account_code);
        const fromAccount = await tx.account.findFirst({
          where: {
            user_id: userId,
            OR: [
              { code: fromAccountCodeParsed.raw },
              { name: fromAccountCodeParsed.name }
            ]
          },
        });

        if (!fromAccount) {
          throw new Error(`From account not found for code: ${transfer.from_account_code}`);
        }

        // Resolve to_account by code
        const toAccountCodeParsed = parseCode(transfer.to_account_code);
        const toAccount = await tx.account.findFirst({
          where: {
            user_id: userId,
            OR: [
              { code: toAccountCodeParsed.raw },
              { name: toAccountCodeParsed.name }
            ]
          },
        });

        if (!toAccount) {
          throw new Error(`To account not found for code: ${transfer.to_account_code}`);
        }

        const existing = await tx.transfer.findFirst({
          where: {
            user_id: userId,
            from_account: fromAccount.id,
            to_account: toAccount.id,
            amount: transfer.amount,
            date: transfer.date,
          },
        });

        if (existing) {
          await tx.transfer.update({
            where: { id: existing.id },
            data: {
              from_account: fromAccount.id,
              to_account: toAccount.id,
              amount: transfer.amount,
              date: transfer.date,
              description: transfer.description ?? null,
            },
          });
          counts.transfers.updated++;
        } else {
          await tx.transfer.create({
            data: {
              from_account: fromAccount.id,
              to_account: toAccount.id,
              amount: transfer.amount,
              currency: fromAccount.currency,
              date: transfer.date,
              description: transfer.description ?? null,
              user_id: userId,
            },
          });
          counts.transfers.added++;
        }
      }
    });

    await prisma.syncHistory.create({
      data: {
        user_id: userId,
        direction: 'pull',
        mode,
        status: 'success',
        accounts_added: counts.accounts.added,
        accounts_updated: counts.accounts.updated,
        accounts_deleted: counts.accounts.deleted,
        categories_added: counts.categories.added,
        categories_updated: counts.categories.updated,
        categories_deleted: counts.categories.deleted,
        transactions_added: counts.transactions.added,
        transactions_updated: counts.transactions.updated,
        transactions_deleted: counts.transactions.deleted,
        transfers_added: counts.transfers.added,
        transfers_updated: counts.transfers.updated,
        transfers_deleted: counts.transfers.deleted,
        labels_added: counts.labels.added,
        labels_updated: counts.labels.updated,
        labels_deleted: counts.labels.deleted,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { last_synced_at: new Date() },
    });

    return {
      success: true,
      counts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.syncHistory.create({
      data: {
        user_id: userId,
        direction: 'pull',
        mode,
        status: 'error',
        error_message: errorMessage,
      },
    });

    return {
      success: false,
      counts,
      error: errorMessage,
    };
  }
}
