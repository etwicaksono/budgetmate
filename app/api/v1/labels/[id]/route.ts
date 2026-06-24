import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';


import { UpdateLabelSchema as updateLabelSchema } from '@/lib/openapi/schemas/labels';

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

    return successResponse(label);
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

    return successResponse(label);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return errorResponse('NOT_FOUND', 'Label not found', 404);
      }
      if (error.code === 'P2003') {
        return errorResponse('CONFLICT', 'Cannot update label: it is referenced by other records', 409);
      }
      if (error.code === 'P2002') {
        return errorResponse('DUPLICATE', 'Duplicate entry', 409);
      }
      console.error('Prisma error in label update:', { code: error.code, message: error.message, meta: error.meta, labelId, userId: user.user_id });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }
    console.error('Error updating label:', { labelId, userId: user.user_id, error });
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return errorResponse('NOT_FOUND', 'Label not found', 404);
      }
      if (error.code === 'P2003') {
        return errorResponse('CONFLICT', 'Cannot delete label: it is referenced by other records', 409);
      }
      if (error.code === 'P2002') {
        return errorResponse('DUPLICATE', 'Duplicate entry', 409);
      }
      console.error('Prisma error in label delete:', { code: error.code, message: error.message, meta: error.meta, labelId, userId: user.user_id });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }
    console.error('Error deleting label:', { labelId, userId: user.user_id, error });
    return errorResponse('DELETE_ERROR', 'Failed to delete label', 500);
  }
}
