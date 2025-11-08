import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { RegisterRequestSchema } from '@/schemas/auth/register.schema';
import { LoginResponseSchema } from '@/schemas/auth/login.schema';
import bcrypt from 'bcryptjs';
import defaultCategories from '../../../../../data/default_categories.json';
import defaultAccounts from '../../../../../data/default_accounts.json';
import type { ApiResponse, ApiErrorResponse, LoginResponse } from '@/types/api-responses';

/**
 * @summary Register new user
 * @description Creates a new user account with email, username, and password. Validates email format, username (3-36 alphanumeric/underscore/hyphen), and password (min 8 chars). Automatically seeds default categories and accounts for the new user. Returns access and refresh tokens.
 * @tag Auth
 * @bodyContent {application/json} { email: string, username: string, password: string }
 * @param request Next.js request containing registration data
 * @response 201 - User registered successfully: `{ success: true, message: "User registered successfully", data: { access_token: string, refresh_token: string, user: { id: string, email: string, username: string, created_at: string, updated_at: string } } }`
 * @response 400 - Validation failure from Zod schema
 * @response 409 - Conflict: `{ success: false, message: "Email already registered" }` or `{ success: false, message: "Username already taken" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Validate request body with Zod
    const body = await validateBody(request, RegisterRequestSchema);
    const { email, username, password } = body;

    // Check if user already exists
    const existingUser = await db.users.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return jsonResponse(
          ApiResponseBuilder.error('Email already registered') as ApiErrorResponse,
          409
        );
      }
      if (existingUser.username === username) {
        return jsonResponse(
          ApiResponseBuilder.error('Username already taken') as ApiErrorResponse,
          409
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.users.create({
      data: {
        id: crypto.randomUUID(),
        name: username, // Use username as default name
        email,
        username,
        password: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      }
    });

    // Create default categories and accounts for new user
    try {
      let categoryPersonalId = 1;
      
      // Create categories (parents first, then children)
      for (const parentCategory of defaultCategories) {
        // Create parent category
        const parentCat = await db.categories.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id,
            personal_id: BigInt(categoryPersonalId++),
            name: parentCategory.name,
            icon: parentCategory.icon,
            nature: parentCategory.nature,
            color: parentCategory.color,
            is_active: parentCategory.is_active,
            parent_id: null,
            position: null as any,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Create children categories
        if (parentCategory.children && Array.isArray(parentCategory.children)) {
          for (const childCategory of parentCategory.children) {
            await db.categories.create({
              data: {
                id: crypto.randomUUID(),
                user_id: user.id,
                personal_id: BigInt(categoryPersonalId++),
                name: childCategory.name,
                icon: childCategory.icon,
                nature: childCategory.nature,
                color: childCategory.color,
                is_active: childCategory.is_active,
                parent_id: parentCat.id,
                position: null as any,
                created_at: new Date(),
                updated_at: new Date(),
              },
            });
          }
        }
      }

      // Create default accounts
      for (const account of defaultAccounts) {
        await db.accounts.create({
          data: {
            id: crypto.randomUUID(),
            user_id: user.id,
            personal_id: BigInt(account.personal_id),
            name: account.name,
            icon: account.icon,
            active: account.active,
            usability: account.usability,
            account_type: 'GENERAL',
            color: '#4caf50',
            initial_amount: 0,
            group_id: null,
            position: null as any,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    } catch (setupError) {
      console.error('Error creating default data for new user:', setupError);
      // Continue even if default data creation fails
    }

    // Generate tokens
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Prepare response data
    const responseData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at?.toISOString() || user.created_at.toISOString(),
      }
    };

    // Validate response with Zod
    const validatedResponse = LoginResponseSchema.parse(responseData);

    // Return response
    return jsonResponse(
      ApiResponseBuilder.success('User registered successfully', validatedResponse) as ApiResponse<LoginResponse>,
      201
    );
  } catch (error) {
    // Handle validation errors
    return handleValidationError(error);
  }
}
