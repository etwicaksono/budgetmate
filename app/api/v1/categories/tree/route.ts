import { NextRequest, NextResponse } from 'next/server';
import { CategoryType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logError } from '@/lib/logger';

interface CategoryNode {
  id: string;
  name: string;
  type: CategoryType;
  nature: string;
  icon: string;
  color: string | null;
  is_active: boolean;
  parent_id: string | null;
  children: CategoryNode[];
  transaction_count?: number;
}

// GET - Fetch categories in tree structure
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type'); // income, expense, or null for both
  const include_counts = searchParams.get('include_counts') === 'true';
  const is_active = searchParams.get('is_active');

  try {
    // Build where clause
    const where: Record<string, unknown> = {
      user_id: user.user_id
    };

    if (type) {
      // Categories with type 'both' should appear when filtering by income or expense
      where['type'] = { in: [type as CategoryType, 'both'] };
    }

    if (is_active !== null) {
      where['is_active'] = is_active === 'true';
    }

    // Fetch all categories for the user
    const categories = await prisma.category.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { parent_id: 'asc' },
        { name: 'asc' }
      ]
    });

    // Optionally fetch transaction counts
    let transactionCounts: Map<string, number> = new Map();
    if (include_counts) {
      const counts = await prisma.transaction.groupBy({
        by: ['category_id'],
        where: {
          user_id: user.user_id,
          deleted_at: null,
          category_id: { in: categories.map(c => c.id) }
        },
        _count: true
      });

      counts.forEach(c => {
        if (c.category_id) {
          transactionCounts.set(c.category_id, c._count);
        }
      });
    }

    // Build tree structure
    const categoryMap = new Map<string, CategoryNode>();
    const rootCategories: CategoryNode[] = [];

    // First pass: create all nodes
    categories.forEach(category => {
      const node: CategoryNode = {
        id: category.id,
        name: category.name,
        type: category.type,
        nature: category.nature,
        icon: category.icon,
        color: category.color,
        is_active: category.is_active,
        parent_id: category.parent_id,
        children: [],
        ...(include_counts && { transaction_count: transactionCounts.get(category.id) ?? 0 })
      };
      categoryMap.set(category.id, node);
    });

    // Second pass: build tree structure
    categoryMap.forEach(node => {
      if (node.parent_id && categoryMap.has(node.parent_id)) {
        const parent = categoryMap.get(node.parent_id);
        if (parent) {
          parent.children.push(node);
        }
      } else if (!node.parent_id) {
        rootCategories.push(node);
      }
    });

    // Sort children recursively
    const sortChildren = (nodes: CategoryNode[]): void => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootCategories);

    // Group by type if not filtered
    // Categories with type 'both' appear in both income and expense groups
    const result = type ? rootCategories : {
      income: rootCategories.filter(c => c.type === 'income' || c.type === 'both'),
      expense: rootCategories.filter(c => c.type === 'expense' || c.type === 'both')
    };

    return successResponse(result, {
      total: categories.length,
      income_count: categories.filter(c => c.type === 'income' || c.type === 'both').length,
      expense_count: categories.filter(c => c.type === 'expense' || c.type === 'both').length
    });

  } catch (error) {
    logError('Category tree fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch category tree', 500);
  }
}
