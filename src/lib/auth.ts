import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this-in-production'
);

export interface JWTPayload {
  user_id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export async function generateAccessToken(payload: {
  user_id: string;
  email: string;
  username: string;
}): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(payload: {
  user_id: string;
  email: string;
  username: string;
}): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: Request
): Promise<{ user: JWTPayload } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: Response.json(
        { success: false, message: 'Unauthorized', data: null, meta: null },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return {
      error: Response.json(
        { success: false, message: 'Invalid or expired token', data: null, meta: null },
        { status: 401 }
      ),
    };
  }

  return { user };
}
