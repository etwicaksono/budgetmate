import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { isValidLocale } from '@/config/locales';

/**
 * GET /api/v1/user/settings
 * Fetch user settings (timezone, currency, locale, etc.)
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
        currency: true,
        date_format: true,
        number_format: true,
        locale: true,
      },
    });

    if (!userSettings) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: userSettings,
    });
  } catch (error) {
    console.error('Failed to fetch user settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTINGS_FETCH_FAILED',
          message: 'Failed to fetch user settings',
        },
      },
      { status: 500 }
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

  try {
    const body = await request.json();
    const { timezone, currency, date_format, number_format, locale } = body;

    // Validate locale if provided
    if (locale && !isValidLocale(locale)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LOCALE',
            message: 'Invalid locale code provided',
          },
        },
        { status: 400 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: {
      timezone?: string;
      currency?: string;
      date_format?: string;
      number_format?: string;
      locale?: string;
    } = {};

    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (date_format !== undefined) updateData.date_format = date_format;
    if (number_format !== undefined) updateData.number_format = number_format;
    if (locale !== undefined) updateData.locale = locale;

    const updatedUser = await prisma.user.update({
      where: { id: user.user_id },
      data: updateData,
      select: {
        timezone: true,
        currency: true,
        date_format: true,
        number_format: true,
        locale: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Failed to update user settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTINGS_UPDATE_FAILED',
          message: 'Failed to update user settings',
        },
      },
      { status: 500 }
    );
  }
}
