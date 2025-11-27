import { NextResponse } from 'next/server';

// Standard API response types
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// Success response builder
export function successResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta && { meta })
    },
    { status }
  );
}

// Error response builder
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && details !== null ? { details } : {})
      }
    },
    { status }
  );
}

// Common error responses
export const commonErrors = {
  badRequest: (message: string = 'Bad request', details?: unknown) =>
    errorResponse('BAD_REQUEST', message, 400, details),
  
  unauthorized: (message: string = 'Authentication required') =>
    errorResponse('UNAUTHORIZED', message, 401),
  
  forbidden: (message: string = 'Access denied') =>
    errorResponse('FORBIDDEN', message, 403),
  
  notFound: (resource: string = 'Resource') =>
    errorResponse('NOT_FOUND', `${resource} not found`, 404),
  
  conflict: (message: string = 'Resource already exists') =>
    errorResponse('CONFLICT', message, 409),
  
  validationError: (errors: unknown) =>
    errorResponse('VALIDATION_ERROR', 'Validation failed', 422, errors),
  
  rateLimit: (message: string = 'Too many requests') =>
    errorResponse('RATE_LIMIT', message, 429),
  
  serverError: (message: string = 'Internal server error') =>
    errorResponse('INTERNAL_ERROR', message, 500)
};

// Pagination helper
export function paginationMeta(
  total: number,
  page: number,
  limit: number
): ApiSuccessResponse['meta'] {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
}

// Response with security headers
export function secureResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>['meta'],
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response = successResponse(data, meta, status);
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}
