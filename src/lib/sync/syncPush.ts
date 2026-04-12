import { prisma } from '@/lib/db/prisma';
import { GoogleSheetsService } from './googleSheets';
import {
  buildMetadataTab,
  buildAccountsTab,
  buildCategoriesTab,
  buildTransactionsTab,
  buildTransfersTab,
  buildLabelsTab,
  buildAccountsTabSimple,
  buildCategoriesTabSimple,
  buildTransactionsTabSimple,
  buildTransfersTabSimple,
} from './sheetTransform';
import { formatDateForSheet } from '@/utils/timezone';

export interface PushOptions {
  userId: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  mode: 'merge' | 'replace';
  useSimplifiedFormat?: boolean; // Default: true - use user-friendly "Name::PersonalID" format
}

export interface PushResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  counts: {
    accounts: number;
    categories: number;
    transactions: number;
    transfers: number;
    labels: number;
  };
  error?: string;
}

export async function pushToSheets(
  options: PushOptions
): Promise<PushResult> {
  const { userId, mode, useSimplifiedFormat = true } = options;

  try {
    const sheetsService = await GoogleSheetsService.forUser(userId);

    let spreadsheetId = options.spreadsheetId;
    let spreadsheetUrl = '';

    if (!spreadsheetId) {
      const name = options.spreadsheetName || `Finance Data ${new Date().toISOString().split('T')[0]}`;
      const spreadsheet = await sheetsService.createSpreadsheet(name);
      spreadsheetId = spreadsheet.spreadsheetId;
      spreadsheetUrl = spreadsheet.spreadsheetUrl;

      await prisma.user.update({
        where: { id: userId },
        data: {
          google_sheet_id: spreadsheetId,
          google_sheet_url: spreadsheetUrl,
          google_sheet_name: name,
        },
      });
    } else {
      const spreadsheet = await sheetsService.getSpreadsheet(spreadsheetId);
      spreadsheetUrl = spreadsheet.spreadsheetUrl;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currency: true },
    });

    // Fetch data based on format
    let accountsData, categoriesData, transactionsData, transfersData, labelsData;

    if (useSimplifiedFormat) {
      // Simplified format: fetch with relations for code generation
      const [accounts, categories, transactions, transfers, labels] = await Promise.all([
        prisma.account.findMany({
          where: { user_id: userId, deleted_at: null },
          orderBy: { created_at: 'asc' },
        }),
        prisma.category.findMany({
          where: { user_id: userId },
          include: {
            parent: true, // Include parent for parent code
          },
          orderBy: { created_at: 'asc' },
        }),
        prisma.transaction.findMany({
          where: { user_id: userId, deleted_at: null },
          include: {
            labels: {
              include: {
                label: true,
              },
            },
            account: true, // Include account for code
            category: true, // Include category for code
          },
          orderBy: { created_at: 'asc' },
        }),
        prisma.transfer.findMany({
          where: { user_id: userId },
          include: {
            from_account_rel: true, // Include from account
            to_account_rel: true, // Include to account
          },
          orderBy: { created_at: 'asc' },
        }),
        prisma.label.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        }),
      ]);

      const metadataData = buildMetadataTab({
        version: '2.0', // Version 2.0 for simplified format
        exported_at: formatDateForSheet(new Date()),
        user_id: userId,
        currency: user?.currency || 'USD',
      });

      accountsData = buildAccountsTabSimple(accounts);
      categoriesData = buildCategoriesTabSimple(categories);
      transactionsData = buildTransactionsTabSimple(transactions);
      transfersData = buildTransfersTabSimple(transfers);
      labelsData = buildLabelsTab(labels); // Labels unchanged

      await writeToSheets(
        sheetsService,
        spreadsheetId,
        mode,
        metadataData,
        accountsData,
        categoriesData,
        transactionsData,
        transfersData,
        labelsData,
        accounts.length,
        categories.length,
        transactions.length,
        transfers.length,
        labels.length,
        userId
      );

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        counts: {
          accounts: accounts.length,
          categories: categories.length,
          transactions: transactions.length,
          transfers: transfers.length,
          labels: labels.length,
        },
      };
    } else {
      // Full format: original implementation
      const [accounts, categories, transactions, transfers, labels] = await Promise.all([
        prisma.account.findMany({
          where: { user_id: userId, deleted_at: null },
          orderBy: { created_at: 'asc' },
        }),
        prisma.category.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        }),
        prisma.transaction.findMany({
          where: { user_id: userId, deleted_at: null },
          include: {
            labels: {
              include: {
                label: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        }),
        prisma.transfer.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        }),
        prisma.label.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'asc' },
        }),
      ]);

      const metadataData = buildMetadataTab({
        version: '1.0',
        exported_at: formatDateForSheet(new Date()),
        user_id: userId,
        currency: user?.currency || 'USD',
      });

      accountsData = buildAccountsTab(accounts);
      categoriesData = buildCategoriesTab(categories);
      transactionsData = buildTransactionsTab(transactions);
      transfersData = buildTransfersTab(transfers);
      labelsData = buildLabelsTab(labels);

      await writeToSheets(
        sheetsService,
        spreadsheetId,
        mode,
        metadataData,
        accountsData,
        categoriesData,
        transactionsData,
        transfersData,
        labelsData,
        accounts.length,
        categories.length,
        transactions.length,
        transfers.length,
        labels.length,
        userId
      );

      return {
        success: true,
        spreadsheetId,
        spreadsheetUrl,
        counts: {
          accounts: accounts.length,
          categories: categories.length,
          transactions: transactions.length,
          transfers: transfers.length,
          labels: labels.length,
        },
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.syncHistory.create({
      data: {
        user_id: userId,
        direction: 'push',
        mode,
        status: 'error',
        error_message: errorMessage,
      },
    });

    return {
      success: false,
      spreadsheetId: options.spreadsheetId || '',
      spreadsheetUrl: '',
      counts: {
        accounts: 0,
        categories: 0,
        transactions: 0,
        transfers: 0,
        labels: 0,
      },
      error: errorMessage,
    };
  }
}

