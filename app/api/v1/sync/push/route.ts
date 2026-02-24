import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { pushToSheets } from '@/lib/services/syncPush';
import { GoogleAuthError } from '@/lib/auth/google';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { spreadsheetId, spreadsheetName, mode = 'replace' } = body;

    if (mode !== 'merge' && mode !== 'replace') {
      return errorResponse('INVALID_MODE', 'Invalid mode. Must be "merge" or "replace"', 400);
    }

    const result = await pushToSheets({
      userId: authResult.user.user_id,
      spreadsheetId,
      spreadsheetName,
      mode,
    });

    if (!result.success) {
      return errorResponse('PUSH_FAILED', result.error || 'Push failed', 500);
    }

    return successResponse({
      message: 'Data pushed to Google Sheets successfully',
      ...result,
    });
  } catch (error) {
    console.error('Push error:', error);
    
    // Handle Google authentication errors with user-friendly messages
    if (error instanceof GoogleAuthError) {
      return errorResponse('GOOGLE_AUTH_REQUIRED', error.userMessage, 401);
    }
    
    return errorResponse(
      'PUSH_ERROR',
      error instanceof Error ? error.message : 'Failed to push data',
      500
    );
  }
}
