import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const history = await prisma.syncHistory.findMany({
      where: { user_id: authResult.user.user_id },
      orderBy: { synced_at: 'desc' },
      take: Math.min(limit, 50),
    });

    return successResponse({ history });
  } catch (error) {
    console.error('History error:', error);
    return errorResponse(
      'HISTORY_ERROR',
      error instanceof Error ? error.message : 'Failed to get history',
      500
    );
  }
}
