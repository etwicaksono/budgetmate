import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/categories/:id - Get category detail
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

    const { id: categoryId } = await params;

    // Get category
    const category = await db.categories.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return jsonResponse(
        ApiResponseBuilder.error('Category not found'),
        404
      );
    }

    return jsonResponse(
      ApiResponseBuilder.success('Category retrieved successfully', {
        id: category.id,
        user_id: category.user_id,
        personal_id: Number(category.personal_id),
        parent_id: category.parent_id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        nature: category.nature,
        is_active: category.is_active,
        position: category.position,
        created_at: category.created_at.toISOString(),
        updated_at: category.updated_at?.toISOString() || category.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Get category error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// PUT /api/v1/categories/:id - Update category
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

    const { id: categoryId } = await params;
    const body = await request.json();

    // Check if category exists and belongs to user
    const existingCategory = await db.categories.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!existingCategory) {
      return jsonResponse(
        ApiResponseBuilder.error('Category not found'),
        404
      );
    }

    // If parent_id is being changed, verify new parent exists
    if (body.parent_id !== undefined && body.parent_id !== null) {
      // Prevent circular reference (category cannot be its own parent)
      if (body.parent_id === categoryId) {
        return jsonResponse(
          ApiResponseBuilder.error('Category cannot be its own parent'),
          400
        );
      }

      const parentCategory = await db.categories.findFirst({
        where: {
          id: body.parent_id,
          user_id: user.user_id,
        },
      });

      if (!parentCategory) {
        return jsonResponse(
          ApiResponseBuilder.error('Parent category not found'),
          404
        );
      }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.nature !== undefined) updateData.nature = body.nature;
    if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Update category
    const category = await db.categories.update({
      where: { id: categoryId },
      data: updateData,
    });

    return jsonResponse(
      ApiResponseBuilder.success('Category updated successfully', {
        id: category.id,
        user_id: category.user_id,
        personal_id: Number(category.personal_id),
        parent_id: category.parent_id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        nature: category.nature,
        is_active: category.is_active,
        position: category.position,
        created_at: category.created_at.toISOString(),
        updated_at: category.updated_at?.toISOString() || category.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Update category error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// DELETE /api/v1/categories/:id - Delete category
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

    const { id: categoryId } = await params;

    // Check if category exists and belongs to user
    const category = await db.categories.findFirst({
      where: {
        id: categoryId,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return jsonResponse(
        ApiResponseBuilder.error('Category not found'),
        404
      );
    }

    // Check if category has child categories
    const childCount = await db.categories.count({
      where: { parent_id: categoryId },
    });

    if (childCount > 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete category with child categories'),
        400
      );
    }

    // Check if category has transactions
    const transactionCount = await db.transactions.count({
      where: { category_id: categoryId },
    });

    if (transactionCount > 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete category with existing transactions'),
        400
      );
    }

    // Delete category
    await db.categories.delete({
      where: { id: categoryId },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Category deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete category error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
