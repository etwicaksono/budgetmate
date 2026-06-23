/**
 * SwiftRouter LLM Provider
 *
 * SwiftRouter is OpenAI-compatible, so we use the `openai` package
 * with a custom baseURL and API key.
 * Handles tool use via OpenAI's tools / tool_calls mechanism.
 */

import OpenAI from 'openai';
import type { ChatMessage, LLMProvider, LLMTurnResult, ToolDefinition, LLMStreamEvent } from '../types';

function toOpenAIMessages(messages: ChatMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
    if (m.role === 'tool') {
      return {
        role: 'tool',
        tool_call_id: m.tool_call_id ?? '',
        content: m.content,
      };
    }
    if (m.tool_calls?.length) {
      return {
        role: 'assistant',
        content: m.content ?? null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      };
    }
    return {
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    };
  });
}

function toOpenAITools(tools: ToolDefinition[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export class SwiftRouterProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL: string, model: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMTurnResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: toOpenAIMessages(messages),
      ...(tools?.length ? { tools: toOpenAITools(tools), tool_choice: 'auto' as const } : {}),
    });

    const choice = response.choices[0];
    const message = choice?.message;

    if (message?.tool_calls?.length) {
      return {
        type: 'tool_calls',
        calls: message.tool_calls.map((tc) => {
          const raw = tc as unknown as { id: string; function: { name: string; arguments: string } };
          return {
            id: raw.id,
            name: raw.function.name,
            arguments: JSON.parse(raw.function.arguments || '{}') as Record<string, unknown>,
          };
        }),
      };
    }

    return { type: 'text', content: message?.content ?? '' };
  }

  async *chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMStreamEvent, void, unknown> {
    const responseStream = await this.client.chat.completions.create({
      model: this.model,
      messages: toOpenAIMessages(messages),
      ...(tools?.length ? { tools: toOpenAITools(tools), tool_choice: 'auto' as const } : {}),
      stream: true,
    });

    const toolCallsAcc: Array<{ id: string; name: string; arguments: string }> = [];
    let isToolCall = false;

    for await (const chunk of responseStream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.tool_calls) {
        isToolCall = true;
        for (const tc of delta.tool_calls) {
          const index = tc.index;
          if (!toolCallsAcc[index]) {
            toolCallsAcc[index] = { id: tc.id || `tc-${index}`, name: tc.function?.name || '', arguments: '' };
          }
          if (tc.function?.name) toolCallsAcc[index].name = tc.function.name;
          if (tc.function?.arguments) toolCallsAcc[index].arguments += tc.function.arguments;
        }
      } else if (delta.content && !isToolCall) {
        yield { type: 'text_chunk', content: delta.content };
      }
    }

    if (isToolCall) {
      yield {
        type: 'tool_calls',
        calls: toolCallsAcc.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: JSON.parse(tc.arguments || '{}') as Record<string, unknown>,
        })),
      };
    }
  }

  async complete(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0]?.message.content ?? '';
  }
}
