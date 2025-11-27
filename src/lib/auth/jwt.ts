import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextRequest } from 'next/server';

// Convert secrets to Uint8Array for jose library
const JWT_ACCESS_SECRET = new TextEncoder().encode(
  process.env['JWT_ACCESS_SECRET'] || 'your-secret-key-change-in-production'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-change-in-production'
);

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Token payload interface extending JWTPayload
export interface TokenPayload extends JWTPayload {
  user_id: string;
  email: string;
  username: string;
}

// Generate access token
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_ACCESS_SECRET);
}

// Generate refresh token
export async function generateRefreshToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

// Verify access token
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_ACCESS_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    // Check if token is expired
    if (error instanceof Error && error.message.includes('exp')) {
      const expiredError = new Error('Access token has expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    // Token is invalid (malformed, wrong signature, etc.)
    const invalidError = new Error('Invalid access token');
    invalidError.name = 'JsonWebTokenError';
    throw invalidError;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as TokenPayload;
  } catch (error) {
    // Check if token is expired
    if (error instanceof Error && error.message.includes('exp')) {
      const expiredError = new Error('Refresh token has expired');
      expiredError.name = 'TokenExpiredError';
      throw expiredError;
    }
    // Token is invalid (malformed, wrong signature, etc.)
    const invalidError = new Error('Invalid refresh token');
    invalidError.name = 'JsonWebTokenError';
    throw invalidError;
  }
}

// Extract token from Authorization header
export async function extractTokenFromHeader(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return null;
  }
  
  const [type, token] = authorization.split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }
  
  return token;
}

// Generate both tokens
export async function generateTokenPair(payload: TokenPayload): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload)
  ]);
  
  return { accessToken, refreshToken };
}
