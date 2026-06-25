import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';


import { CreateLabelSchema as createLabelSchema } from '@/lib/openapi/schemas/labels';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const labels = await prisma.label.findMany({
      where: {
        user_id: user.user_id,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return successResponse(labels);
  } catch (error) {
    logError('Error fetching labels:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch labels', 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = createLabelSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid input', 400, validation.error.errors);
    }

    const { name, color } = validation.data;

    const label = await prisma.label.create({
      data: {
        user_id: user.user_id,
        name: name.trim(),
        color,
      },
    });

    return successResponse(
      label,
      undefined,
      201
    );
  } catch (error) {
    logError('Error creating label:', error);
    return errorResponse('CREATE_ERROR', 'Failed to create label', 500);
  }
}
