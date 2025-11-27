# 04. API Implementation Guide

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check ALL API checklists in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#api-endpoints)
4. 🧪 Write API integration tests as per [Document 14](./14_TESTING_REQUIREMENTS.md#api-integration-tests)

## 🚀 Complete REST API Implementation

### Prerequisites
Before implementing APIs, ensure you have:
1. Database schema from [02_DATABASE_SCHEMA.md](./02_DATABASE_SCHEMA.md)
2. Authentication system from [03_AUTHENTICATION_SYSTEM.md](./03_AUTHENTICATION_SYSTEM.md)
3. Default data from [07_DEFAULT_DATA_SEEDING.md](./07_DEFAULT_DATA_SEEDING.md)

## 📦 Response Builder

Create `src/lib/api/response.ts`:

```typescript
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
    timestamp?: string;
    version?: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export class ApiResponseBuilder {
  static success<T>(data?: T, message?: string, meta?: any): SuccessResponse<T> {
    return {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
      ...(meta && { meta: { ...meta, timestamp: new Date().toISOString() } })
    };
  }
  
  static error(code: string, message: string, details?: any): ErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: crypto.randomUUID()
      }
    };
  }
  
  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): SuccessResponse<T[]> {
    return {
      success: true,
      data,
      meta: {
        page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit),
        timestamp: new Date().toISOString()
      }
    };
  }
  
  static validationError(errors: any[]): ErrorResponse {
    return this.error(
      'VALIDATION_ERROR',
      'Validation failed',
      errors
    );
  }
  
  static notFound(resource: string): ErrorResponse {
    return this.error(
      'NOT_FOUND',
      `${resource} not found`
    );
  }
  
  static unauthorized(message: string = 'Unauthorized'): ErrorResponse {
    return this.error('UNAUTHORIZED', message);
  }
  
  static forbidden(message: string = 'Forbidden'): ErrorResponse {
    return this.error('FORBIDDEN', message);
  }
}
```

## 🔐 Authentication Endpoints

### Register Endpoint with Auto-Seeding

Create `app/api/v1/auth/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { ApiResponseBuilder } from '@/lib/api/response';
import { RegisterSchema } from '@/lib/validation/auth';
import defaultCategories from '@/data/default_categories.json';
import defaultAccounts from '@/data/default_accounts.json';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(validation.error.errors),
        { status: 400 }
      );
    }
    
    const { email, username, password, full_name } = validation.data;
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'WEAK_PASSWORD',
          'Password does not meet requirements',
          passwordValidation.errors
        ),
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });
    
    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return NextResponse.json(
        ApiResponseBuilder.error(
          'USER_EXISTS',
          `User with this ${field} already exists`
        ),
        { status: 409 }
      );
    }
    
    // Hash password
    const password_hash = await hashPassword(password);
    
    // Create user with default data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password_hash,
          full_name,
          email_verified: false,
          timezone: 'UTC',
          currency: 'USD'
        }
      });
      
      // 2. Create default income categories
      let categoryPersonalId = 1;
      
      for (const category of defaultCategories.income) {
        await tx.category.create({
          data: {
            user_id: user.id,
            personal_id: BigInt(categoryPersonalId++),
            name: category.name,
            type: 'income',
            nature: category.nature || 'WANT',
            icon: category.icon,
            color: category.color,
            is_system: true,
            is_active: true
          }
        });
      }
      
      // 3. Create default expense categories with hierarchy
      for (const [parentName, parentData] of Object.entries(defaultCategories.expense)) {
        // Create parent category
        const parent = await tx.category.create({
          data: {
            user_id: user.id,
            personal_id: BigInt(categoryPersonalId++),
            name: parentName,
            type: 'expense',
            nature: (parentData as any).nature || 'WANT',
            icon: (parentData as any).icon,
            color: (parentData as any).color,
            is_system: true,
            is_active: true
          }
        });
        
        // Create child categories
        if ((parentData as any).children) {
          for (const child of (parentData as any).children) {
            await tx.category.create({
              data: {
                user_id: user.id,
                personal_id: BigInt(categoryPersonalId++),
                parent_id: parent.id,
                name: child.name,
                type: 'expense',
                nature: child.nature || (parentData as any).nature || 'WANT',
                icon: child.icon,
                color: (parentData as any).color, // Inherit parent color
                is_system: true,
                is_active: true
              }
            });
          }
        }
      }
      
      // 4. Create default accounts
      for (const account of defaultAccounts) {
        await tx.account.create({
          data: {
            user_id: user.id,
            personal_id: BigInt(account.personal_id),
            name: account.name,
            account_type: account.account_type,
            icon: account.icon,
            color: account.color,
            currency: account.currency || 'USD',
            initial_balance: account.initial_balance || 0,
            current_balance: account.initial_balance || 0,
            is_active: account.is_active,
            is_included_in_total: account.is_included_in_total
          }
        });
      }
      
      return user;
    });
    
    // Generate JWT tokens
    const tokenPayload = {
      user_id: result.id,
      email: result.email,
      username: result.username
    };
    
    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);
    
    // Return success response with tokens
    return NextResponse.json(
      ApiResponseBuilder.success({
        user: {
          id: result.id,
          email: result.email,
          username: result.username,
          full_name: result.full_name,
          created_at: result.created_at
        },
        access_token: accessToken,
        refresh_token: refreshToken
      }, 'Registration successful'),
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error(
        'INTERNAL_ERROR',
        'An error occurred during registration'
      ),
      { status: 500 }
    );
  }
}
```

### Login Endpoint

Create `app/api/v1/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { checkRateLimit } from '@/lib/auth/middleware';
import { ApiResponseBuilder } from '@/lib/api/response';
import { LoginSchema } from '@/lib/validation/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(validation.error.errors),
        { status: 400 }
      );
    }
    
    const { email_or_username, password } = validation.data;
    
    // Rate limiting
    const identifier = email_or_username.toLowerCase();
    if (!checkRateLimit(`login:${identifier}`, 5, 60000)) { // 5 attempts per minute
      return NextResponse.json(
        ApiResponseBuilder.error(
          'RATE_LIMIT',
          'Too many login attempts. Please try again later.'
        ),
        { status: 429 }
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
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_CREDENTIALS',
          'Invalid email/username or password'
        ),
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_CREDENTIALS',
          'Invalid email/username or password'
        ),
        { status: 401 }
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
    
    return NextResponse.json(
      ApiResponseBuilder.success({
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
      }, 'Login successful')
    );
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error(
        'INTERNAL_ERROR',
        'An error occurred during login'
      ),
      { status: 500 }
    );
  }
}
```

### Refresh Token Endpoint

Create `app/api/v1/auth/refresh/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, generateTokenPair } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { ApiResponseBuilder } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'MISSING_TOKEN',
          'Refresh token is required'
        ),
        { status: 400 }
      );
    }
    
    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refresh_token);
    } catch (error) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'INVALID_TOKEN',
          'Invalid or expired refresh token'
        ),
        { status: 401 }
      );
    }
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.user_id,
        deleted_at: null
      }
    });
    
    if (!user) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'USER_NOT_FOUND',
          'User not found or has been deactivated'
        ),
        { status: 401 }
      );
    }
    
    // Generate new token pair
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      username: user.username
    };
    
    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);
    
    return NextResponse.json(
      ApiResponseBuilder.success({
        access_token: accessToken,
        refresh_token: refreshToken
      }, 'Token refreshed successfully')
    );
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error(
        'INTERNAL_ERROR',
        'An error occurred during token refresh'
      ),
      { status: 500 }
    );
  }
}
```

## 💰 Transaction Endpoints

### Create Transaction with Personal ID Management

Create `app/api/v1/transactions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponseBuilder } from '@/lib/api/response';

// Validation schema
const CreateTransactionSchema = z.object({
  personal_id: z.number().positive(),
  date: z.string().datetime(),
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  payee: z.string().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  label_ids: z.array(z.string().uuid()).optional()
});

// GET - Fetch transactions with filtering and pagination
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;
  
  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const account_id = searchParams.get('account_id');
  const category_id = searchParams.get('category_id');
  const type = searchParams.get('type');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');
  const min_amount = searchParams.get('min_amount');
  const max_amount = searchParams.get('max_amount');
  const keyword = searchParams.get('keyword');
  const label_ids = searchParams.get('label_ids')?.split(',');
  const sort_by = searchParams.get('sort_by') || 'date';
  const sort_order = searchParams.get('sort_order') || 'desc';
  
  try {
    // Build where clause
    const where: any = {
      user_id: user.user_id,
      deleted_at: null
    };
    
    if (account_id) where.account_id = account_id;
    if (category_id) where.category_id = category_id;
    if (type) where.type = type;
    
    // Date range
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date.gte = new Date(start_date);
      if (end_date) where.date.lte = new Date(end_date);
    }
    
    // Amount range
    if (min_amount || max_amount) {
      where.amount = {};
      if (min_amount) where.amount.gte = parseFloat(min_amount);
      if (max_amount) where.amount.lte = parseFloat(max_amount);
    }
    
    // Keyword search in description and payee
    if (keyword) {
      where.OR = [
        { description: { contains: keyword, mode: 'insensitive' } },
        { payee: { contains: keyword, mode: 'insensitive' } }
      ];
    }
    
    // Label filter
    if (label_ids && label_ids.length > 0) {
      where.labels = {
        some: {
          label_id: { in: label_ids }
        }
      };
    }
    
    // Execute queries
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: { 
              id: true,
              name: true, 
              icon: true, 
              color: true,
              type: true
            }
          },
          account: {
            select: { 
              id: true,
              name: true,
              icon: true,
              color: true,
              currency: true
            }
          },
          labels: {
            include: {
              label: {
                select: { 
                  id: true, 
                  name: true, 
                  color: true 
                }
              }
            }
          }
        },
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transaction.count({ where })
    ]);
    
    // Transform response
    const transformedTransactions = transactions.map(tx => ({
      id: tx.id,
      personal_id: Number(tx.personal_id),
      date: tx.date,
      account_id: tx.account_id,
      account: tx.account,
      category_id: tx.category_id,
      category: tx.category,
      amount: tx.amount.toNumber(),
      type: tx.type,
      description: tx.description,
      currency: tx.currency,
      payee: tx.payee,
      payment_method: tx.payment_method,
      payment_status: tx.payment_status,
      labels: tx.labels.map(l => l.label),
      created_at: tx.created_at,
      updated_at: tx.updated_at
    }));
    
    return NextResponse.json(
      ApiResponseBuilder.paginated(
        transformedTransactions,
        page,
        limit,
        total
      )
    );
    
  } catch (error) {
    console.error('Transaction fetch error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error(
        'INTERNAL_ERROR',
        'Failed to fetch transactions'
      ),
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;
  
  const { user } = authResult;
  
  try {
    const body = await request.json();
    const validation = CreateTransactionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(validation.error.errors),
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // CRITICAL: Amount sign convention
    // Expenses are NEGATIVE, income is POSITIVE
    const finalAmount = data.type === 'expense' 
      ? -Math.abs(data.amount) 
      : Math.abs(data.amount);
    
    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: data.account_id,
        user_id: user.user_id,
        is_active: true
      }
    });
    
    if (!account) {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_ACCOUNT', 'Account not found or inactive'),
        { status: 404 }
      );
    }
    
    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: data.category_id,
        user_id: user.user_id,
        is_active: true
      }
    });
    
    if (!category) {
      return NextResponse.json(
        ApiResponseBuilder.error('INVALID_CATEGORY', 'Category not found or inactive'),
        { status: 404 }
      );
    }
    
    // Create transaction with retry logic for personal_id conflicts
    let retries = 3;
    let currentPersonalId = data.personal_id;
    
    while (retries > 0) {
      try {
        const transaction = await prisma.$transaction(async (tx) => {
          // Create transaction
          const created = await tx.transaction.create({
            data: {
              user_id: user.user_id,
              personal_id: BigInt(currentPersonalId),
              date: new Date(data.date),
              account_id: data.account_id,
              category_id: data.category_id,
              amount: finalAmount,
              type: data.type,
              description: data.description,
              currency: data.currency,
              payee: data.payee,
              payment_method: data.payment_method,
              payment_status: data.payment_status
            },
            include: {
              category: {
                select: { name: true, icon: true, color: true }
              },
              account: {
                select: { name: true }
              }
            }
          });
          
          // Create label associations if provided
          if (data.label_ids && data.label_ids.length > 0) {
            await tx.transactionLabel.createMany({
              data: data.label_ids.map(label_id => ({
                transaction_id: created.id,
                label_id
              }))
            });
          }
          
          // Update account balance
          await tx.account.update({
            where: { id: data.account_id },
            data: {
              current_balance: {
                increment: finalAmount
              }
            }
          });
          
          return created;
        });
        
        // Transform response
        const response = {
          ...transaction,
          personal_id: Number(transaction.personal_id),
          amount: transaction.amount.toNumber()
        };
        
        return NextResponse.json(
          ApiResponseBuilder.success(response, 'Transaction created successfully'),
          { status: 201 }
        );
        
      } catch (error: any) {
        // Check if it's a unique constraint violation on personal_id
        if (error.code === 'P2002' && error.meta?.target?.includes('personal_id')) {
          // Fetch new max personal_id
          const maxTransaction = await prisma.transaction.findFirst({
            where: { user_id: user.user_id },
            orderBy: { personal_id: 'desc' },
            select: { personal_id: true }
          });
          
          currentPersonalId = Number(maxTransaction?.personal_id || 0n) + 1;
          retries--;
          continue;
        }
        
        throw error;
      }
    }
    
    return NextResponse.json(
      ApiResponseBuilder.error(
        'PERSONAL_ID_CONFLICT',
        'Unable to create transaction after multiple attempts'
      ),
      { status: 409 }
    );
    
  } catch (error) {
    console.error('Transaction creation error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error(
        'INTERNAL_ERROR',
        'Failed to create transaction'
      ),
      { status: 500 }
    );
  }
}
```

## 🏦 Account Endpoints

Create `app/api/v1/accounts/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponseBuilder } from '@/lib/api/response';

const CreateAccountSchema = z.object({
  personal_id: z.number().positive(),
  name: z.string().min(1).max(100),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  currency: z.string().default('USD'),
  initial_balance: z.number().default(0),
  group_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
  is_included_in_total: z.boolean().default(true)
});

// GET - Fetch all accounts
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;
  
  const { user } = authResult;
  const { searchParams } = new URL(request.url);
  
  const is_active = searchParams.get('is_active');
  const group_id = searchParams.get('group_id');
  const include_balance = searchParams.get('include_balance') !== 'false';
  
  try {
    const where: any = {
      user_id: user.user_id,
      deleted_at: null
    };
    
    if (is_active !== null) {
      where.is_active = is_active === 'true';
    }
    
    if (group_id) {
      where.group_id = group_id;
    }
    
    const accounts = await prisma.account.findMany({
      where,
      include: {
        group: {
          select: { name: true, icon: true, color: true }
        }
      },
      orderBy: { personal_id: 'asc' }
    });
    
    // Transform response
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      personal_id: Number(account.personal_id),
      name: account.name,
      account_type: account.account_type,
      icon: account.icon,
      color: account.color,
      currency: account.currency,
      initial_balance: account.initial_balance.toNumber(),
      current_balance: account.current_balance.toNumber(),
      credit_limit: account.credit_limit?.toNumber() || null,
      interest_rate: account.interest_rate?.toNumber() || null,
      is_active: account.is_active,
      is_included_in_total: account.is_included_in_total,
      group: account.group,
      created_at: account.created_at,
      updated_at: account.updated_at
    }));
    
    // Calculate total balance if requested
    const meta: any = {
      total: transformedAccounts.length
    };
    
    if (include_balance) {
      meta.total_balance = transformedAccounts
        .filter(a => a.is_included_in_total)
        .reduce((sum, a) => sum + a.current_balance, 0);
    }
    
    return NextResponse.json(
      ApiResponseBuilder.success(transformedAccounts, undefined, meta)
    );
    
  } catch (error) {
    console.error('Account fetch error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch accounts'),
      { status: 500 }
    );
  }
}

// POST - Create new account
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;
  
  const { user } = authResult;
  
  try {
    const body = await request.json();
    const validation = CreateAccountSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        ApiResponseBuilder.validationError(validation.error.errors),
        { status: 400 }
      );
    }
    
    const data = validation.data;
    
    // Check for personal_id conflict
    const existing = await prisma.account.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(data.personal_id)
      }
    });
    
    if (existing) {
      return NextResponse.json(
        ApiResponseBuilder.error(
          'PERSONAL_ID_EXISTS',
          'An account with this personal ID already exists'
        ),
        { status: 409 }
      );
    }
    
    const account = await prisma.account.create({
      data: {
        user_id: user.user_id,
        personal_id: BigInt(data.personal_id),
        name: data.name,
        account_type: data.account_type,
        icon: data.icon,
        color: data.color,
        currency: data.currency,
        initial_balance: data.initial_balance,
        current_balance: data.initial_balance,
        group_id: data.group_id,
        is_active: data.is_active,
        is_included_in_total: data.is_included_in_total
      }
    });
    
    const response = {
      ...account,
      personal_id: Number(account.personal_id),
      initial_balance: account.initial_balance.toNumber(),
      current_balance: account.current_balance.toNumber()
    };
    
    return NextResponse.json(
      ApiResponseBuilder.success(response, 'Account created successfully'),
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Account creation error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to create account'),
      { status: 500 }
    );
  }
}
```

## 📝 Personal IDs Endpoint

Create `app/api/v1/personal-ids/max/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { ApiResponseBuilder } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;
  
  const { user } = authResult;
  
  try {
    // Fetch max personal IDs for all tables
    const [
      maxTransaction,
      maxAccount,
      maxCategory,
      maxLabel,
      maxTransfer,
      maxGroup
    ] = await Promise.all([
      prisma.transaction.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.account.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.category.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.label.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.transfer.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.accountGroup.findFirst({
        where: { user_id: user.user_id },
        orderBy: { position: 'desc' },
        select: { position: true }
      })
    ]);
    
    const maxPersonalIds = {
      transactions: Number(maxTransaction?.personal_id || 0n),
      accounts: Number(maxAccount?.personal_id || 0n),
      categories: Number(maxCategory?.personal_id || 0n),
      labels: Number(maxLabel?.personal_id || 0n),
      transfers: Number(maxTransfer?.personal_id || 0n),
      groups: maxGroup?.position || 0
    };
    
    return NextResponse.json(
      ApiResponseBuilder.success(maxPersonalIds)
    );
    
  } catch (error) {
    console.error('Personal IDs fetch error:', error);
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', 'Failed to fetch personal IDs'),
      { status: 500 }
    );
  }
}
```

## ⚠️ Critical API Implementation Rules

### 1. Always Check User Ownership
```typescript
// NEVER trust client-provided IDs
const resource = await prisma.resource.findFirst({
  where: {
    id: providedId,
    user_id: user.user_id // ALWAYS filter by user
  }
});
```

### 2. Handle Personal ID Conflicts
```typescript
// Implement retry logic for personal_id conflicts
let retries = 3;
while (retries > 0) {
  try {
    // Create with personal_id
  } catch (error) {
    if (error.code === 'P2002') { // Unique constraint
      // Fetch new max and retry
      retries--;
      continue;
    }
    throw error;
  }
}
```

### 3. Transform BigInt and Decimal
```typescript
// Always convert for JSON serialization
personal_id: Number(dbRecord.personal_id)
amount: dbRecord.amount.toNumber()
```

### 4. Use Transactions for Multi-Step Operations
```typescript
await prisma.$transaction(async (tx) => {
  // All operations succeed or fail together
});
```

### 5. Consistent Error Responses
```typescript
// Always use ApiResponseBuilder
return NextResponse.json(
  ApiResponseBuilder.error(code, message),
  { status: httpStatus }
);
```

## ✅ API Implementation Checklist

- [ ] Response builder utilities created
- [ ] Authentication endpoints implemented
- [ ] Register endpoint creates default data
- [ ] Login endpoint with rate limiting
- [ ] Token refresh mechanism working
- [ ] Transaction endpoints with personal_id retry
- [ ] Account management endpoints
- [ ] Personal IDs max endpoint
- [ ] All endpoints check user ownership
- [ ] Consistent error handling
- [ ] BigInt/Decimal conversions handled

## 🎯 Next Steps

1. Continue implementing remaining endpoints (categories, transfers, etc.)
2. Set up frontend services from [08_SERVICES_LAYER.md](./08_SERVICES_LAYER.md)
3. Create context providers from [06_CONTEXT_STATE_MANAGEMENT.md](./06_CONTEXT_STATE_MANAGEMENT.md)
