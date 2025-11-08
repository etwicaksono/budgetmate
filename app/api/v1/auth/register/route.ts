import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import defaultCategories from '../../../../../data/default_categories.json';
import defaultAccounts from '../../../../../data/default_accounts.json';

/**
 * @summary Register a new user account.
 * @description Validates `email`, `username`, and `password`, ensures uniqueness, creates the user record, seeds default categories/accounts, and returns the initial access and refresh tokens with profile metadata.
 * @tag Auth
 * @bodyContent {Object} { email: string, username: string, password: string }
 * @param request Next.js request containing the registration payload.
 * @response 201 - User created and tokens issued.
 * @response 400 - Input validation failed (email format, username rules, password length).
 * @response 409 - Email or username already exists.
 * @response 500 - Internal server error while creating the account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return jsonResponse(
        ApiResponseBuilder.error('Email, username, and password are required'),
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid email format'),
        400
      );
    }

    // Validate username (alphanumeric, underscore, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return jsonResponse(
        ApiResponseBuilder.error('Username must be 3-20 characters (alphanumeric and underscore only)'),
        400
      );
    }

    // Validate password length
    if (password.length < 6) {
      return jsonResponse(
        ApiResponseBuilder.error('Password must be at least 6 characters'),
        400
      );
    }

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
          ApiResponseBuilder.error('Email already registered'),
          409
        );
      }
      if (existingUser.username === username) {
        return jsonResponse(
          ApiResponseBuilder.error('Username already taken'),
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

    // Return response
    return jsonResponse(
      ApiResponseBuilder.success('User registered successfully', {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at?.toISOString() || user.created_at.toISOString(),
        }
      }),
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
