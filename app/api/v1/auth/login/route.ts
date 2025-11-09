import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { LoginRequestSchema, LoginResponseSchema } from '@/schemas/auth/login.schema';
import bcrypt from 'bcryptjs';

/**
 * @summary User login
 * @description Authenticates a user with email or username and password. Returns access and refresh tokens on success. Access tokens expire after 24 hours. Supports login with either email or username.
 * @tag Auth
 * @bodyContent {application/json} { email_or_username: string, password: string }
 * @param request Next.js request containing login credentials
 * @response 200 - Login successful: `{ success: true, message: "Login successful", data: { access_token: string, refresh_token: string, user: { id: string, email: string, username: string, created_at: string, updated_at: string } } }`
 * @response 400 - Validation failure: `{ success: false, message: "Email/username and password are required" }`
 * @response 401 - Invalid credentials: `{ success: false, message: "Invalid credentials" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Validate request body with Zod
    const body = await validateBody(request, LoginRequestSchema);
    const { email_or_username, password } = body;

    // Find user by email or username
    const user = await db.users.findFirst({
      where: {
        OR: [
          { email: email_or_username },
          { username: email_or_username }
        ]
      }
    });

    if (!user) {
      return Response.json(
        ApiResponseBuilder.error('Invalid credentials'),
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return Response.json(
        ApiResponseBuilder.error('Invalid credentials'),
        { status: 401 }
      );
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
    return Response.json(
      ApiResponseBuilder.success('Login successful', validatedResponse),
      { status: 200 }
    );
  } catch (error) {
    // Handle validation errors
    return handleValidationError(error);
  }
}
