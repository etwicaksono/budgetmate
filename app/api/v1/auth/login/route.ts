import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email_or_username, password } = body;

    // Validate required fields
    if (!email_or_username || !password) {
      return jsonResponse(
        ApiResponseBuilder.error('Email/username and password are required'),
        400
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
      return jsonResponse(
        ApiResponseBuilder.error('Invalid credentials'),
        401
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid credentials'),
        401
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
    return jsonResponse(
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
      200
    );
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
