import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { SwapOrderRequestSchema } from '@/schemas/accounts/account.schema';

// PUT /api/v1/accounts/swap-order - Reorder accounts
/**
 * @summary Reorder accounts
 * @description Updates the display order of accounts by modifying personal_id values. Accepts an array mapping account IDs to new personal_id positions. Uses a two-phase transaction to avoid unique constraint violations. Only account owner can reorder.
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {application/json} { order_map: Array<{ id: string, personal_id: number }> }
 * @param request Authenticated request with order mapping
 * @response 200 - Accounts reordered successfully: `{ success: true, message: "Accounts reordered successfully", data: { updated_count: number } }`
 * @response 400 - Validation failure: `{ success: false, message: "order_map must be a non-empty array" }` or `{ success: false, message: "Each item must have id and personal_id" }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 404 - One or more accounts not found: `{ success: false, message: "One or more accounts not found or do not belong to you" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
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
    const body = await validateBody(request, SwapOrderRequestSchema);
    const { order_map } = body;

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
    return handleValidationError(error);
  }
}
