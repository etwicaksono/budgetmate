import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

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
