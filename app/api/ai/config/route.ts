/**
 * GET /api/ai/config
 *
 * Returns the available AI providers and their model lists.
 * Used by the frontend settings panel so users can pick provider + model.
 * Does NOT expose API keys.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getAvailableModels } from '@/lib/ai/factory';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const defaultProvider = (process.env['AI_PROVIDER'] ?? 'gemini') as string;

  const providers = [
    {
      id: 'gemini',
      name: 'Google Gemini',
      models: getAvailableModels('gemini'),
    },
    {
      id: 'swiftrouter',
      name: 'SwiftRouter',
      models: getAvailableModels('swiftrouter'),
    },
    {
      id: 'vyceai',
      name: 'VyceAI',
      models: getAvailableModels('vyceai'),
    },
  ].filter((p) => p.models.length > 0); // hide providers with no models configured

  return NextResponse.json({
    data: {
      defaultProvider,
      providers,
    },
  });
}
