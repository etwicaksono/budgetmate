import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/groups - List groups
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    // Keyword search in name
    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Get groups
    const groups = await db.groups.findMany({
      where,
      orderBy: [
        { personal_id: 'asc' },
      ],
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    // Get max personal_id for caching
    const maxPersonalIdResult = await db.groups.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    const formattedGroups = groups.map((group) => ({
      id: group.id,
      user_id: group.user_id,
      personal_id: Number(group.personal_id),
      name: group.name,
      account_count: group._count.accounts,
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at?.toISOString() || group.created_at.toISOString(),
    }));

    return jsonResponse(
      ApiResponseBuilder.success('Groups retrieved successfully', formattedGroups, {
        max_personal_id: maxPersonalId,
        total: formattedGroups.length,
      }),
      200
    );
  } catch (error) {
    console.error('Get groups error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// POST /api/v1/groups - Create new group
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    const body = await request.json();
    const {
      personal_id,
      name,
    } = body;

    // Validate required fields
    if (!personal_id || !name) {
      return jsonResponse(
        ApiResponseBuilder.error('Missing required fields: personal_id, name'),
        400
      );
    }

    // Validate name is not empty
    if (name.trim().length === 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Name cannot be empty'),
        400
      );
    }

    // Check for duplicate personal_id
    const existing = await db.groups.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('A group with this personal_id already exists'),
        409
      );
    }

    // Create group
    const group = await db.groups.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
        name: name.trim(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Group created successfully', {
        id: group.id,
        user_id: group.user_id,
        personal_id: Number(group.personal_id),
        name: group.name,
        account_count: 0,
        created_at: group.created_at.toISOString(),
        updated_at: group.updated_at?.toISOString() || group.created_at.toISOString(),
      }),
      201
    );
  } catch (error) {
    console.error('Create group error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
