import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/groups/:id - Get group detail with accounts
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

    const { id: groupId } = await params;

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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// PUT /api/v1/groups/:id - Update group
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

    const { id: groupId } = await params;
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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// DELETE /api/v1/groups/:id - Delete group
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

    const { id: groupId } = await params;

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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
