import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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
