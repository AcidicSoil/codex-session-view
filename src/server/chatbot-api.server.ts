import { assertChatModeEnabled } from '~/features/chatbot/chatModeConfig'
import { logError, logWarn } from '~/lib/logger'
import { resolveModelForMode } from '~/lib/ai/client'
import { ProviderUnavailableError } from '~/server/lib/aiRuntime'
import { ensureLmStudioModelsRegistered } from '~/server/lib/lmStudioModels'
import { resolveActiveThreadId } from '~/server/chatbot-api/threads'
import { analyzeInputSchema, streamInputSchema } from '~/server/chatbot-api/schema'
import { jsonResponse } from '~/server/chatbot-api/response'
import { isProviderUnavailableError } from '~/server/chatbot-api/errors'
import { handleGeneralChatStream, handleSessionChatStream } from '~/server/chatbot-api/stream'
import { handleAnalyzeChat } from '~/server/chatbot-api/analyze'

export { buildAssistantEvidence } from '~/server/chatbot-api/stream'

export async function streamChatFromPayload(payload: unknown): Promise<Response> {
  const input = streamInputSchema.safeParse(payload)
  if (!input.success) {
    return jsonResponse({ error: 'INVALID_INPUT', issues: input.error.flatten() }, 400)
  }
  await ensureLmStudioModelsRegistered().catch(() => {})
  try {
    assertChatModeEnabled(input.data.mode)
  } catch (error) {
    return jsonResponse(
      { code: (error as Error & { code?: string }).code ?? 'MODE_NOT_ENABLED' },
      403
    )
  }
  let modelId: string | null = null
  try {
    modelId = resolveModelForMode(input.data.mode, input.data.modelId)
  } catch (error) {
    return jsonResponse(
      {
        error: 'INVALID_MODEL',
        message: error instanceof Error ? error.message : 'Invalid model selection',
      },
      400
    )
  }

  const startedAt = Date.now()
  try {
    const activeThreadId = await resolveActiveThreadId(
      input.data.sessionId,
      input.data.mode,
      input.data.threadId,
    )
    if (input.data.mode === 'general') {
      return await handleGeneralChatStream({
        sessionId: input.data.sessionId,
        prompt: input.data.prompt,
        clientMessageId: input.data.clientMessageId,
        modelId,
        startedAt,
        threadId: activeThreadId,
      })
    }
    return await handleSessionChatStream({
      sessionId: input.data.sessionId,
      prompt: input.data.prompt,
      clientMessageId: input.data.clientMessageId,
      metadata: input.data.metadata ?? undefined,
      modelId,
      startedAt,
      threadId: activeThreadId,
    })
  } catch (error) {
    if (isProviderUnavailableError(error)) {
      logWarn('chatbot.stream', 'Requested model is unavailable', {
        sessionId: input.data.sessionId,
        mode: input.data.mode,
        modelId,
        providerId: (error as ProviderUnavailableError).providerId,
        durationMs: Date.now() - startedAt,
      })
      return jsonResponse(
        {
          code: 'MODEL_UNAVAILABLE',
          message: error instanceof Error ? error.message : 'Model is not available right now.',
        },
        503
      )
    }
    logError('chatbot.stream', 'Streaming response failed', {
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      modelId,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : error,
      metadata: input.data.metadata ?? null,
      success: false,
    })
    throw error
  }
}

export async function analyzeChatFromPayload(payload: unknown): Promise<Response> {
  const input = analyzeInputSchema.safeParse(payload)
  if (!input.success) {
    return jsonResponse({ error: 'INVALID_INPUT', issues: input.error.flatten() }, 400)
  }
  await ensureLmStudioModelsRegistered().catch(() => {})
  if (input.data.mode !== 'session') {
    return jsonResponse({ code: 'MODE_NOT_ENABLED' }, 200)
  }
  try {
    assertChatModeEnabled(input.data.mode)
  } catch (error) {
    return jsonResponse(
      { code: (error as Error & { code?: string }).code ?? 'MODE_NOT_ENABLED' },
      403
    )
  }

  const startedAt = Date.now()
  return handleAnalyzeChat(input.data, startedAt)
}
