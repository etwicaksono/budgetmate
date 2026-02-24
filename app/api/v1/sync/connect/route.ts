import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getAuthorizationUrl } from '@/lib/auth/google';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    const state = Buffer.from(
      JSON.stringify({ userId: authResult.user.user_id, timestamp: Date.now() })
    ).toString('base64');

    const authUrl = getAuthorizationUrl(state);

    return successResponse({ authUrl });
  } catch (error) {
    console.error('Connect error:', error);
    return errorResponse(
      'CONNECT_ERROR',
      error instanceof Error ? error.message : 'Failed to initiate connection',
      500
    );
  }
}
