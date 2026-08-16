/**
 * VyceAI LLM Provider
 *
 * VyceAI is OpenAI-compatible (https://vyceai.com/v1/chat/completions), so the
 * shared OpenAICompatibleProvider supplies the whole implementation and this
 * class only names the provider.
 *
 * Alongside the concrete models, VyceAI accepts the special model id 'auto',
 * which lets the service route the request to a model of its choosing.
 */

import { OpenAICompatibleProvider } from './openai-compatible';

export class VyceAIProvider extends OpenAICompatibleProvider {}
