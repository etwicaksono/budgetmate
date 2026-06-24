import { NextRequest } from 'next/server';
import { SavedFilterContext } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateSavedFilterSchema as createSavedFilterSchema } from '@/lib/openapi/schemas/savedFilters';

export async function GET(request: NextRequest) {
   const authResult = await requireAuth(request);
   if ('error' in authResult) return authResult.error;

   const { user } = authResult;
   const { searchParams } = new URL(request.url);
   const context = searchParams.get('context') ?? undefined;

   try {
      const savedFilters = await prisma.savedFilter.findMany({
         where: {
            user_id: user.user_id,
            ...(context ? { context: context as SavedFilterContext } : {}),
         },
         orderBy: [
            { sort_order: 'asc' },
            { created_at: 'asc' }
         ],
      });

      return successResponse(savedFilters);
   } catch (error) {
      console.error('Error fetching saved filters:', error);
      return errorResponse('FETCH_ERROR', 'Failed to fetch saved filters', 500);
   }
}

export async function POST(request: NextRequest) {
   const authResult = await requireAuth(request);
   if ('error' in authResult) return authResult.error;

   const { user } = authResult;

   try {
      const body = await request.json();
      const validation = createSavedFilterSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse('VALIDATION_ERROR', 'Invalid input', 400, validation.error.errors);
      }

      const { name, context, filters } = validation.data;

      const savedFilter = await prisma.savedFilter.create({
         data: {
            user_id: user.user_id,
            name: name.trim(),
            context: context as SavedFilterContext,
            filters,
         },
      });

      return successResponse(savedFilter, undefined, 201);
   } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
         return errorResponse('DUPLICATE_NAME', 'A filter with this name already exists', 409);
      }
      console.error('Error creating saved filter:', error);
      return errorResponse('CREATE_ERROR', 'Failed to create saved filter', 500);
   }
}
