import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { errorResponse, successResponse } from '@/lib/api/response';
import { isValidLocale } from '@/config/locales';

/**
 * GET /api/v1/user/settings
 * Fetch user settings (timezone, locale, etc.)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const userSettings = await prisma.user.findUnique({
      where: { id: user.user_id },
      select: {
        timezone: true,

        date_format: true,
        number_format: true,
        locale: true,
      },
    });

    if (!userSettings) {
      return errorResponse('NOT_FOUND', 'User settings not found', 404);
    }

    return successResponse(userSettings);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error while fetching user settings:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
        userId: user.user_id,
      });

      return errorResponse(
        'DATABASE_ERROR',
        `Database operation failed: ${error.code}`,
        500
      );
    }

    console.error('Unexpected error while fetching user settings:', {
      userId: user.user_id,
      error,
    });

    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to fetch user settings',
      500
    );
  }
}

/**
 * PUT /api/v1/user/settings
 * Update user settings
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  let updateData: {
    timezone?: string;
    date_format?: string;
    number_format?: string;
    locale?: string;
  } = {};

  try {
    const body = await request.json();
    const { timezone, date_format, number_format, locale } = body;

    // Validate locale if provided
    if (locale && !isValidLocale(locale)) {
      return errorResponse('INVALID_LOCALE', 'Invalid locale code provided', 400);
    }

    // Build update data (only include provided fields)
    if (timezone !== undefined) updateData.timezone = timezone;

    if (date_format !== undefined) updateData.date_format = date_format;
    if (number_format !== undefined) updateData.number_format = number_format;
    if (locale !== undefined) updateData.locale = locale;

    const updatedUser = await prisma.user.update({
      where: { id: user.user_id },
      data: updateData,
      select: {
        timezone: true,

        date_format: true,
        number_format: true,
        locale: true,
      },
    });

    return successResponse(updatedUser);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Prisma not-found error while updating user settings:', {
          code: error.code,
          message: error.message,
          meta: error.meta,
          userId: user.user_id,
          updateData,
        });

        return errorResponse('NOT_FOUND', 'User settings not found', 404);
      }

      console.error('Prisma error while updating user settings:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
        userId: user.user_id,
        updateData,
      });

      return errorResponse(
        'DATABASE_ERROR',
        `Database operation failed: ${error.code}`,
        500
      );
    }

    console.error('Unexpected error while updating user settings:', {
      userId: user.user_id,
      updateData,
      error,
    });

    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to update user settings',
      500
    );
  }
}
