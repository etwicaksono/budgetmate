import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, validateQuery, handleValidationError } from '@/lib/validation';
import { CreateCategoryRequestSchema, CategorySchema, CategoryFiltersSchema } from '@/schemas/categories/category.schema';

// GET /api/v1/categories - List categories
/**
 * @summary List the user's categories.
 * @description Requires bearer auth, supports `keyword`, `limit`, and `offset` filters, and returns flat category records plus pagination/meta information for client-side caching.
 * @tag Categories
 * @security bearerAuth
 * @param request Authenticated Next.js request with optional query params.
 * @response 200 - Categories retrieved successfully with pagination metadata.
 * @response 401 - Authentication failed.
 * @response 500 - Server error fetching categories.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate query parameters
    const { keyword, limit, offset } = validateQuery(request, CategoryFiltersSchema);

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

    const formattedCategories = categories.map((cat) => {
      const data = {
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
      };
      return CategorySchema.parse(data);
    });

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
    return handleValidationError(error);
  }
}

// POST /api/v1/categories - Create new category
/**
 * @summary Create a new category.
 * @description Authenticates the user, validates `personal_id`, `name`, and `icon`, optionally links to a parent, and inserts the record while ensuring personal ids remain unique.
 * @tag Categories
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, name: string, icon: string, color?: string, nature?: string, parent_id?: string, is_active?: boolean }
 * @param request Authenticated Next.js request containing the category payload.
 * @response 201 - Category created successfully.
 * @response 400 - Required fields missing or invalid parent assignment.
 * @response 401 - Authentication failed.
 * @response 404 - Parent category not found.
 * @response 409 - `personal_id` already in use.
 * @response 500 - Server error while creating the category.
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
    const body = await validateBody(request, CreateCategoryRequestSchema);
    const {
      personal_id,
      name,
      icon,
      color,
      nature,
      parent_id,
      is_active,
    } = body;

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

    const responseData = {
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
    };

    const validatedData = CategorySchema.parse(responseData);

    return jsonResponse(
      ApiResponseBuilder.success('Category created successfully', validatedData),
      201
    );
  } catch (error) {
    console.error('Create category error:', error);
    return handleValidationError(error);
  }
}
