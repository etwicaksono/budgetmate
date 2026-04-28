import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { errorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;

  try {
    // We only fetch the actual configured budgets here.
    // Heavy aggregations for "spent" amounts have been removed as they are 
    // unnecessary for configuration and caused massive latency. 
    // They belong in the /status endpoint instead.
    const budgets = await prisma.categoryBudget.findMany({
      where: {
        category: {
          user_id: user.user_id,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Fetch budgets error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budgets', 500);
  }
}
