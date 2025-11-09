export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, unknown> | null;
  errors?: any;
}

export class ApiResponseBuilder {
  static success<T>(
    message: string,
    data: T | null = null,
    additionalMeta?: Record<string, any>
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: {
        version: process.env.API_VERSION || 'v1.0.0',
        timestamp: Math.floor(Date.now() / 1000),
        ...(additionalMeta ?? {}),
      },
    } satisfies ApiResponse<T>;
  }

  static error(message: string, errors: any = null): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      meta: null,
      errors,
    };
  }
}

export function jsonResponse<T>(
  response: ApiResponse<T>,
  statusCode: number = 200
) {
  return Response.json(response, { status: statusCode });
}
