import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse, ApiErrorResponse } from '@/types/api-responses';

/**
 * @summary User logout
 * @description Invalidates the current user session. Requires a valid bearer token. In stateless JWT systems, logout is primarily client-side; the client should delete stored tokens. Future implementations may include token blacklisting via Redis.
 * @tag Auth
 * @security bearerAuth
 * @param request Authenticated request containing bearer token
 * @response 200 - Logout successful: `{ success: true, message: "Logout successful", data: null }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function POST(request: NextRequest): Promise<Response> {
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
      ApiResponseBuilder.success('Logout successful', null) as ApiResponse<null>,
      200
    );
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error') as ApiErrorResponse,
      500
    );
  }
}
