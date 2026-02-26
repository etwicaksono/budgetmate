import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';

// Define the expected schema based on frontend mapping:
// { id: string, order: number }
const SwapOrderSchema = z.object({
  order_map: z.array(
    z.object({
      id: z.string().min(1),
      order: z.number().int().min(0),
    })
  ).min(1, 'Order map cannot be empty'),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = SwapOrderSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const { order_map } = validation.data;

    // Use a Prisma transaction to execute all updates
    await prisma.$transaction(async (tx) => {
      for (const item of order_map) {
        // Only update the account if it belongs to the authenticated user
        await tx.account.updateMany({
          where: {
            id: item.id,
            user_id: user.user_id,
          },
          data: {
            order: item.order,
          },
        });
      }
    });

    return successResponse(null, { message: 'Account order updated successfully' });

  } catch (error) {
    console.error('Account swap order error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update account order', 500);
  }
}
