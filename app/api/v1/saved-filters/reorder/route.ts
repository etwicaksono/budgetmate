import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { ReorderSavedFiltersSchema as reorderSavedFiltersSchema } from '@/lib/openapi/schemas/savedFilters';

export async function PUT(request: NextRequest) {
   const authResult = await requireAuth(request);
   if ('error' in authResult) return authResult.error;

   const { user } = authResult;

   try {
      const body = await request.json();
      const validation = reorderSavedFiltersSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse('VALIDATION_ERROR', 'Invalid input array of filterIds expected', 400, validation.error.errors);
      }

      const { filterIds } = validation.data;

      // Use a transaction to update the sort_order of each provided filter ID.
      // We strictly filter by user_id to ensure a user only modifies their own filters.
      await prisma.$transaction(
         filterIds.map((id, index) =>
            prisma.savedFilter.updateMany({
               where: {
                  id,
                  user_id: user.user_id,
               },
               data: {
                  sort_order: index,
               },
            })
         )
      );

      return successResponse({ message: 'Saved filters reordered successfully.' });
   } catch (error) {
      console.error('Error reordering saved filters:', error);
      return errorResponse('UPDATE_ERROR', 'Failed to update sorted order', 500);
   }
}
