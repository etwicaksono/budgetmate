import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  
  try {
    // Fetch max personal IDs for all tables
    const [
      maxTransaction,
      maxAccount,
      maxCategory,
      maxLabel,
      maxTransfer,
      maxGroup
    ] = await Promise.all([
      prisma.transaction.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.account.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.category.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.label.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.transfer.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'desc' },
        select: { personal_id: true }
      }),
      prisma.accountGroup.findFirst({
        where: { user_id: user.user_id },
        orderBy: { position: 'desc' },
        select: { position: true }
      })
    ]);
    
    const maxPersonalIds = {
      transactions: Number(maxTransaction?.personal_id ?? 0n),
      accounts: Number(maxAccount?.personal_id ?? 0n),
      categories: Number(maxCategory?.personal_id ?? 0n),
      labels: Number(maxLabel?.personal_id ?? 0n),
      transfers: Number(maxTransfer?.personal_id ?? 0n),
      groups: maxGroup?.position ?? 0,
      // Provide next available IDs for convenience
      next: {
        transactions: Number(maxTransaction?.personal_id ?? 0n) + 1,
        accounts: Number(maxAccount?.personal_id ?? 0n) + 1,
        categories: Number(maxCategory?.personal_id ?? 0n) + 1,
        labels: Number(maxLabel?.personal_id ?? 0n) + 1,
        transfers: Number(maxTransfer?.personal_id ?? 0n) + 1,
        groups: (maxGroup?.position ?? 0) + 1
      }
    };
    
    return successResponse(maxPersonalIds);
    
  } catch (error) {
    console.error('Personal IDs fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch personal IDs', 500);
  }
}
