/**
 * GET   /api/ai/sessions/[id]  — get session detail with messages
 * PATCH /api/ai/sessions/[id]  — rename session title
 */

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import { logError } from '@/lib/logger';


interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const session = await prisma.aiChatSession.findFirst({
      where: { id, user_id: auth.user.user_id },
      include: {
        messages: {
          orderBy: { created_at: 'asc' },
          select: { id: true, role: true, content: true, created_at: true },
        },
      },
    });

    if (!session) return errorResponse('NOT_FOUND', 'AI chat session not found', 404);

    return successResponse(session);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'find');
    if (prismaError) return prismaError;

    logError('Unexpected error while fetching AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  let body: { title: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_BODY', 'Request body must be JSON', 400);
  }

  if (!body.title?.trim()) {
    return errorResponse('MISSING_FIELD', 'title is required', 400);
  }

  try {
    const existing = await prisma.aiChatSession.findFirst({
      where: { id, user_id: auth.user.user_id },
    });
    if (!existing) return errorResponse('NOT_FOUND', 'AI chat session not found', 404);

    const updated = await prisma.aiChatSession.update({
      where: { id },
      data: { title: body.title.trim() },
      select: { id: true, title: true, updated_at: true },
    });

    return successResponse(updated);
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'update');
    if (prismaError) return prismaError;

    logError('Unexpected error while renaming AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { id } = await params;

  try {
    const existing = await prisma.aiChatSession.findFirst({
      where: { id, user_id: auth.user.user_id },
    });
    if (!existing) return errorResponse('NOT_FOUND', 'AI chat session not found', 404);

    // Delete all messages first to avoid foreign key constraints, then delete the session
    await prisma.aiChatMessage.deleteMany({
      where: { session_id: id },
    });
    
    await prisma.aiChatSession.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'delete');
    if (prismaError) return prismaError;

    logError('Unexpected error while deleting AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
