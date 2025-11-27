import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';
import { z } from 'zod';

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

interface RouteParams {
  params?: { id?: string };
}

export async function GET(request: NextRequest, context: RouteParams) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const labelId = resolveRouteParam(request, context.params);
  
  if (!labelId) {
    return errorResponse('VALIDATION_ERROR', 'Label ID is required in the path', 400);
  }

  try {
    const label = await prisma.label.findFirst({
      where: {
        id: labelId,
        user_id: user.user_id,
      },
    });

    if (!label) {
      return errorResponse('NOT_FOUND', 'Label not found', 404);
    }

    return successResponse({
      ...label,
      personal_id: Number(label.personal_id),
    });
  } catch (error) {
    console.error('Error fetching label:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch label', 500);
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const labelId = resolveRouteParam(request, context.params);
  
  if (!labelId) {
    return errorResponse('VALIDATION_ERROR', 'Label ID is required in the path', 400);
  }

  try {
    const body = await request.json();
    const validation = updateLabelSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid input', 400, validation.error.errors);
    }

    const { name, color } = validation.data;

    // Check if label exists and belongs to user
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        user_id: user.user_id,
      },
    });

    if (!existingLabel) {
      return errorResponse('NOT_FOUND', 'Label not found', 404);
    }

    const label = await prisma.label.update({
      where: { id: labelId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });

    return successResponse({
      ...label,
      personal_id: Number(label.personal_id),
    });
  } catch (error) {
    console.error('Error updating label:', error);
    return errorResponse('UPDATE_ERROR', 'Failed to update label', 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const labelId = resolveRouteParam(request, context.params);
  
  if (!labelId) {
    return errorResponse('VALIDATION_ERROR', 'Label ID is required in the path', 400);
  }

  try {
    // Check if label exists and belongs to user
    const existingLabel = await prisma.label.findFirst({
      where: {
        id: labelId,
        user_id: user.user_id,
      },
    });

    if (!existingLabel) {
      return errorResponse('NOT_FOUND', 'Label not found', 404);
    }

    // Check if label is used in any transactions
    const usageCount = await prisma.transactionLabel.count({
      where: {
        label_id: labelId,
      },
    });

    if (usageCount > 0) {
      return errorResponse(
        'IN_USE',
        `Cannot delete label. It is used in ${usageCount} transaction(s).`,
        400
      );
    }

    await prisma.label.delete({
      where: { id: labelId },
    });

    return successResponse(null);
  } catch (error) {
    console.error('Error deleting label:', error);
    return errorResponse('DELETE_ERROR', 'Failed to delete label', 500);
  }
}
