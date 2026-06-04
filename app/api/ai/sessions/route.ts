/**
 * GET  /api/ai/sessions  — list all sessions for the authenticated user
 * POST /api/ai/sessions  — create a new session with a context snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { errorResponse } from '@/lib/api/response';
import type { ContextSnapshot } from '@/lib/ai/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

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

  return NextResponse.json({ data: sessions });
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

  return NextResponse.json({ data: session }, { status: 201 });
}
