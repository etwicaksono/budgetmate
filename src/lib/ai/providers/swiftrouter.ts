/**
 * SwiftRouter LLM Provider
 *
 * SwiftRouter is OpenAI-compatible, so the shared OpenAICompatibleProvider
 * supplies the whole implementation and this class only names the provider.
 */

import { OpenAICompatibleProvider } from './openai-compatible';

export class SwiftRouterProvider extends OpenAICompatibleProvider {}
