import { NextRequest } from 'next/server';

/**
 * Type guard to check if a parameter value is valid
 * @param value - The parameter value to check
 * @returns True if the value is a non-empty string and not 'undefined'
 */
export const isValidParam = (value?: string): value is string => 
  Boolean(value && value !== 'undefined');

/**
 * Resolves a route parameter ID from Next.js App Router context
 * Falls back to extracting from URL pathname if params.id is not available
 * 
 * @param request - The Next.js request object
 * @param params - The route params object from Next.js context
 * @param paramKey - The parameter key to extract (default: 'id')
 * @returns The resolved ID string or null if not found
 * 
 * @example
 * ```ts
 * export async function GET(request: NextRequest, { params }: { params: { id?: string } }) {
 *   const id = resolveRouteParam(request, params);
 *   if (!id) {
 *     return errorResponse('VALIDATION_ERROR', 'ID is required', 400);
 *   }
 *   // Use id safely...
 * }
 * ```
 */
export const resolveRouteParam = (
  request: NextRequest,
  params?: { [key: string]: string | undefined },
  paramKey: string = 'id'
): string | null => {
  // Try to get from params first
  if (params && isValidParam(params[paramKey])) {
    return params[paramKey]!;
  }

  // Fallback: extract from URL pathname
  const pathname = request.nextUrl?.pathname ?? '';
  const segments = pathname.split('/').filter(Boolean);
  const fallbackId = segments.at(-1);

  return isValidParam(fallbackId) ? fallbackId : null;
};

/**
 * Resolves a transaction ID from route parameters
 * @deprecated Use resolveRouteParam instead
 */
export const resolveTransactionId = (
  request: NextRequest,
  params?: { id?: string }
): string | null => {
  return resolveRouteParam(request, params, 'id');
};
