import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    // Validate required fields
    if (!refresh_token) {
      return jsonResponse(
        ApiResponseBuilder.error('Refresh token is required'),
        400
      );
    }

    // Verify refresh token
    const payload = await verifyRefreshToken(refresh_token);
    if (!payload) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid or expired refresh token'),
        401
      );
    }

    // Generate new tokens
    const tokenPayload = {
      user_id: payload.user_id,
      email: payload.email,
      username: payload.username,
    };

    const newAccessToken = await generateAccessToken(tokenPayload);
    const newRefreshToken = await generateRefreshToken(tokenPayload);

    // Calculate expiration times
    const now = Math.floor(Date.now() / 1000);
    const accessTokenExpiry = now + (24 * 60 * 60); // 24 hours
    const refreshTokenExpiry = now + (7 * 24 * 60 * 60); // 7 days

    // Return response
    return jsonResponse(
      ApiResponseBuilder.success('Token refreshed successfully', {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expired_at: new Date(accessTokenExpiry * 1000).toISOString(),
        refreshable_until: new Date(refreshTokenExpiry * 1000).toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
