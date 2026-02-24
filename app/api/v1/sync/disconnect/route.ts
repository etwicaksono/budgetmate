import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { revokeAccess } from '@/lib/auth/google';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    await revokeAccess(authResult.user.user_id);

    return successResponse({
      message: 'Google Sheets connection disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    return errorResponse(
      'DISCONNECT_ERROR',
      error instanceof Error ? error.message : 'Failed to disconnect',
      500
    );
  }
}
