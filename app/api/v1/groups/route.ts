import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { CreateGroupRequestSchema } from '@/schemas/groups/group.schema';

// GET /api/v1/groups - List groups
/**
 * @summary List the user's account groups.
 * @description Requires bearer auth, optionally filters by `keyword`, and returns each group with account counts plus the highest `personal_id` for syncing.
 * @tag Groups
 * @security bearerAuth
 * @param request Authenticated Next.js request with optional query params.
 * @response 200 - Groups retrieved successfully with metadata.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while loading groups.
 */
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
    return handleValidationError(error);
  }
}

// POST /api/v1/groups - Create new group
/**
 * @summary Create a new group.
 * @description Validates ownership, ensures `personal_id` uniqueness, trims the name, and persists the group so accounts can be organized.
 * @tag Groups
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, name: string }
 * @param request Authenticated Next.js request with the group payload.
 * @response 201 - Group created successfully.
 * @response 400 - Missing `personal_id` or valid name.
 * @response 401 - Authentication failed.
 * @response 409 - `personal_id` already used in another group.
 * @response 500 - Server error while creating the group.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate request body
    const body = await validateBody(request, CreateGroupRequestSchema);
    const {
      personal_id,
      name,
    } = body;

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
        name,
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
    return handleValidationError(error);
  }
}
