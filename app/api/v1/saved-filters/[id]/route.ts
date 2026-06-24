import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';
import { UpdateSavedFilterSchema as updateSavedFilterSchema } from '@/lib/openapi/schemas/savedFilters';

interface RouteParams {
   params?: { id?: string };
}

export async function PUT(request: NextRequest, context: RouteParams) {
   const authResult = await requireAuth(request);
   if ('error' in authResult) return authResult.error;

   const { user } = authResult;
   const filterId = resolveRouteParam(request, context.params);

   if (!filterId) {
      return errorResponse('VALIDATION_ERROR', 'Filter ID is required in the path', 400);
   }

   try {
      const body = await request.json();
      const validation = updateSavedFilterSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse('VALIDATION_ERROR', 'Invalid input', 400, validation.error.errors);
      }

      const existing = await prisma.savedFilter.findFirst({
         where: { id: filterId, user_id: user.user_id },
      });

      if (!existing) {
         return errorResponse('NOT_FOUND', 'Saved filter not found', 404);
      }

      const { name, context, filters } = validation.data;

      const updated = await prisma.savedFilter.update({
         where: { id: filterId },
         data: {
            ...(name !== undefined && { name: name.trim() }),
            ...(context !== undefined && { context }),
            ...(filters !== undefined && { filters }),
         },
      });

      return successResponse(updated);
   } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
         return errorResponse('DUPLICATE_NAME', 'A filter with this name already exists', 409);
      }
      console.error('Error updating saved filter:', error);
      return errorResponse('UPDATE_ERROR', 'Failed to update saved filter', 500);
   }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
   const authResult = await requireAuth(request);
   if ('error' in authResult) return authResult.error;

   const { user } = authResult;
   const filterId = resolveRouteParam(request, context.params);

   if (!filterId) {
      return errorResponse('VALIDATION_ERROR', 'Filter ID is required in the path', 400);
   }

   try {
      const existing = await prisma.savedFilter.findFirst({
         where: { id: filterId, user_id: user.user_id },
      });

      if (!existing) {
         return errorResponse('NOT_FOUND', 'Saved filter not found', 404);
      }

      await prisma.savedFilter.delete({ where: { id: filterId } });

      return successResponse(null);
   } catch (error) {
      console.error('Error deleting saved filter:', error);
      return errorResponse('DELETE_ERROR', 'Failed to delete saved filter', 500);
   }
}
