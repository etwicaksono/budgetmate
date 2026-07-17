/**
 * POST /api/ai/sessions/[id]/messages
 *
 * Send a user message, run the agentic loop (with tool calls if needed),
 * stream the final response back, then persist both messages to the DB.
 *
 * Agentic loop:
 *   1. Build system prompt (context data + instructions)
 *   2. Send [system + history + user message + tools] to LLM
 *   3. If LLM returns tool_calls → execute each tool → append results → repeat
 *   4. When LLM returns text → stream to client + save to DB
 *   5. If first message in session → fire-and-forget AI title generation
 */

import { NextRequest } from 'next/server';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { errorResponse } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import { createLLMProvider } from '@/lib/ai/factory';
import { ANALYTICS_TOOLS, toolExecutor } from '@/lib/ai/tools';
import { buildSystemPrompt, formatIncomeExpenseReport } from '@/lib/ai/formatters';
import type { ChatMessage, ContextSnapshot, ToolCall } from '@/lib/ai/types';
import { logError } from '@/lib/logger';


interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_TOOL_ITERATIONS = 5; // guard against infinite loops

export async function POST(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { id: sessionId } = await params;

  // ── Validate session ownership ──────────────────────────────────────────
  let session: { context_snapshot: unknown; messages: Array<{ role: string; content: string }> } | null = null;
  try {
    session = await prisma.aiChatSession.findFirst({
      where: { id: sessionId, user_id: auth.user.user_id },
      include: {
        messages: { orderBy: { created_at: 'asc' }, select: { role: true, content: true } },
      },
    });
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session', 'find');
    if (prismaError) return prismaError;

    logError('Unexpected error while validating AI chat session ownership:', error);
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred', 500);
  }

  if (!session) return errorResponse('NOT_FOUND', 'AI chat session not found', 404);

  let body: { content: string; provider?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_BODY', 'Request body must be JSON', 400);
  }
  if (!body.content?.trim()) {
    return errorResponse('MISSING_FIELD', 'content is required', 400);
  }

  const userContent = body.content.trim();
  const context = session.context_snapshot as unknown as ContextSnapshot;
  const isFirstMessage = session.messages.length === 0;

  // ── Fetch & format analytics context data ───────────────────────────────
  let contextData = '(Tidak ada data tersedia untuk periode ini)';
  try {
    const params = new URLSearchParams({
      period_type: context.periodType ?? 'month',
      ...(context.numberOfColumns && { periods: context.numberOfColumns.toString() }),
      ...(context.startDate && { start_date: context.startDate }),
      ...(context.endDate && { end_date: context.endDate }),
      ...(context.categoryIds?.length && { category_ids: context.categoryIds.join(',') }),
      ...(context.accountIds?.length && { account_ids: context.accountIds.join(',') }),
      ...(context.currencies?.length && { currencies: context.currencies.join(',') }),
    });

    const apiUrl = new URL(`/api/v1/analytics/income-expense-report?${params}`, request.url);
    const dataRes = await fetch(apiUrl, {
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        authorization: request.headers.get('authorization') ?? '',
      },
    });

    if (dataRes.ok) {
      const json = await dataRes.json();

      const filterLabel = [
        context.periodLabel,
        context.categoryIds?.length ? `${context.categoryIds.length} kategori` : 'Semua kategori',
        context.accountIds?.length ? `${context.accountIds.length} akun` : 'Semua akun',
        context.filterName ? `Preset Filter: ${context.filterName}` : '',
        context.searchTerm ? `Pencarian: "${context.searchTerm}"` : '',
      ].filter(Boolean).join(' · ');
      contextData = formatIncomeExpenseReport(json.data ?? json, filterLabel);
    } else {
      logError('[DEBUG_SERVER_LOG] Analytics API failed with status:', dataRes.status);
      return errorResponse('ANALYTICS_ERROR', `Gagal mengambil data dari server (Status: ${dataRes.status}). Silakan coba lagi.`, dataRes.status);
    }
  } catch (err) {
    logError('[AI] Failed to fetch analytics context:', err);
    return errorResponse('ANALYTICS_ERROR', 'Terjadi kesalahan sistem saat menghubungi server analitik.', 500);
  }

  // ── Build message history ────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(contextData, context.periodLabel ?? '');

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...session.messages.map((m) => ({ role: m.role as ChatMessage['role'], content: m.content })),
    { role: 'user', content: userContent },
  ];

  // ── Agentic loop & Streaming ──────────────────────────────────────────────
  const provider = createLLMProvider(body.provider, body.model);

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, content: string) => {
        const data = JSON.stringify({ type, content });
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      };

      let finalText = '';
      let iterations = 0;

      try {
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;
          const streamGen = provider.chatStream(messages, ANALYTICS_TOOLS);
          
          let toolCallsToExecute: ToolCall[] | null = null;

          for await (const event of streamGen) {
            if (event.type === 'tool_calls') {
              toolCallsToExecute = event.calls;
              break;
            } else if (event.type === 'text_chunk') {
              finalText += event.content;
              sendEvent('chunk', event.content);
            }
          }

          if (toolCallsToExecute) {
            // Send tool_status to frontend
            const toolNames = toolCallsToExecute.map(tc => {
              if (tc.name === 'get_transactions') return 'transaksi';
              if (tc.name === 'get_category_summary') return 'kategori pengeluaran';
              return tc.name;
            }).join(', ');
            
            sendEvent('tool_status', `Mengambil data ${toolNames}...`);

            // Add assistant tool calls to history
            messages.push({ role: 'assistant', content: '', tool_calls: toolCallsToExecute });

            for (const tc of toolCallsToExecute) {
              let toolResult: string;
              try {
                toolResult = await toolExecutor(tc.name, tc.arguments, auth.user.user_id, context);
              } catch (err) {
                logError(`[AI] Tool ${tc.name} failed:`, err);
                toolResult = `[Tool: ${tc.name}]\nGagal mengambil data.`;
              }
              messages.push({ role: 'tool', content: toolResult, tool_call_id: tc.id });
            }
            // Continue the loop
          } else {
            // No more tools, text is fully streamed
            break;
          }
        }

        if (!finalText) {
          finalText = 'Maaf, saya tidak dapat memproses permintaan ini saat ini.';
          sendEvent('chunk', finalText);
        }

        // ── Persist messages (Wait before closing stream to ensure DB saves) ──
        try {
          await prisma.aiChatMessage.createMany({
            data: [
              { session_id: sessionId, role: 'user', content: userContent },
              { session_id: sessionId, role: 'assistant', content: finalText },
            ],
          });

          await prisma.aiChatSession.update({
            where: { id: sessionId },
            data: {
              updated_at: new Date(),
              // Default title = first 100 chars of the user's first question.
              // The AI-generated title (fire-and-forget below) replaces it later.
              ...(isFirstMessage && { title: userContent.slice(0, 100).trim() }),
            },
          });
        } catch (error) {
          const prismaError = handlePrismaError(error, 'AI chat message', 'persist');
          if (!prismaError) {
            logError('Unexpected error while persisting AI chat messages:', error);
          }
          sendEvent('error', 'Terjadi kesalahan pada sistem saat memproses pesan.');
          return;
        }

        if (isFirstMessage) {
          // Fire-and-forget title generation so we don't delay the stream end
          void generateSessionTitle(sessionId, userContent, finalText, provider);
        }

      } catch (err) {
        logError('[AI] Stream loop error:', err);
        sendEvent('error', 'Terjadi kesalahan pada sistem saat memproses pesan.');
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ── Title generation (non-blocking) ─────────────────────────────────────────
// Tries to generate a short AI title from the first exchange.
// Falls back to the user's message (truncated to 100 chars) if AI fails.
async function generateSessionTitle(
  sessionId: string,
  userMessage: string,
  assistantReply: string,
  provider: ReturnType<typeof createLLMProvider>
): Promise<void> {
  // Fallback: use the first 100 chars of the user's first message as the title.
  // userMessage is guaranteed non-empty — validated at POST handler line 94-96
  const fallbackTitle = userMessage.slice(0, 100).trim();

  let aiTitle: string | null = null;
  try {
    const prompt =
      `Berikan judul singkat (maks 7 kata, dalam Bahasa Indonesia) untuk percakapan berikut:\n\n` +
      `User: ${userMessage.slice(0, 200)}\nAI: ${assistantReply.slice(0, 200)}\n\n` +
      `Tulis HANYA judulnya saja, tanpa tanda kutip atau penjelasan tambahan.`;

    aiTitle = (await provider.complete(prompt)).trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    logError('[AI] LLM title generation failed, falling back to user message:', err);
  }

  // Use AI title if non-empty, otherwise fall back to user message
  const finalTitle = aiTitle || fallbackTitle;

  try {
    await prisma.aiChatSession.update({ where: { id: sessionId }, data: { title: finalTitle } });
  } catch (error) {
    const prismaError = handlePrismaError(error, 'AI chat session title', 'update');
    if (prismaError) {
      return;
    }

    logError('[AI] Failed to persist session title:', {
      error,
      sessionId,
      usedFallback: !aiTitle,
    });
  }
}
