/**
 * Gemini LLM Provider
 *
 * Implements LLMProvider using @google/generative-ai.
 * Handles tool use via Gemini's functionDeclarations / functionCall mechanism.
 */

import {
  GoogleGenerativeAI,
  type Content,
  type Part,
  SchemaType,
} from '@google/generative-ai';
import type { ChatMessage, LLMProvider, LLMTurnResult, ToolDefinition, LLMStreamEvent } from '../types';

function toGeminiFunctionDeclarations(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([k, v]) => [
          k,
          {
            type: v.type.toUpperCase() as SchemaType,
            description: v.description ?? '',
            ...(v.enum ? { enum: v.enum } : {}),
          },
        ])
      ),
      required: t.parameters.required ?? [],
    },
  }));
}

function toGeminiHistory(messages: ChatMessage[]): Content[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m): Content => {
      if (m.role === 'tool') {
        return {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: m.tool_call_id ?? 'tool',
                response: { result: m.content },
              },
            },
          ],
        };
      }
      if (m.tool_calls?.length) {
        return {
          role: 'model',
          parts: m.tool_calls.map(
            (tc): Part => ({
              functionCall: { name: tc.name, args: tc.arguments as Record<string, unknown> },
            })
          ),
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      };
    });
}

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMTurnResult> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const history = toGeminiHistory(
      messages.slice(0, -1).filter((m) => m.role !== 'system')
    );
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return { type: 'text', content: '' };

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
      ...(tools?.length
        ? { tools: [{ functionDeclarations: toGeminiFunctionDeclarations(tools) }] }
        : { tools: undefined }),
    } as Parameters<typeof this.client.getGenerativeModel>[0]);

    const chat = genModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const candidate = result.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const fnCalls = parts.filter((p) => p.functionCall);
    if (fnCalls.length > 0) {
      return {
        type: 'tool_calls',
        calls: fnCalls.map((p, i) => ({
          id: `gemini-tc-${i}`,
          name: p.functionCall!.name,
          arguments: (p.functionCall!.args ?? {}) as Record<string, unknown>,
        })),
      };
    }

    const text = parts.map((p) => p.text ?? '').join('');
    return { type: 'text', content: text };
  }

  async *chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMStreamEvent, void, unknown> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const history = toGeminiHistory(
      messages.slice(0, -1).filter((m) => m.role !== 'system')
    );
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      ...(systemMessage ? { systemInstruction: systemMessage.content } : {}),
      ...(tools?.length
        ? { tools: [{ functionDeclarations: toGeminiFunctionDeclarations(tools) }] }
        : { tools: undefined }),
    } as Parameters<typeof this.client.getGenerativeModel>[0]);

    const chat = genModel.startChat({ history });
    const resultStream = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of resultStream.stream) {
      const parts = chunk.candidates?.[0]?.content?.parts ?? [];
      const fnCalls = parts.filter((p) => p.functionCall);
      
      if (fnCalls.length > 0) {
        yield {
          type: 'tool_calls',
          calls: fnCalls.map((p, i) => ({
            id: `gemini-tc-${i}`,
            name: p.functionCall!.name,
            arguments: (p.functionCall!.args ?? {}) as Record<string, unknown>,
          })),
        };
        return; // Once tools are requested, we stop streaming this turn
      }

      const text = parts.map((p) => p.text ?? '').join('');
      if (text) {
        yield { type: 'text_chunk', content: text };
      }
    }
  }

  async complete(prompt: string): Promise<string> {
    const genModel = this.client.getGenerativeModel({ model: this.model });
    const result = await genModel.generateContent(prompt);
    return result.response.text();
  }
}
