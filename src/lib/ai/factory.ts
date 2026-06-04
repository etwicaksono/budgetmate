/**
 * LLM Provider Factory
 *
 * Reads AI_PROVIDER + GEMINI_MODELS / SWIFTROUTER_MODELS from environment
 * and returns the appropriate LLMProvider.
 *
 * Model list: comma-separated env var — first item is the default.
 * Both provider and model can be overridden at call-time (used by the messages
 * route when the user selects a different provider/model from the chat UI).
 *
 * Supported providers:
 *   - 'gemini'      → Google Gemini via @google/generative-ai
 *   - 'swiftrouter' → SwiftRouter (OpenAI-compatible) via openai package
 */

import type { LLMProvider } from './types';
import { GeminiProvider } from './providers/gemini';
import { SwiftRouterProvider } from './providers/swiftrouter';

export type SupportedProvider = 'gemini' | 'swiftrouter';

/** Returns the ordered list of available models for a provider. */
export function getAvailableModels(provider: SupportedProvider): string[] {
  if (provider === 'gemini') {
    const raw = process.env['GEMINI_MODELS'] ?? '';
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : ['gemini-2.5-flash'];
  }
  const raw = process.env['SWIFTROUTER_MODELS'] ?? '';
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : [];
}

/** Returns the default (first) model for a provider. */
export function getDefaultModel(provider: SupportedProvider): string {
  return getAvailableModels(provider)[0] ?? '';
}

export function createLLMProvider(
  providerOverride?: string,
  modelOverride?: string,
): LLMProvider {
  const providerName = ((providerOverride ?? process.env['AI_PROVIDER']) || 'gemini') as SupportedProvider;

  switch (providerName) {
    case 'gemini': {
      const apiKey = process.env['GEMINI_API_KEY'];
      const model = modelOverride ?? getDefaultModel('gemini');
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment');
      if (!model) throw new Error('No Gemini model configured. Set GEMINI_MODELS in .env');
      return new GeminiProvider(apiKey, model);
    }

    case 'swiftrouter': {
      const apiKey = process.env['SWIFTROUTER_API_KEY'];
      const baseURL = process.env['SWIFTROUTER_BASE_URL'] ?? 'https://api.swiftrouter.com/v1';
      const model = modelOverride ?? getDefaultModel('swiftrouter');
      if (!apiKey) throw new Error('SWIFTROUTER_API_KEY is not set in environment');
      if (!model) throw new Error('No SwiftRouter model configured. Set SWIFTROUTER_MODELS in .env');
      return new SwiftRouterProvider(apiKey, baseURL, model);
    }

    default:
      throw new Error(
        `Unsupported AI_PROVIDER: "${providerName}". Supported values: gemini, swiftrouter`
      );
  }
}
