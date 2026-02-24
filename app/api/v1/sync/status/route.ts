import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.user_id },
      select: {
        google_access_token: true,
        google_sheet_id: true,
        google_sheet_url: true,
        google_sheet_name: true,
        last_synced_at: true,
      },
    });

    const isConnected = !!user?.google_access_token;
    const hasSheet = !!user?.google_sheet_id;

    const lastSync = hasSheet
      ? await prisma.syncHistory.findFirst({
          where: { user_id: authResult.user.user_id },
          orderBy: { synced_at: 'desc' },
        })
      : null;

    return successResponse({
      connected: isConnected,
      sheet: hasSheet
        ? {
            id: user.google_sheet_id,
            url: user.google_sheet_url,
            name: user.google_sheet_name,
          }
        : null,
      lastSync: lastSync
        ? {
            date: lastSync.synced_at,
            direction: lastSync.direction,
            mode: lastSync.mode,
            status: lastSync.status,
          }
        : null,
    });
  } catch (error) {
    console.error('Status error:', error);
    return errorResponse(
      'STATUS_ERROR',
      error instanceof Error ? error.message : 'Failed to get status',
      500
    );
  }
}
