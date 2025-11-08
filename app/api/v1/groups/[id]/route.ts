import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validatePathParams, handleValidationError } from '@/lib/validation';

const PathParamsSchema = z.object({ id: z.string().uuid() });

// GET /api/v1/groups/:id - Get group detail with accounts
/**
 * @summary Retrieve a group with its accounts.
 * @description Authenticates the user, ensures ownership, and returns the group plus a list of account stubs ordered by `personal_id`.
 * @tag Groups
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Group retrieved successfully with account summaries.
 * @response 401 - Authentication failed.
 * @response 404 - Group not found.
 * @response 500 - Server error while fetching the group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: groupId } = validatePathParams(await params, PathParamsSchema);

    // Get group with accounts
    const group = await db.groups.findFirst({
      where: {
        id: groupId,
        user_id: user.user_id,
      },
      include: {
        accounts: {
          select: {
            id: true,
            name: true,
            icon: true,
            active: true,
          },
          orderBy: {
            personal_id: 'asc',
          },
        },
      },
    });

    if (!group) {
      return jsonResponse(
        ApiResponseBuilder.error('Group not found'),
        404
      );
    }

    return jsonResponse(
      ApiResponseBuilder.success('Group retrieved successfully', {
        id: group.id,
        user_id: group.user_id,
        personal_id: Number(group.personal_id),
        name: group.name,
        account_count: group.accounts.length,
        accounts: group.accounts.map(account => ({
          id: account.id,
          name: account.name,
          icon: account.icon,
          active: account.active,
        })),
        created_at: group.created_at.toISOString(),
        updated_at: group.updated_at?.toISOString() || group.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Get group error:', error);
    return handleValidationError(error);
  }
}

// PUT /api/v1/groups/:id - Update group
/**
 * @summary Update group metadata.
 * @description Verifies ownership, enforces non-empty names, and persists the trimmed name update while returning the latest account count.
 * @tag Groups
 * @security bearerAuth
 * @bodyContent {Object} { name?: string }
 * @param request Authenticated Next.js request with the update body.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Group updated successfully.
 * @response 400 - Name provided but empty after trimming.
 * @response 401 - Authentication failed.
 * @response 404 - Group not found.
 * @response 500 - Server error while updating the group.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: groupId } = validatePathParams(await params, PathParamsSchema);
    const body = await request.json();

    // Verify group exists and belongs to user
    const existingGroup = await db.groups.findFirst({
      where: {
        id: groupId,
        user_id: user.user_id,
      },
    });

    if (!existingGroup) {
      return jsonResponse(
        ApiResponseBuilder.error('Group not found'),
        404
      );
    }

    // Validate name if being changed
    if (body.name !== undefined && body.name.trim().length === 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Name cannot be empty'),
        400
      );
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();

    // Update group
    const group = await db.groups.update({
      where: { id: groupId },
      data: updateData,
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Group updated successfully', {
        id: group.id,
        user_id: group.user_id,
        personal_id: Number(group.personal_id),
        name: group.name,
        account_count: group._count.accounts,
        created_at: group.created_at.toISOString(),
        updated_at: group.updated_at?.toISOString() || group.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Update group error:', error);
    return handleValidationError(error);
  }
}

// DELETE /api/v1/groups/:id - Delete group
/**
 * @summary Delete a group.
 * @description Authenticates the user, ensures the group has no linked accounts, and removes it from the catalog.
 * @tag Groups
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Group deleted successfully.
 * @response 400 - Group still contains accounts.
 * @response 401 - Authentication failed.
 * @response 404 - Group not found.
 * @response 500 - Server error while deleting the group.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: groupId } = validatePathParams(await params, PathParamsSchema);

    // Verify group exists and belongs to user
    const existingGroup = await db.groups.findFirst({
      where: {
        id: groupId,
        user_id: user.user_id,
      },
      include: {
        _count: {
          select: { accounts: true },
        },
      },
    });

    if (!existingGroup) {
      return jsonResponse(
        ApiResponseBuilder.error('Group not found'),
        404
      );
    }

    // Check if group has accounts
    if (existingGroup._count.accounts > 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete group with accounts. Remove or reassign accounts first.'),
        400
      );
    }

    // Delete group
    await db.groups.delete({
      where: { id: groupId },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Group deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete group error:', error);
    return handleValidationError(error);
  }
}
