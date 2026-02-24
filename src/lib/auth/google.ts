import { prisma } from '@/lib/db/prisma';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Custom error for Google authentication issues
export class GoogleAuthError extends Error {
  constructor(message: string, public userMessage: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env['GOOGLE_CLIENT_ID']!,
    redirect_uri: process.env['GOOGLE_REDIRECT_URI']!,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env['GOOGLE_CLIENT_ID']!,
      client_secret: process.env['GOOGLE_CLIENT_SECRET']!,
      redirect_uri: process.env['GOOGLE_REDIRECT_URI']!,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env['GOOGLE_CLIENT_ID']!,
      client_secret: process.env['GOOGLE_CLIENT_SECRET']!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}

export async function saveUserTokens(
  userId: string,
  tokens: GoogleTokens
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token || null,
      google_token_expires: expiresAt,
    },
  });
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      google_access_token: true,
      google_refresh_token: true,
      google_token_expires: true,
    },
  });

  if (!user?.google_access_token) {
    throw new GoogleAuthError(
      'User not connected to Google',
      'Google Sheets is not connected. Please connect your Google account in Settings.'
    );
  }

  const now = new Date();
  const expiresAt = user.google_token_expires;

  if (!expiresAt || expiresAt <= now) {
    if (!user.google_refresh_token) {
      throw new GoogleAuthError(
        'Token expired and no refresh token available',
        'Your Google Sheets connection has expired. Please reconnect your Google account in Settings.'
      );
    }

    try {
      const tokens = await refreshAccessToken(user.google_refresh_token);
      await saveUserTokens(userId, tokens);
      return tokens.access_token;
    } catch (error) {
      throw new GoogleAuthError(
        'Failed to refresh Google token',
        'Your Google Sheets connection has expired. Please reconnect your Google account in Settings.'
      );
    }
  }

  return user.google_access_token;
}

export async function revokeAccess(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { google_access_token: true },
  });

  if (user?.google_access_token) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${user.google_access_token}`,
        { method: 'POST' }
      );
    } catch (error) {
      console.error('Failed to revoke Google token:', error);
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires: null,
      google_sheet_id: null,
      google_sheet_url: null,
      google_sheet_name: null,
      last_synced_at: null,
    },
  });
}
