import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/categories - List categories
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
    const keyword = searchParams.get('keyword') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    // Add keyword search if provided
    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Get categories
    const categories = await db.categories.findMany({
      where,
      orderBy: {
        personal_id: 'asc',
      },
      skip: offset,
      take: limit,
    });

    // Get max personal_id for caching
    const maxPersonalIdResult = await db.categories.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    const formattedCategories = categories.map((cat) => ({
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
    }));

    return jsonResponse(
      ApiResponseBuilder.success('Categories retrieved successfully', formattedCategories, {
        max_personal_id: maxPersonalId,
        total: formattedCategories.length,
        limit,
        offset,
      }),
      200
    );
  } catch (error) {
    console.error('Get categories error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// POST /api/v1/categories - Create new category
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
      icon,
      color,
      nature,
      parent_id,
      is_active,
    } = body;

    // Validate required fields
    if (!personal_id || !name || !icon) {
      return jsonResponse(
        ApiResponseBuilder.error('Missing required fields: personal_id, name, icon'),
        400
      );
    }

    // Check for duplicate personal_id
    const existing = await db.categories.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('A category with this personal_id already exists'),
        409
      );
    }

    // If parent_id provided, verify it exists
    if (parent_id) {
      const parentCategory = await db.categories.findFirst({
        where: {
          id: parent_id,
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

    // Create category
    const category = await db.categories.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
        name,
        icon,
        color: color || null,
        nature: nature || 'NEED',
        parent_id: parent_id || null,
        is_active: is_active !== undefined ? is_active : true,
        position: null as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Category created successfully', {
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
      201
    );
  } catch (error) {
    console.error('Create category error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
