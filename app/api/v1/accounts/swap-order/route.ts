import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// PUT /api/v1/accounts/swap-order - Reorder accounts
/**
 * @summary Reorder account personal ids.
 * @description Accepts an authenticated request containing an `order_map` array of `{ id, personal_id }`, validates ownership, and performs a two-phase update so unique constraints are not violated.
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {Object} { order_map: Array<{ id: string, personal_id: number }> }
 * @param request Authenticated Next.js request describing the new ordering.
 * @response 200 - Accounts reordered successfully.
 * @response 400 - Invalid or incomplete `order_map` payload.
 * @response 401 - Authentication failed.
 * @response 404 - One or more accounts do not belong to the user.
 * @response 500 - Server error while swapping order.
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    const body = await request.json();
    const { order_map } = body;

    // Validate order_map
    if (!Array.isArray(order_map) || order_map.length === 0) {
      return jsonResponse(
        ApiResponseBuilder.error('order_map must be a non-empty array'),
        400
      );
    }

    // Validate each item has id and personal_id
    for (const item of order_map) {
      if (!item.id || item.personal_id === undefined) {
        return jsonResponse(
          ApiResponseBuilder.error('Each item must have id and personal_id'),
          400
        );
      }
    }

    // Verify all accounts belong to user
    const accountIds = order_map.map((item: any) => item.id);
    const accounts = await db.accounts.findMany({
      where: {
        id: { in: accountIds },
        user_id: user.user_id,
      },
    });

    if (accounts.length !== accountIds.length) {
      return jsonResponse(
        ApiResponseBuilder.error('One or more accounts not found or do not belong to you'),
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
        await tx.accounts.updateMany({
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
        await tx.accounts.updateMany({
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
      ApiResponseBuilder.success('Accounts reordered successfully', {
        updated_count: order_map.length,
      }),
      200
    );
  } catch (error) {
    console.error('Swap order error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
