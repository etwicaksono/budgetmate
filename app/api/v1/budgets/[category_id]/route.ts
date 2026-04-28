import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function PUT(
  request: NextRequest,
  { params }: { params: { category_id: string } }
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const categoryId = params.category_id;

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
    const basicAnnual = Number(data.basic_annual_amount || 0);
    const extendAnnual = Number(data.extend_annual_amount || 0);

    const totalMonthly = basicMonthly + extendMonthly;
    const totalAnnual = basicAnnual + extendAnnual;

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
    console.error('Update category budget error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update budget', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { category_id: string } }
): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const categoryId = params.category_id;

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
    console.error('Delete budget error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete budget', 500);
  }
}
