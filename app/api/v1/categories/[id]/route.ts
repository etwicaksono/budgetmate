import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, commonErrors } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';
import { UpdateCategorySchema } from '@/lib/validation/category';

interface RouteParams {
  params?: {
    id?: string;
  };
}

// GET - Fetch single category
export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params);
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required in the path', 400);
  }
  
  const id = categoryId;
  
  try {
    const category = await prisma.category.findFirst({
      where: {
        id,
        user_id: user.user_id
      },
      include: {
        parent: {
          select: { id: true, name: true, icon: true, color: true }
        },
        children: {
          where: { is_active: true },
          select: { 
            id: true, 
            personal_id: true,
            name: true, 
            icon: true, 
            color: true,
            nature: true,
            is_active: true
          },
          orderBy: { personal_id: 'asc' }
        },
        _count: {
          select: {
            transactions: {
              where: { deleted_at: null }
            },
            children: true
          }
        }
      }
    });
    
    if (!category) {
      return commonErrors.notFound('Category');
    }
    
    const response = {
      id: category.id,
      personal_id: Number(category.personal_id),
      name: category.name,
      type: category.type,
      nature: category.nature,
      icon: category.icon,
      color: category.color,
      is_system: category.is_system,
      is_active: category.is_active,
      parent_id: category.parent_id,
      parent: category.parent,
      children: category.children.map(child => ({
        ...child,
        personal_id: Number(child.personal_id)
      })),
      transaction_count: category._count.transactions,
      children_count: category._count.children,
      created_at: category.created_at,
      updated_at: category.updated_at
    };
    
    return successResponse(response);
    
  } catch (error) {
    console.error('Category fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch category', 500);
  }
}

// PUT/PATCH - Update category
export async function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params);
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required in the path', 400);
  }
  
  const id = categoryId;
  
  try {
    const body = await request.json();
    const validation = UpdateCategorySchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }
    
    const data = validation.data;
    
    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        user_id: user.user_id
      }
    });
    
    if (!existingCategory) {
      return commonErrors.notFound('Category');
    }
    
    // Note: Users can edit their own categories
    // System categories are created during registration with created_by: null
    // User-created categories always have created_by set, so they can be edited
    
    // If changing parent_id, validate new parent
    if (data.parent_id !== undefined) {
      // Cannot set parent to itself
      if (data.parent_id === id) {
        return errorResponse(
          'INVALID_PARENT',
          'Category cannot be its own parent',
          400
        );
      }
      
      if (data.parent_id) {
        const parent = await prisma.category.findFirst({
          where: {
            id: data.parent_id,
            user_id: user.user_id
          }
        });
        
        if (!parent) {
          return errorResponse('INVALID_PARENT', 'Parent category not found', 404);
        }
        
        // Verify parent type matches
        if (parent.type !== existingCategory.type) {
          return errorResponse(
            'TYPE_MISMATCH',
            `Parent category type '${parent.type}' does not match category type '${existingCategory.type}'`,
            400
          );
        }
        
        // Check for circular reference
        const isDescendant = await checkIfDescendant(id, data.parent_id, user.user_id);
        if (isDescendant) {
          return errorResponse(
            'CIRCULAR_REFERENCE',
            'Cannot set parent to a descendant category',
            400
          );
        }
      }
    }
    
    // Update category
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: user.user_id
    };
    
    if (data.name !== undefined) updateData['name'] = data.name;
    if (data.parent_id !== undefined) updateData['parent_id'] = data.parent_id;
    if (data.nature !== undefined) updateData['nature'] = data.nature;
    if (data.icon !== undefined) updateData['icon'] = data.icon;
    if (data.color !== undefined) updateData['color'] = data.color;
    if (data.is_active !== undefined) updateData['is_active'] = data.is_active;
    
    const updated = await prisma.category.update({
      where: {
        id,
        user_id: user.user_id
      },
      data: updateData,
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });
    
    // If color was changed and category has children, update children's colors too
    if (data.color !== undefined && existingCategory.parent_id === null) {
      await prisma.category.updateMany({
        where: {
          parent_id: id,
          user_id: user.user_id
        },
        data: {
          color: data.color,
          updated_at: new Date(),
          updated_by: user.user_id
        }
      });
    }
    
    const response = {
      id: updated.id,
      personal_id: Number(updated.personal_id),
      name: updated.name,
      type: updated.type,
      nature: updated.nature,
      icon: updated.icon,
      color: updated.color,
      is_system: updated.is_system,
      is_active: updated.is_active,
      parent_id: updated.parent_id,
      parent: updated.parent,
      updated_at: updated.updated_at
    };
    
    return successResponse(response, { message: 'Category updated successfully' });
    
  } catch (error) {
    console.error('Category update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
    console.error('Error details:', errorMessage);
    return errorResponse('INTERNAL_ERROR', errorMessage, 500);
  }
}

// PATCH - Alias for PUT
export async function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return PUT(request, context);
}

// DELETE - Delete category (only non-system categories)
export async function DELETE(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }
  
  const { user } = authResult;
  const categoryId = resolveRouteParam(request, context.params);
  if (!categoryId) {
    return errorResponse('VALIDATION_ERROR', 'Category ID is required in the path', 400);
  }
  
  const id = categoryId;
  
  try {
    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        user_id: user.user_id
      }
    });
    
    if (!existingCategory) {
      return commonErrors.notFound('Category');
    }
    
    // Prevent deletion of system categories (only default seeded categories)
    // Allow deleting of user-created categories even if they have is_system flag
    if (existingCategory.is_system && !existingCategory.created_by) {
      return errorResponse(
        'SYSTEM_CATEGORY',
        'Default system categories cannot be deleted',
        403
      );
    }
    
    // Check if category has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        category_id: id,
        user_id: user.user_id,
        deleted_at: null
      }
    });
    
    if (transactionCount > 0) {
      return errorResponse(
        'CATEGORY_HAS_TRANSACTIONS',
        `Cannot delete category with ${transactionCount} existing transactions`,
        409
      );
    }
    
    // Check if category has children
    const childrenCount = await prisma.category.count({
      where: {
        parent_id: id,
        user_id: user.user_id
      }
    });
    
    if (childrenCount > 0) {
      return errorResponse(
        'CATEGORY_HAS_CHILDREN',
        `Cannot delete category with ${childrenCount} child categories`,
        409
      );
    }
    
    // Delete category
    await prisma.category.delete({
      where: { id }
    });
    
    return successResponse(null, { message: 'Category deleted successfully' });
    
  } catch (error) {
    console.error('Category deletion error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete category', 500);
  }
}

// Helper function to check if a category is a descendant of another
async function checkIfDescendant(
  categoryId: string, 
  potentialDescendantId: string, 
  userId: string
): Promise<boolean> {
  const category = await prisma.category.findFirst({
    where: {
      id: potentialDescendantId,
      user_id: userId
    }
  });
  
  if (!category) return false;
  if (category.parent_id === categoryId) return true;
  if (!category.parent_id) return false;
  
  return checkIfDescendant(categoryId, category.parent_id, userId);
}
