# 03. Authentication System Implementation

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check authentication checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#authentication-system)
4. 🧪 Write auth tests as per [Document 14](./14_TESTING_REQUIREMENTS.md#backend-unit-tests)

## 🔐 JWT-Based Authentication with Encrypted Token Storage

### Step 1: JWT Token Management

Create `src/lib/auth/jwt.ts`:

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

// Convert secrets to Uint8Array for jose library
const JWT_ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-in-production'
);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production'
);

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Token payload interface
export interface TokenPayload {
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
    return payload as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

// Extract token from Authorization header
export async function extractTokenFromHeader(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  
  const [type, token] = authorization.split(' ');
  if (type !== 'Bearer' || !token) return null;
  
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
```

### Step 2: Password Hashing Utilities

Create `src/lib/auth/password.ts`:

```typescript
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Validate password strength
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Maximum length
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // Uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Generate random password
export function generateRandomPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
```

### Step 3: Authentication Middleware

Create `src/lib/auth/middleware.ts`:

```typescript
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
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    
    // Handle specific JWT errors
    if (error.message?.includes('expired')) {
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
    
    return {
      error: NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'AUTH_INVALID', 
            message: 'Invalid authentication token' 
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
    if (!token) return null;
    
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
    
    if (!user) return null;
    
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
```

### Step 4: Token Encryption for Client Storage

Create `src/utils/crypto.ts`:

```typescript
// Simple encryption for client-side token storage
// In production, use a proper encryption library like crypto-js

const CRYPTO_KEY = process.env.NEXT_PUBLIC_CRYPTO_KEY || 'finance-app-secret-key-2024';

export const tokenCrypto = {
  // Encrypt token for storage
  async encryptToken(token: string): Promise<string> {
    try {
      // Create a simple obfuscation (not secure, use proper encryption in production)
      const timestamp = Date.now().toString();
      const combined = `${timestamp}::${token}::${CRYPTO_KEY}`;
      const encoded = btoa(combined); // Base64 encode
      
      // Reverse the string for additional obfuscation
      return encoded.split('').reverse().join('');
    } catch (error) {
      console.error('Token encryption error:', error);
      throw new Error('Failed to encrypt token');
    }
  },
  
  // Decrypt token from storage
  async decryptToken(encryptedToken: string): Promise<string | null> {
    try {
      // Reverse the string back
      const reversed = encryptedToken.split('').reverse().join('');
      
      // Decode from base64
      const decoded = atob(reversed);
      
      // Split the components
      const parts = decoded.split('::');
      if (parts.length !== 3) return null;
      
      const [timestamp, token, key] = parts;
      
      // Verify the key
      if (key !== CRYPTO_KEY) return null;
      
      // Check token age (optional: add expiry check)
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (tokenAge > maxAge) return null;
      
      return token;
    } catch (error) {
      console.error('Token decryption error:', error);
      return null;
    }
  },
  
  // Clear encryption key (for logout)
  clearKey(): void {
    // In a real implementation, clear any stored keys
    // This is a placeholder for cleanup operations
  }
};

// Additional encryption utilities
export const crypto = {
  // Generate random string
  generateRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
  
  // Hash string (for non-password data)
  async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  
  // Create secure token
  createSecureToken(): string {
    return `${this.generateRandomString(16)}-${Date.now()}-${this.generateRandomString(16)}`;
  }
};
```

### Step 5: Validation Schemas

Create `src/lib/validation/auth.ts`:

```typescript
import { z } from 'zod';

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email too short')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

// Username validation
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim();

// Password validation
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');

// Login schema
export const LoginSchema = z.object({
  email_or_username: z.string().min(3, 'Email or username required'),
  password: passwordSchema
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Register schema
export const RegisterSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  full_name: z.string().min(2).max(255).optional()
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// Refresh token schema
export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required')
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: emailSchema
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// Reset password schema
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  password: passwordSchema
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Change password schema
export const ChangePasswordSchema = z.object({
  current_password: passwordSchema,
  new_password: passwordSchema
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Validate request body
export async function validateAuthInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: any }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
    }
    return { success: false, errors: [{ message: 'Validation failed' }] };
  }
}
```

## 🔑 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Registration Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. User submits: email, username, password                  │
│  2. Validate input (Zod schema)                             │
│  3. Check for existing user                                 │
│  4. Hash password (bcrypt)                                  │
│  5. Create user in database                                 │
│  6. Create default categories (70+)                         │
│  7. Create default accounts (3)                             │
│  8. Generate JWT tokens (access + refresh)                  │
│  9. Return tokens and user data                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        Login Flow                            │
├─────────────────────────────────────────────────────────────┤
│  1. User submits: email/username, password                   │
│  2. Validate input                                          │
│  3. Find user by email or username                          │
│  4. Verify password (bcrypt compare)                        │
│  5. Check account status (not deleted, verified)            │
│  6. Generate JWT tokens                                     │
│  7. Return tokens and user data                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Token Refresh Flow                       │
├─────────────────────────────────────────────────────────────┤
│  1. Client sends refresh token                              │
│  2. Verify refresh token validity                           │
│  3. Extract user information                                │
│  4. Check user still active                                 │
│  5. Generate new token pair                                 │
│  6. Return new tokens                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Protected Route Access                      │
├─────────────────────────────────────────────────────────────┤
│  1. Client sends request with Bearer token                   │
│  2. Extract token from Authorization header                  │
│  3. Verify access token                                     │
│  4. Check user exists and is active                         │
│  5. Allow request to proceed                                │
│  6. Or return 401 Unauthorized                              │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Security Best Practices

### 1. Password Security
```typescript
// ALWAYS hash passwords
const hashedPassword = await hashPassword(plainPassword);

// NEVER store plain passwords
// NEVER log passwords
// NEVER send passwords in response
```

### 2. Token Security
```typescript
// Tokens should be:
// - Short-lived (access: 24h, refresh: 7d)
// - Signed with strong secrets
// - Encrypted before client storage
// - Never logged or exposed
```

### 3. Rate Limiting
```typescript
// Prevent brute force attacks
if (!checkRateLimit(email, 5, 60000)) { // 5 attempts per minute
  return { error: 'Too many attempts' };
}
```

### 4. Input Validation
```typescript
// ALWAYS validate and sanitize input
const validation = await validateAuthInput(schema, input);
if (!validation.success) {
  return { error: validation.errors };
}
```

### 5. Secure Headers
```typescript
// Add security headers to responses
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('X-Frame-Options', 'DENY');
response.headers.set('X-XSS-Protection', '1; mode=block');
```

## ⚠️ Critical Implementation Notes

### 1. Environment Variables
```bash
# MUST set strong secrets in production
JWT_ACCESS_SECRET=<generate-strong-64-char-secret>
JWT_REFRESH_SECRET=<generate-different-64-char-secret>
```

### 2. Token Storage on Client
```typescript
// ALWAYS encrypt before storing
const encrypted = await tokenCrypto.encryptToken(token);
localStorage.setItem('auth-token', encrypted);

// ALWAYS decrypt when reading
const encrypted = localStorage.getItem('auth-token');
const token = await tokenCrypto.decryptToken(encrypted);
```

### 3. User Verification
```typescript
// Always check user status in middleware
const user = await prisma.user.findUnique({
  where: { 
    id: payload.user_id,
    deleted_at: null // Not deleted
  }
});
```

### 4. Error Handling
```typescript
// Never expose internal errors
catch (error) {
  console.error('Internal error:', error); // Log internally
  return { error: 'Authentication failed' }; // Generic message to client
}
```

## ✅ Authentication Checklist

- [ ] JWT utilities created with jose library
- [ ] Password hashing with bcryptjs
- [ ] Auth middleware with user verification
- [ ] Token encryption for client storage
- [ ] Validation schemas with Zod
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Environment variables set
- [ ] Error handling without exposing details
- [ ] Token refresh mechanism ready

## 🎯 Next Steps

1. Implement auth API endpoints as described in [04_API_IMPLEMENTATION.md](./04_API_IMPLEMENTATION.md)
2. Create frontend auth context from [06_CONTEXT_STATE_MANAGEMENT.md](./06_CONTEXT_STATE_MANAGEMENT.md)
3. Build login/register pages from [05_FRONTEND_FOUNDATION.md](./05_FRONTEND_FOUNDATION.md)
