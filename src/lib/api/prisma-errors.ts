import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import type { ApiErrorResponse } from './response';
import { errorResponse } from './response';
import { logError } from '@/lib/logger';

export function handlePrismaError(
  error: unknown,
  entityName?: string,
  operation?: string,
): NextResponse<ApiErrorResponse> | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  const context = entityName ?? 'Record';

  logError('Prisma error encountered', {
    entityName: context,
    operation,
    code: error.code,
    message: error.message,
    meta: error.meta,
    error,
  });

  switch (error.code) {
    case 'P2025':
      return errorResponse('NOT_FOUND', `${context} not found`, 404, error.meta);
    case 'P2002':
      return errorResponse('CONFLICT', `${context} already exists`, 409, error.meta);
    case 'P2003':
      return errorResponse('CONFLICT', `${context} is referenced by other records`, 409, error.meta);
    case 'P2014':
      return errorResponse('BAD_REQUEST', `${context} has an invalid required relation`, 400, error.meta);
    case 'P2021':
      return errorResponse('INTERNAL_ERROR', `${context} table does not exist`, 500, error.meta);
    default:
      return errorResponse('INTERNAL_ERROR', 'Database operation failed', 500, error.meta);
  }
}
