import { NextRequest, NextResponse } from 'next/server';
import { CategoryNature, CategoryType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateCategorySchema, CategoryFilterSchema } from '@/lib/validation/category';
import { logError } from '@/lib/logger';

const normalizeCategoryType = (type?: string): CategoryType => {
  if (type === 'income') return CategoryType.income;
  if (type === 'both') return CategoryType.both;
  return CategoryType.expense;
};

const normalizeCategoryNature = (nature?: string): CategoryNature => {
  switch (nature) {
    case 'NEED':
      return CategoryNature.NEED;
    case 'MUST':
      return CategoryNature.MUST;
    default:
      return CategoryNature.WANT;
  }
};

// GET - Fetch all categories (flat list)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse filter parameters
  const filterInput = Object.fromEntries(searchParams.entries());
  const filterValidation = CategoryFilterSchema.safeParse(filterInput);

  if (!filterValidation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid filter parameters',
      400,
      filterValidation.error.errors
    );
  }

  const filters = filterValidation.data;

  try {
    const where: Record<string, unknown> = {
      user_id: user.user_id
    };

    if (filters.type) {
      where['type'] = filters.type as CategoryType;
    }

    if (filters.parent_id !== undefined) {
      where['parent_id'] = filters.parent_id;
    }

    if (filters.is_active !== undefined) {
      where['is_active'] = filters.is_active;
    }

    if (filters.search) {
      where['name'] = {
        contains: filters.search,
        mode: 'insensitive'
      };
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true }
        },
        _count: {
          select: {
            transactions: {
              where: { deleted_at: null }
            },
            children: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    // Transform response
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      is_active: category.is_active,
      parent_id: category.parent_id,
      parent: category.parent,
      children: category.children,
      transaction_count: category._count.transactions,
      children_count: category._count.children,
      created_at: category.created_at,
      updated_at: category.updated_at
    }));

    return successResponse(transformedCategories, {
      total: transformedCategories.length,
      income_count: transformedCategories.filter(c => c.type === 'income').length,
      expense_count: transformedCategories.filter(c => c.type === 'expense').length
    });

  } catch (error) {
    logError('Category fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch categories', 500);
  }
}

// POST - Create new category
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = CreateCategorySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const data = validation.data;

    // If parent_id provided, verify parent exists and belongs to user
    if (data.parent_id) {
      const parent = await prisma.category.findFirst({
        where: {
          id: data.parent_id,
          user_id: user.user_id
        }
      });

      if (!parent) {
        return errorResponse('INVALID_PARENT', 'Parent category not found', 404);
      }

      // Verify parent type matches
      if (parent.type !== normalizeCategoryType(data.type)) {
        return errorResponse(
          'TYPE_MISMATCH',
          `Parent category type '${parent.type}' does not match new category type '${data.type}'`,
          400
        );
      }

      // If parent has a color and new category doesn't, inherit parent's color
      if (parent.color && !data.color) {
        data.color = parent.color;
      }
    }

    const categoryType = normalizeCategoryType(data.type);

    // Create category
    const category = await prisma.category.create({
      data: {
        user_id: user.user_id,
        name: data.name,
        type: categoryType,
        parent_id: data.parent_id ?? null,
        nature: normalizeCategoryNature(data.nature),
        icon: data.icon,
        color: data.color ?? null,
        is_active: data.is_active,
        created_by: user.user_id
      },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });

    const response = {
      id: category.id,
      name: category.name,
      type: category.type,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      is_active: category.is_active,
      parent_id: category.parent_id,
      parent: category.parent,
      created_at: category.created_at
    };

    return successResponse(response, { message: 'Category created successfully' }, 201);

  } catch (error) {
    logError('Category creation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create category', 500);
  }
}
