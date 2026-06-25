import { NextRequest, NextResponse } from 'next/server';

import { verifyRefreshToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { RefreshTokenSchema } from '@/lib/validation/auth';
import { logError } from '@/lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validation = RefreshTokenSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }
    
    const { refresh_token } = validation.data;
    
    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refresh_token);
    } catch {
      return errorResponse(
        'INVALID_TOKEN',
        'Invalid or expired refresh token',
        401
      );
    }
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.user_id,
        deleted_at: null
      }
    });
    
    if (!user) {
      return errorResponse(
        'USER_NOT_FOUND',
        'User not found or has been deactivated',
        401
      );
    }
    
    // Generate new access token only
    // Keep the existing refresh token (don't rotate)
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      username: user.username
    };
    
    const { generateAccessToken } = await import('@/lib/auth/jwt');
    const accessToken = await generateAccessToken(tokenPayload);
    
    return successResponse(
      {
        access_token: accessToken,
        refresh_token: refresh_token // Return the same refresh token
      },
      { message: 'Token refreshed successfully' }
    );
    
  } catch (error) {
    logError('Token refresh error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'An error occurred during token refresh',
      500
    );
  }
}
