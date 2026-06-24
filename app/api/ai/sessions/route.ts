/**
 * GET  /api/ai/sessions  — list all sessions for the authenticated user
 * POST /api/ai/sessions  — create a new session with a context snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import type { ContextSnapshot } from '@/lib/ai/types';

const PrismaClientKnownRequestError = Prisma.PrismaClientKnownRequestError;

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
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Failed to fetch AI chat sessions:', {
          operation: 'findMany',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('NOT_FOUND', 'AI chat sessions not found', 404);
      }

      if (error.code === 'P2002') {
        console.error('Failed to fetch AI chat sessions:', {
          operation: 'findMany',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('DUPLICATE', 'An AI chat session already exists for the requested unique value', 409);
      }

      console.error('Prisma error while fetching AI chat sessions:', {
        operation: 'findMany',
        entity: 'aiChatSession',
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }

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
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        console.error('Failed to create AI chat session:', {
          operation: 'create',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('NOT_FOUND', 'AI chat session could not be created because a related record was not found', 404);
      }

      if (error.code === 'P2002') {
        console.error('Failed to create AI chat session:', {
          operation: 'create',
          entity: 'aiChatSession',
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        return errorResponse('DUPLICATE', 'An AI chat session with the same unique value already exists', 409);
      }

      console.error('Prisma error while creating AI chat session:', {
        operation: 'create',
        entity: 'aiChatSession',
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }

    console.error('Unexpected error while creating AI chat session:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }
}
