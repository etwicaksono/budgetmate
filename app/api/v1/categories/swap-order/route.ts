import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { SwapCategoryOrderRequestSchema } from '@/schemas/categories/category.schema';

// PUT /api/v1/categories/swap-order - Reorder categories
/**
 * @summary Reorder category personal ids.
 * @description Accepts an authenticated request with an `order_map` array, validates each id belongs to the user, and performs a two-phase update to avoid unique constraint conflicts.
 * @tag Categories
 * @security bearerAuth
 * @bodyContent {Object} { order_map: Array<{ id: string, personal_id: number }> }
 * @param request Authenticated Next.js request describing the new ordering.
 * @response 200 - Categories reordered successfully.
 * @response 400 - Invalid or empty `order_map`.
 * @response 401 - Authentication failed.
 * @response 404 - One or more categories do not belong to the user.
 * @response 500 - Server error while reordering categories.
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate request body
    const body = await validateBody(request, SwapCategoryOrderRequestSchema);
    const { order_map } = body;

    // Verify all categories belong to user
    const categoryIds = order_map.map((item: any) => item.id);
    const categories = await db.categories.findMany({
      where: {
        id: { in: categoryIds },
        user_id: user.user_id,
      },
    });

    if (categories.length !== categoryIds.length) {
      return jsonResponse(
        ApiResponseBuilder.error('One or more categories not found or do not belong to you'),
        404
      );
    }

    // Two-phase update to avoid unique constraint violations
    // Phase 1: Set all to temporary negative values
    // Phase 2: Set to final positive values
    await db.$transaction(async (tx) => {
      // Phase 1: Temporary negative values
      for (let i = 0; i < order_map.length; i++) {
        const item = order_map[i];
        await tx.categories.updateMany({
          where: {
            id: item.id,
            user_id: user.user_id,
          },
          data: {
            personal_id: BigInt(-(i + 1)),
            updated_at: new Date(),
          },
        });
      }

      // Phase 2: Final positive values
      for (const item of order_map) {
        await tx.categories.updateMany({
          where: {
            id: item.id,
            user_id: user.user_id,
          },
          data: {
            personal_id: BigInt(item.personal_id),
            updated_at: new Date(),
          },
        });
      }
    });

    return jsonResponse(
      ApiResponseBuilder.success('Categories reordered successfully', {
        updated_count: order_map.length,
      }),
      200
    );
  } catch (error) {
    console.error('Swap order error:', error);
    return handleValidationError(error);
  }
}
