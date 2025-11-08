import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { ApiResponse, ApiErrorResponse, LoginResponse } from '@/types/api-responses';

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
    const body = await request.json();
    const { email_or_username, password } = body;

    // Validate required fields
    if (!email_or_username || !password) {
      return Response.json(
        ApiResponseBuilder.error('Email/username and password are required') as ApiErrorResponse,
        { status: 400 }
      );
    }

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
        ApiResponseBuilder.error('Invalid credentials') as ApiErrorResponse,
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return Response.json(
        ApiResponseBuilder.error('Invalid credentials') as ApiErrorResponse,
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

    // Return response
    return Response.json(
      ApiResponseBuilder.success('Login successful', {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at?.toISOString() || user.created_at.toISOString(),
        }
      }) as ApiResponse<LoginResponse>,
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      ApiResponseBuilder.error('Internal server error') as ApiErrorResponse,
      { status: 500 }
    );
  }
}
