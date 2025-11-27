import { NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth/middleware';
import { successResponse } from '@/lib/api/response';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify user is authenticated before logging out
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  // For JWT-based auth, logout is handled client-side by removing tokens
  // Server-side could implement token blacklisting if needed
  
  return successResponse(
    null,
    { message: 'Logged out successfully' }
  );
}
