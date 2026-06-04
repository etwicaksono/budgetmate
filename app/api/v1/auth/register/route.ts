import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { successResponse, errorResponse } from '@/lib/api/response';
import { RegisterSchema } from '@/lib/validation/auth';
import defaultCategories from '@/data/default_categories.json';
import defaultAccounts from '@/data/default_accounts.json';

interface CategoryData {
  name: string;
  icon: string;
  color?: string;
  nature?: string;
}

interface ParentCategoryData {
  name: string;
  icon: string;
  color: string;
  nature: string;
  children: CategoryData[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const { email, username, password, full_name } = validation.data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return errorResponse(
        'WEAK_PASSWORD',
        'Password does not meet requirements',
        400,
        passwordValidation.errors
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return errorResponse(
        'USER_EXISTS',
        `User with this ${field} already exists`,
        409
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user with default data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password_hash,
          full_name: full_name ?? null,
          email_verified: false,
          timezone: 'UTC',
          currency: 'USD'
        }
      });

      // 2. Create default income categories with hierarchy

      for (const incomeCategory of defaultCategories.income) {
        // Create parent income category
        const incomeParent = await tx.category.create({
          data: {
            user_id: user.id,
            name: incomeCategory.name,
            type: 'income',
            analytic_flag: 'income',
            nature: incomeCategory.nature || 'WANT',
            icon: incomeCategory.icon,
            color: incomeCategory.color,
            is_system: true,
            is_active: true
          }
        });

        // Create child income categories
        if (incomeCategory.children) {
          for (const child of incomeCategory.children) {
            await tx.category.create({
              data: {
                user_id: user.id,
                parent_id: incomeParent.id,
                name: child.name,
                type: 'income',
                analytic_flag: 'income',
                nature: child.nature || incomeCategory.nature || 'WANT',
                icon: child.icon,
                color: incomeCategory.color, // Inherit parent color
                is_system: true,
                is_active: true
              }
            });
          }
        }
      }

      // 3. Create default expense categories with hierarchy
      for (const [parentName, parentData] of Object.entries(defaultCategories.expense)) {
        const data = parentData as ParentCategoryData;

        // Create parent category
        const parent = await tx.category.create({
          data: {
            user_id: user.id,
            name: parentName,
            type: 'expense',
            analytic_flag: 'expense',
            nature: data.nature || 'WANT',
            icon: data.icon,
            color: data.color,
            is_system: true,
            is_active: true
          }
        });

        // Create child categories
        if (data.children) {
          for (const child of data.children) {
            await tx.category.create({
              data: {
                user_id: user.id,
                parent_id: parent.id,
                name: child.name,
                type: 'expense',
                analytic_flag: 'expense',
                nature: child.nature || data.nature || 'WANT',
                icon: child.icon,
                color: data.color, // Inherit parent color
                is_system: true,
                is_active: true
              }
            });
          }
        }
      }

      // 4. Create default 'both' type categories (appear in income and expense)
      if (defaultCategories.both) {
        for (const [parentName, parentData] of Object.entries(defaultCategories.both)) {
          const data = parentData as ParentCategoryData;

          // Create parent category
          const parent = await tx.category.create({
            data: {
              user_id: user.id,
              name: parentName,
              type: 'both',
              analytic_flag: 'expense',
              nature: data.nature || 'WANT',
              icon: data.icon,
              color: data.color,
              is_system: true,
              is_active: true
            }
          });

          // Create child categories
          if (data.children) {
            for (const child of data.children) {
              await tx.category.create({
                data: {
                  user_id: user.id,
                  parent_id: parent.id,
                  name: child.name,
                  type: 'both',
                  analytic_flag: 'expense',
                  nature: child.nature || data.nature || 'WANT',
                  icon: child.icon,
                  color: data.color, // Inherit parent color
                  is_system: true,
                  is_active: true
                }
              });
            }
          }
        }
      }

      // 5. Create default accounts
      for (const account of defaultAccounts) {
        await tx.account.create({
          data: {
            user_id: user.id,
            name: account.name,
            account_type: account.account_type,
            icon: account.icon,
            color: account.color,
            currency: account.currency || 'USD',
            initial_balance: account.initial_balance || 0,
            // current_balance removed - calculated on-demand
            is_active: account.is_active,
            is_included_in_total: account.is_included_in_total
          }
        });
      }

      return user;
    });

    // Generate JWT tokens
    const tokenPayload = {
      user_id: result.id,
      email: result.email,
      username: result.username
    };

    const { accessToken, refreshToken } = await generateTokenPair(tokenPayload);

    // Return success response with tokens
    return successResponse(
      {
        user: {
          id: result.id,
          email: result.email,
          username: result.username,
          full_name: result.full_name,
          created_at: result.created_at,
          has_ai_access: result.has_ai_access
        },
        access_token: accessToken,
        refresh_token: refreshToken
      },
      { message: 'Registration successful' },
      201
    );

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'An error occurred during registration',
      500
    );
  }
}
