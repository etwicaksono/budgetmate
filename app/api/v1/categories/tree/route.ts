import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

interface CategoryNode {
  id: string;
  user_id: string;
  personal_id: number;
  parent_id: string | null;
  name: string;
  icon: string;
  color: string | null;
  nature: string;
  is_active: boolean;
  position: any;
  created_at: string;
  updated_at: string;
  children: CategoryNode[];
}

// Build tree structure recursively
function buildCategoryTree(
  categories: any[],
  parentId: string | null = null
): CategoryNode[] {
  const children = categories.filter((cat) => cat.parent_id === parentId);

  return children.map((cat) => ({
    id: cat.id,
    user_id: cat.user_id,
    personal_id: Number(cat.personal_id),
    parent_id: cat.parent_id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    nature: cat.nature,
    is_active: cat.is_active,
    position: cat.position,
    created_at: cat.created_at.toISOString(),
    updated_at: cat.updated_at?.toISOString() || cat.created_at.toISOString(),
    children: buildCategoryTree(categories, cat.id),
  }));
}

// GET /api/v1/categories/tree - Get category hierarchy
/**
 * @summary Return the hierarchical category tree.
 * @description Authenticates the user, loads every category ordered by `personal_id`, and returns a nested tree structure so clients can render parent/child relationships.
 * @tag Categories
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @response 200 - Category tree retrieved successfully with node counts.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while building the tree.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Get all categories for the user
    const categories = await db.categories.findMany({
      where: {
        user_id: user.user_id,
      },
      orderBy: {
        personal_id: 'asc',
      },
    });

    // Build tree structure (start with root categories: parent_id = null)
    const tree = buildCategoryTree(categories, null);

    return jsonResponse(
      ApiResponseBuilder.success('Category tree retrieved successfully', tree, {
        total: categories.length,
      }),
      200
    );
  } catch (error) {
    console.error('Get category tree error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
