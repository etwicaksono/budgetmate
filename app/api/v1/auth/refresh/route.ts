import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { RefreshTokenRequestSchema, RefreshTokenResponseSchema } from '@/schemas/auth/refresh.schema';
import type { ApiResponse, ApiErrorResponse, RefreshTokenResponse } from '@/types/api-responses';

/**
 * @summary Refresh access token
 * @description Validates a refresh token and issues a new access token and refresh token pair. Returns expiration timestamps for both tokens. Access tokens expire after 24 hours, refresh tokens after 7 days.
 * @tag Auth
 * @bodyContent {application/json} { refresh_token: string }
 * @param request Next.js request containing refresh token
 * @response 200 - Token refreshed successfully: `{ success: true, message: "Token refreshed successfully", data: { access_token: string, refresh_token: string, expired_at: string, refreshable_until: string } }`
 * @response 400 - Missing refresh token: `{ success: false, message: "Refresh token is required" }`
 * @response 401 - Invalid or expired token: `{ success: false, message: "Invalid or expired refresh token" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Validate request body
    const body = await validateBody(request, RefreshTokenRequestSchema);

    // Verify refresh token
    const payload = await verifyRefreshToken(body.refresh_token);
    if (!payload) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid or expired refresh token') as ApiErrorResponse,
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

    const responseData = {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(accessTokenExpiry * 1000).toISOString(),
      refreshable_until: new Date(refreshTokenExpiry * 1000).toISOString(),
    };

    // Validate response data
    const validatedData = RefreshTokenResponseSchema.parse(responseData);

    return jsonResponse(
      ApiResponseBuilder.success('Token refreshed successfully', validatedData) as ApiResponse<RefreshTokenResponse>,
      200
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return handleValidationError(error);
  }
}
