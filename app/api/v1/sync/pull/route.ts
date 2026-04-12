import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { pullFromSheets } from '@/lib/sync/syncPull';
import { prisma } from '@/lib/db/prisma';
import { GoogleAuthError } from '@/lib/auth/google';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if ('error' in authResult) return authResult.error;

  try {
    const body = await req.json();
    const { mode = 'replace' } = body;

    if (mode !== 'merge' && mode !== 'replace') {
      return errorResponse('INVALID_MODE', 'Invalid mode. Must be "merge" or "replace"', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.user_id },
      select: { google_sheet_id: true },
    });

    if (!user?.google_sheet_id) {
      return errorResponse('NO_SHEET', 'No Google Sheet configured', 400);
    }

    const result = await pullFromSheets({
      userId: authResult.user.user_id,
      spreadsheetId: user.google_sheet_id,
      mode,
    });

    if (!result.success) {
      return errorResponse('PULL_FAILED', result.error || 'Pull failed', 500);
    }

    return successResponse({
      message: 'Data pulled from Google Sheets successfully',
      ...result,
    });
  } catch (error) {
    console.error('Pull error:', error);
    
    // Handle Google authentication errors with user-friendly messages
    if (error instanceof GoogleAuthError) {
      return errorResponse('GOOGLE_AUTH_REQUIRED', error.userMessage, 401);
    }
    
    return errorResponse(
      'PULL_ERROR',
      error instanceof Error ? error.message : 'Failed to pull data',
      500
    );
  }
}
