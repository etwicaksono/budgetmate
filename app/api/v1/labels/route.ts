import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { z } from 'zod';

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;

  try {
    const labels = await prisma.label.findMany({
      where: {
        user_id: user.user_id,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Convert BigInt personal_id to Number for JSON serialization
    const serializedLabels = labels.map(label => ({
      ...label,
      personal_id: Number(label.personal_id),
    }));

    return successResponse(serializedLabels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    return errorResponse('FETCH_ERROR', 'Failed to fetch labels', 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = createLabelSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid input', 400, validation.error.errors);
    }

    const { name, color } = validation.data;

    // Get next personal_id
    const maxLabel = await prisma.label.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const nextPersonalId = Number(maxLabel?.personal_id ?? 0n) + 1;

    const label = await prisma.label.create({
      data: {
        user_id: user.user_id,
        personal_id: BigInt(nextPersonalId),
        name: name.trim(),
        color,
      },
    });

    return successResponse(
      {
        ...label,
        personal_id: Number(label.personal_id),
      },
      undefined,
      201
    );
  } catch (error) {
    console.error('Error creating label:', error);
    return errorResponse('CREATE_ERROR', 'Failed to create label', 500);
  }
}