// Helper function to write data to sheets
async function writeToSheets(
  sheetsService: GoogleSheetsService,
  spreadsheetId: string,
  mode: string,
  metadataData: unknown[][],
  accountsData: unknown[][],
  categoriesData: unknown[][],
  transactionsData: unknown[][],
  transfersData: unknown[][],
  labelsData: unknown[][],
  accountsCount: number,
  categoriesCount: number,
  transactionsCount: number,
  transfersCount: number,
  labelsCount: number,
  userId: string
) {
  if (mode === 'replace') {
    await Promise.all([
      sheetsService.clearRange(spreadsheetId, 'Metadata!A:Z'),
      sheetsService.clearRange(spreadsheetId, 'Accounts!A:Z'),
      sheetsService.clearRange(spreadsheetId, 'Categories!A:Z'),
      sheetsService.clearRange(spreadsheetId, 'Transactions!A:Z'),
      sheetsService.clearRange(spreadsheetId, 'Transfers!A:Z'),
      sheetsService.clearRange(spreadsheetId, 'Labels!A:Z'),
    ]);
  }

  await Promise.all([
    sheetsService.updateValues(spreadsheetId, 'Metadata!A1', metadataData),
    sheetsService.updateValues(spreadsheetId, 'Accounts!A1', accountsData),
    sheetsService.updateValues(spreadsheetId, 'Categories!A1', categoriesData),
    sheetsService.updateValues(spreadsheetId, 'Transactions!A1', transactionsData),
    sheetsService.updateValues(spreadsheetId, 'Transfers!A1', transfersData),
    sheetsService.updateValues(spreadsheetId, 'Labels!A1', labelsData),
  ]);

  await prisma.syncHistory.create({
    data: {
      user_id: userId,
      direction: 'push',
      mode,
      status: 'success',
      accounts_added: mode === 'replace' ? accountsCount : 0,
      categories_added: mode === 'replace' ? categoriesCount : 0,
      transactions_added: mode === 'replace' ? transactionsCount : 0,
      transfers_added: mode === 'replace' ? transfersCount : 0,
      labels_added: mode === 'replace' ? labelsCount : 0,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { last_synced_at: new Date() },
  });
}
