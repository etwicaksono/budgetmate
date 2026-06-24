/**
 * GET   /api/ai/sessions/[id]  — get session detail with messages
 * PATCH /api/ai/sessions/[id]  — rename session title
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';

const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

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
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Failed to fetch AI chat session:', {
          operation: 'findFirst',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('NOT_FOUND', 'AI chat session not found', 404);
      }

      if (error.code === 'P2002') {
        console.error('Failed to fetch AI chat session:', {
          operation: 'findFirst',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('DUPLICATE', 'A session with this title already exists', 409);
      }

      console.error('Prisma error while fetching AI chat session:', {
        operation: 'findFirst',
        entity: 'aiChatSession',
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }

    console.error('Unexpected error while fetching AI chat session:', error);
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
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Failed to rename AI chat session:', {
          operation: 'update',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('NOT_FOUND', 'AI chat session not found', 404);
      }

      if (error.code === 'P2002') {
        console.error('Failed to rename AI chat session:', {
          operation: 'update',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('DUPLICATE', 'A session with this title already exists', 409);
      }

      console.error('Prisma error while renaming AI chat session:', {
        operation: 'update',
        entity: 'aiChatSession',
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }

    console.error('Unexpected error while renaming AI chat session:', error);
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
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Failed to delete AI chat session:', {
          operation: 'delete',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('NOT_FOUND', 'AI chat session not found', 404);
      }

      if (error.code === 'P2002') {
        console.error('Failed to delete AI chat session:', {
          operation: 'delete',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('DUPLICATE', 'A session with this title already exists', 409);
      }

      console.error('Prisma error while deleting AI chat session:', {
        operation: 'delete',
        entity: 'aiChatSession',
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }

    console.error('Unexpected error while deleting AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
