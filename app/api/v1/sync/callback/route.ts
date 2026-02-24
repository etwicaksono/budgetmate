import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, saveUserTokens } from '@/lib/auth/google';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';

    if (error) {
      return NextResponse.redirect(
        `${appUrl}/settings?sync_error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/settings?sync_error=missing_params`
      );
    }

    const stateData = JSON.parse(
      Buffer.from(state, 'base64').toString('utf-8')
    );
    const { userId } = stateData;

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/settings?sync_error=invalid_state`
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    await saveUserTokens(userId, tokens);

    return NextResponse.redirect(
      `${appUrl}/settings?sync_success=true`
    );
  } catch (error) {
    console.error('Callback error:', error);
    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
    return NextResponse.redirect(
      `${appUrl}/settings?sync_error=callback_failed`
    );
  }
}
