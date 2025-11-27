import { NextResponse } from 'next/server';
import { errorResponse } from './response';

// Custom error classes
export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super('VALIDATION_ERROR', message, 422, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource already exists') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT', message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  // Handle custom API errors
  if (error instanceof ApiError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }
  
  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown };
    
    switch (prismaError.code) {
      case 'P2002':
        return errorResponse(
          'DUPLICATE_ENTRY',
          'A record with this value already exists',
          409,
          prismaError.meta
        );
      case 'P2025':
        return errorResponse(
          'NOT_FOUND',
          'Record not found',
          404,
          prismaError.meta
        );
      case 'P2003':
        return errorResponse(
          'FOREIGN_KEY_ERROR',
          'Related record not found',
          400,
          prismaError.meta
        );
      default:
        return errorResponse(
          'DATABASE_ERROR',
          'Database operation failed',
          500,
          prismaError.meta
        );
    }
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;
    
    return errorResponse('INTERNAL_ERROR', message, 500);
  }
  
  // Fallback for unknown errors
  return errorResponse(
    'UNKNOWN_ERROR',
    'An unexpected error occurred',
    500
  );
}

// Async error wrapper for route handlers
export function asyncHandler<T extends Array<unknown>, R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Validate required fields
export function validateRequiredFields(
  data: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing?: string[] | undefined } {
  const missing: string[] = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined
  };
}
