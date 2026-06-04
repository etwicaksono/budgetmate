/**
 * AI Chat Layer — Core Types
 *
 * Defines the provider-agnostic interface used throughout the AI chat system.
 * All LLM providers (Gemini, SwiftRouter, etc.) must implement LLMProvider.
 */

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Tool call id — populated when role is 'tool' (result message) */
  tool_call_id?: string;
  /** Tool calls requested by the model — populated when role is 'assistant' and model wants to call tools */
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  /** Unique id for this tool call (used to match result back to request) */
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

/**
 * The result of a single LLM turn.
 * Either a final text response, or one-or-more tool calls to execute.
 */
export type LLMTurnResult =
  | { type: 'text'; content: string }
  | { type: 'tool_calls'; calls: ToolCall[] };

export type LLMStreamEvent =
  | { type: 'text_chunk'; content: string }
  | { type: 'tool_calls'; calls: ToolCall[] }
  | { type: 'tool_status'; content: string };

export interface LLMProvider {
  /**
   * Send a conversation turn to the LLM (Blocking).
   */
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMTurnResult>;

  /**
   * Send a conversation turn to the LLM and stream the response.
   * Yields text chunks, tool call requests, or status updates.
   */
  chatStream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncGenerator<LLMStreamEvent, void, unknown>;

  /**
   * Lightweight call — used only for generating a session title.
   * Always returns text (no tool calls).
   */
  complete(prompt: string): Promise<string>;
}

/**
 * Snapshot of the analytics filter state at the time a chat session is created.
 * Stored in AiChatSession.context_snapshot (JSON column).
 */
export interface ContextSnapshot {
  activeTab: string;
  startDate?: string;
  endDate?: string;
  categoryIds: string[];
  accountIds: string[];
  currencies: string[];
  periodLabel: string;
  periodType: string;
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
  transferOption?: string;
  debtOption?: string;
  sortOption?: string;
  selectedLabelIds?: string[];
  filterId?: string;
  filterName?: string;
  numberOfColumns?: number;
}
