import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * @summary Log a user in and mint session tokens.
 * @description Validates `email_or_username` and `password` from the JSON body, verifies credentials, and issues both access and refresh tokens alongside basic user info.
 * @tag Auth
 * @bodyContent {Object} { email_or_username: string, password: string }
 * @param request Next.js request carrying the credential payload.
 * @response 200 - Login successful; returns tokens and user profile.
 * @response 400 - Missing email/username or password in the request body.
 * @response 401 - Credentials do not match an existing user.
 * @response 500 - Unexpected server error while processing the login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email_or_username, password } = body;

    // Validate required fields
    if (!email_or_username || !password) {
      return Response.json(
        ApiResponseBuilder.error('Email/username and password are required'),
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
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      ApiResponseBuilder.error('Internal server error'),
      { status: 500 }
    );
  }
}
