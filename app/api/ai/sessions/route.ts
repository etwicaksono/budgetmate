/**
 * GET  /api/ai/sessions  — list all sessions for the authenticated user
 * POST /api/ai/sessions  — create a new session with a context snapshot
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import type { ContextSnapshot } from '@/lib/ai/types';


export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  try {
    const sessions = await prisma.aiChatSession.findMany({
      where: { user_id: auth.user.user_id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        context_snapshot: true,
        created_at: true,
        updated_at: true,
        _count: { select: { messages: true } },
      },
      take: 50,
    });

    return successResponse(sessions);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'fetch');
    if (prismaError) return prismaError;

    console.error('Unexpected error while fetching AI chat sessions:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  let body: { context_snapshot: ContextSnapshot };
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_BODY', 'Request body must be JSON', 400);
  }

  if (!body.context_snapshot) {
    return errorResponse('MISSING_FIELD', 'context_snapshot is required', 400);
  }

  try {
    const session = await prisma.aiChatSession.create({
      data: {
        user_id: auth.user.user_id,
        context_snapshot: body.context_snapshot as object,
      },
      select: {
        id: true,
        title: true,
        context_snapshot: true,
        created_at: true,
      },
    });

    return successResponse(session, undefined, 201);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'create');
    if (prismaError) return prismaError;

    console.error('Unexpected error while creating AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
