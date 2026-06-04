/**
 * AI Chat Tools
 *
 * Defines the tools available to the AI for fetching additional data
 * beyond what is already in the system prompt context.
 *
 * toolExecutor: executes a tool call by querying Prisma directly,
 * then formats the result as human-readable text before returning it to the LLM.
 */

import { prisma } from '@/lib/db/prisma';
import type { ToolDefinition, ContextSnapshot } from './types';

// ---------------------------------------------------------------------------
// Tool definitions (sent to the LLM so it knows what tools are available)
// ---------------------------------------------------------------------------

export const ANALYTICS_TOOLS: ToolDefinition[] = [
  {
    name: 'get_transactions',
    description:
      'Ambil daftar transaksi sesuai filter. Gunakan jika user bertanya tentang transaksi spesifik, ' +
      'seperti "transaksi terbesar", "pengeluaran di kategori X", atau "daftar pembelian bulan ini".',
    parameters: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'ISO 8601 datetime string. Default: ikuti context sesi.',
        },
        end_date: {
          type: 'string',
          description: 'ISO 8601 datetime string. Default: ikuti context sesi.',
        },
        category_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter berdasarkan category ID. Kosong = semua kategori.',
        },
        account_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter berdasarkan account ID. Kosong = semua akun.',
        },
        currencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter berdasarkan mata uang, e.g. ["IDR", "USD"].',
        },
        limit: {
          type: 'number',
          description: 'Jumlah transaksi yang dikembalikan. Maks 20. Default 10.',
        },
        sort_by: {
          type: 'string',
          enum: ['date', 'amount'],
          description: 'Field untuk sorting.',
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Urutan sorting.',
        },
        type: {
          type: 'string',
          enum: ['income', 'expense', 'all'],
          description: 'Filter tipe transaksi. Default "all".',
        },
      },
    },
  },
  {
    name: 'get_category_summary',
    description:
      'Ambil ringkasan total income/expense per kategori dalam rentang waktu tertentu. ' +
      'Gunakan jika user bertanya tentang perbandingan antar kategori atau total pengeluaran per kategori.',
    parameters: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'ISO 8601 datetime string.' },
        end_date: { type: 'string', description: 'ISO 8601 datetime string.' },
        category_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter ke kategori tertentu. Kosong = semua.',
        },
        account_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter berdasarkan account. Kosong = semua.',
        },
        currencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter berdasarkan mata uang.',
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

export async function toolExecutor(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  context: ContextSnapshot
): Promise<string> {
  const startDate = (args['start_date'] as string | undefined) ?? context.startDate;
  const endDate = (args['end_date'] as string | undefined) ?? context.endDate;
  const categoryIds = (args['category_ids'] as string[] | undefined) ?? context.categoryIds;
  const accountIds = (args['account_ids'] as string[] | undefined) ?? context.accountIds;
  const currencies = (args['currencies'] as string[] | undefined) ?? context.currencies;
  const searchTerm = context.searchTerm;
  const minAmount = context.minAmount;
  const maxAmount = context.maxAmount;
  const labelIds = context.selectedLabelIds;
  const limit = Math.min(Number(args['limit'] ?? 10), 20);

  switch (toolName) {
    case 'get_transactions': {
      const typeFilter = (args['type'] as string | undefined) ?? 'all';
      const sortBy = (args['sort_by'] as string | undefined) ?? 'date';
      const sortOrder = (args['sort_order'] as string | undefined) ?? 'desc';

      const txns = await prisma.transaction.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          ...(startDate && { date: { gte: new Date(startDate) } }),
          ...(endDate && { date: { lte: new Date(endDate) } }),
          ...(categoryIds.length > 0 && { category_id: { in: categoryIds } }),
          ...(accountIds.length > 0 && { account_id: { in: accountIds } }),
          ...(currencies.length > 0 && { currency: { in: currencies } }),
          ...(labelIds && labelIds.length > 0 && { labels: { some: { label_id: { in: labelIds } } } }),
          ...(searchTerm && {
            OR: [
              { description: { contains: searchTerm, mode: 'insensitive' } },
              { payee: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }),
          ...(minAmount !== undefined && minAmount > 0 && { amount: { gte: minAmount } }),
          ...(maxAmount !== undefined && maxAmount < 20000000 && { amount: { lte: maxAmount } }),
          ...(typeFilter !== 'all' && { type: typeFilter }),
        },
        include: { category: true, account: true },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
      });

      if (txns.length === 0) return '[Tool: get_transactions]\nTidak ada transaksi ditemukan.';

      const lines = txns.map((t, i) => {
        const date = new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const amount = Number(t.amount).toLocaleString('id-ID');
        const category = t.category?.name ?? 'Tanpa kategori';
        const account = t.account?.name ?? 'Tanpa akun';
        const desc = t.description ?? t.payee ?? '-';
        return `${i + 1}. ${desc} | ${category} | ${account} | ${date} | ${t.currency} ${amount}`;
      });

      return `[Tool: get_transactions — ${txns.length} transaksi]\n${lines.join('\n')}`;
    }

    case 'get_category_summary': {
      const groups = await prisma.transaction.groupBy({
        by: ['category_id', 'currency', 'type'],
        where: {
          user_id: userId,
          deleted_at: null,
          type: { in: ['income', 'expense'] },
          ...(startDate && { date: { gte: new Date(startDate) } }),
          ...(endDate && { date: { lte: new Date(endDate) } }),
          ...(categoryIds.length > 0 && { category_id: { in: categoryIds } }),
          ...(accountIds.length > 0 && { account_id: { in: accountIds } }),
          ...(currencies.length > 0 && { currency: { in: currencies } }),
          ...(labelIds && labelIds.length > 0 && { labels: { some: { label_id: { in: labelIds } } } }),
          ...(searchTerm && {
            OR: [
              { description: { contains: searchTerm, mode: 'insensitive' } },
              { payee: { contains: searchTerm, mode: 'insensitive' } },
            ],
          }),
          ...(minAmount !== undefined && minAmount > 0 && { amount: { gte: minAmount } }),
          ...(maxAmount !== undefined && maxAmount < 20000000 && { amount: { lte: maxAmount } }),
        },
        _sum: { amount: true },
      });

      if (groups.length === 0) return '[Tool: get_category_summary]\nTidak ada data ditemukan.';

      // Fetch category names
      const catIds = [...new Set(groups.map((g) => g.category_id).filter(Boolean))] as string[];
      const cats = await prisma.category.findMany({ where: { id: { in: catIds } } });
      const catMap = new Map(cats.map((c) => [c.id, c.name]));

      const lines = groups.map((g) => {
        const name = g.category_id ? (catMap.get(g.category_id) ?? g.category_id) : 'Tanpa kategori';
        const total = Math.abs(Number(g._sum.amount ?? 0)).toLocaleString('id-ID');
        return `- ${name} (${g.type}): ${g.currency} ${total}`;
      });

      return `[Tool: get_category_summary]\n${lines.join('\n')}`;
    }

    default:
      return `[Tool: ${toolName}]\nTool tidak dikenal.`;
  }
}
