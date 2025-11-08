import { z } from 'zod';

/**
 * Format Zod errors for API responses
 */
export function formatZodErrors(error: z.ZodError) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Convert Zod errors to field-based error object
 * Useful for form libraries
 */
export function zodErrorsToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    // Only store first error per field
    if (!fieldErrors[field]) {
      fieldErrors[field] = err.message;
    }
  });
  
  return fieldErrors;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof z.ZodError) {
    // Return first error message
    return error.errors[0]?.message || 'Validation failed';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
