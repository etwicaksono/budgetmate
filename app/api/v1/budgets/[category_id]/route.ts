import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import { resolveRouteParam } from '@/lib/api/params';
import { logError } from '@/lib/logger';

interface RouteParams {
  params?: {
    category_id?: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params, 'category_id');
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required', 400);
  }

  try {
    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return errorResponse('NOT_FOUND', 'Category not found', 404);
    }

    const budget = await prisma.categoryBudget.findUnique({
      where: {
        category_id: categoryId,
      },
    });

    // We can just return the budget, even if it's null (meaning no budget is configured yet)
    return successResponse(budget);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'Budget', 'fetch');
    if (prismaError) return prismaError;
    logError('Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budget', 500);
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params, 'category_id');
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required', 400);
  }

  try {
    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return errorResponse('NOT_FOUND', 'Category not found', 404);
    }

    const data = await request.json();

    const basicMonthly = Number(data.basic_monthly_amount || 0);
    const extendMonthly = Number(data.extend_monthly_amount || 0);
    let basicAnnual = Number(data.basic_annual_amount || 0);
    let extendAnnual = Number(data.extend_annual_amount || 0);

    const totalMonthly = basicMonthly + extendMonthly;
    let totalAnnual = basicAnnual + extendAnnual;

    if (totalAnnual === 0 && totalMonthly > 0) {
      basicAnnual = basicMonthly * 12;
      extendAnnual = extendMonthly * 12;
      totalAnnual = basicAnnual + extendAnnual;
    }

    // Validation rule
    if (totalMonthly > totalAnnual) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Total monthly budget cannot exceed total annual budget.',
        400
      );
    }

    const budget = await prisma.categoryBudget.upsert({
      where: {
        category_id: categoryId,
      },
      update: {
        basic_monthly_amount: basicMonthly,
        extend_monthly_amount: extendMonthly,
        basic_annual_amount: basicAnnual,
        extend_annual_amount: extendAnnual,
      },
      create: {
        category_id: categoryId,
        basic_monthly_amount: basicMonthly,
        extend_monthly_amount: extendMonthly,
        basic_annual_amount: basicAnnual,
        extend_annual_amount: extendAnnual,
      },
    });

    return successResponse(budget);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'Budget', 'update');
    if (prismaError) return prismaError;
    logError('Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update budget', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params, 'category_id');
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required', 400);
  }

  try {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return errorResponse('NOT_FOUND', 'Category not found', 404);
    }

    await prisma.categoryBudget.delete({
      where: {
        category_id: categoryId,
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    const prismaError = handlePrismaError(error, 'Budget', 'delete');
    if (prismaError) return prismaError;
    logError('Unexpected error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete budget', 500);
  }
}
