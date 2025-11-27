import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { LoginSchema } from '@/lib/validation/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }
    
    const { email_or_username, password } = validation.data;
    
    // Rate limiting
    const identifier = email_or_username.toLowerCase();
    if (!checkRateLimit(`login:${identifier}`, 5, 60000)) { // 5 attempts per minute
      return errorResponse(
        'RATE_LIMIT',
        'Too many login attempts. Please try again later.',
        429
      );
    }
    
    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ],
        deleted_at: null // User not deleted
      }
    });
    
    if (!user) {
      return errorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email/username or password',
        401
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return errorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email/username or password',
        401
      );
    }
    
    // Generate JWT tokens
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      username: user.username
    };
    
    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updated_at: new Date() }
    });
    
    return successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          timezone: user.timezone,
          currency: user.currency
        },
        access_token: accessToken,
        refresh_token: refreshToken
      },
      { message: 'Login successful' }
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'An error occurred during login',
      500
    );
  }
}
