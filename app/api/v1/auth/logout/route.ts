import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

/**
 * @summary Invalidate the active session.
 * @description Requires a valid bearer token, verifies it via `requireAuth`, and instructs the client to discard locally stored credentials (JWT blacklist hooks can be added here).
 * @tag Auth
 * @security bearerAuth
 * @param request Authenticated request containing the bearer token.
 * @response 200 - Logout acknowledged; client should delete local tokens.
 * @response 401 - Authentication failed or token is missing.
 * @response 500 - Server error terminating the session.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // In a stateless JWT system, logout is primarily client-side
    // The client should delete the tokens from storage
    // If you implement token blacklisting with Redis, add that logic here

    return jsonResponse(
      ApiResponseBuilder.success('Logout successful', null),
      200
    );
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
