import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader } from './jwt';
import { prisma } from '@/lib/db/prisma';

// Auth result types
export interface AuthUser {
  user_id: string;
  email: string;
  username: string;
}

export interface AuthResult {
  user: AuthUser;
}

export interface AuthError {
  error: NextResponse;
}

// Main auth middleware function
export async function requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
  try {
    // Extract token from header
    const token = await extractTokenFromHeader(request);
    
    if (!token) {
      return {
        error: NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'AUTH_REQUIRED', 
              message: 'Authentication required' 
            } 
          },
          { status: 401 }
        )
      };
    }
    
    // Verify token
    const payload = await verifyAccessToken(token);
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.user_id,
        deleted_at: null // User not deleted
      },
      select: { 
        id: true, 
        email: true, 
        username: true,
        email_verified: true
      }
    });
    
    if (!user) {
      return {
        error: NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'USER_NOT_FOUND', 
              message: 'User not found or has been deactivated' 
            } 
          },
          { status: 401 }
        )
      };
    }
    
    // Return authenticated user
    return {
      user: {
        user_id: user.id,
        email: user.email,
        username: user.username
      }
    };
  } catch (error: unknown) {
    // Handle specific JWT errors
    if (error instanceof Error) {
      // Token expired - return specific error code for frontend to refresh
      // This is expected behavior, no need to log as error
      if (error.name === 'TokenExpiredError' || error.message?.includes('expired')) {
        return {
          error: NextResponse.json(
            { 
              success: false, 
              error: { 
                code: 'TOKEN_EXPIRED', 
                message: 'Access token has expired' 
              } 
            },
            { status: 401 }
          )
        };
      }
      
      // Invalid token (wrong signature, malformed, etc.)
      if (error.name === 'JsonWebTokenError' || error.message?.includes('Invalid')) {
        return {
          error: NextResponse.json(
            { 
              success: false, 
              error: { 
                code: 'TOKEN_INVALID', 
                message: 'Invalid authentication token' 
              } 
            },
            { status: 401 }
          )
        };
      }
    }
    
    // Log unexpected auth errors
    console.error('Unexpected auth error:', error);
    
    // Generic auth error
    return {
      error: NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'AUTH_FAILED', 
            message: 'Authentication failed' 
          } 
        },
        { status: 401 }
      )
    };
  }
}

// Optional auth (doesn't fail if no token)
export async function optionalAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = await extractTokenFromHeader(request);
    if (!token) {
      return null;
    }
    
    const payload = await verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.user_id,
        deleted_at: null
      },
      select: { 
        id: true, 
        email: true, 
        username: true 
      }
    });
    
    if (!user) {
      return null;
    }
    
    return {
      user_id: user.id,
      email: user.email,
      username: user.username
    };
  } catch {
    return null;
  }
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}
