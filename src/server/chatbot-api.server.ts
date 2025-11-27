import { z } from 'zod'
import { parseAgentRules } from '~/lib/agents-rules/parser'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import { assertChatModeEnabled } from '~/features/chatbot/chatModeConfig'
import { logError, logInfo, logWarn } from '~/lib/logger'
import type { ChatMessageEvidence, SessionSnapshot } from '~/lib/sessions/model'
import { appendChatMessage, listChatMessages } from '~/server/persistence/chatMessages'
import { ingestMisalignmentCandidates, listMisalignments } from '~/server/persistence/misalignments'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import { generateCommitMessages, generateSessionSummaryMarkdown, resolveModelForMode, getChatModelDefinition } from '~/lib/ai/client'
import { generateSessionCoachReply, runGeneralChatTurn, type ChatStreamResult } from '~/server/lib/aiRuntime'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'

const metadataSchema = z
  .object({
    misalignmentId: z.string().optional(),
    ruleId: z.string().optional(),
    severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
    eventRange: z
      .object({
        startIndex: z.number().min(0),
        endIndex: z.number().min(0),
      })
      .optional(),
  })
  .optional()

const streamInputSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  clientMessageId: z.string().optional(),
  metadata: metadataSchema,
  modelId: z.string().optional(),
})

const analyzeInputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  analysisType: z.enum(['summary', 'commits']).default('summary'),
  prompt: z.string().optional(),
})

let cachedSnapshot: SessionSnapshot | null = null
let cachedRules: ReturnType<typeof parseAgentRules> | null = null

export async function streamChatFromPayload(payload: unknown): Promise<Response> {
  const input = streamInputSchema.safeParse(payload)
  if (!input.success) {
    return jsonResponse({ error: 'INVALID_INPUT', issues: input.error.flatten() }, 400)
  }
  try {
    assertChatModeEnabled(input.data.mode)
  } catch (error) {
    return jsonResponse({ code: (error as Error & { code?: string }).code ?? 'MODE_NOT_ENABLED' }, 403)
  }
  let modelId: string | null = null
  try {
    modelId = resolveModelForMode(input.data.mode, input.data.modelId)
  } catch (error) {
    return jsonResponse({ error: 'INVALID_MODEL', message: error instanceof Error ? error.message : 'Invalid model selection' }, 400)
  }

  const startedAt = Date.now()
  try {
    if (input.data.mode === 'general') {
      return await handleGeneralChatStream({
        sessionId: input.data.sessionId,
        prompt: input.data.prompt,
        clientMessageId: input.data.clientMessageId,
        modelId,
        startedAt,
      })
    }
    return await handleSessionChatStream({
      sessionId: input.data.sessionId,
      prompt: input.data.prompt,
      clientMessageId: input.data.clientMessageId,
      metadata: input.data.metadata ?? undefined,
      modelId,
      startedAt,
    })
  } catch (error) {
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
  if (input.data.mode !== 'session') {
    return jsonResponse({ code: 'MODE_NOT_ENABLED' }, 200)
  }
  try {
    assertChatModeEnabled(input.data.mode)
  } catch (error) {
    return jsonResponse({ code: (error as Error & { code?: string }).code ?? 'MODE_NOT_ENABLED' }, 403)
  }

  const startedAt = Date.now()
  try {
    const snapshot = await loadSessionSnapshot(input.data.sessionId)
    const rules = await loadAgentRules()
    const misalignments = await listMisalignments(input.data.sessionId)
    const history = await listChatMessages(input.data.sessionId, input.data.mode)
    const context = buildChatContext({ snapshot, misalignments, agentRules: rules, history })
    const baseMeta = {
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      analysisType: input.data.analysisType,
    }
    if (input.data.analysisType === 'summary') {
      const summaryMarkdown = generateSessionSummaryMarkdown({
        snapshot,
        misalignments,
        recentEvents: snapshot.events,
        contextHeadings: context.sections.map((section) => section.heading),
        promptSummary: input.data.prompt,
      })
      logInfo('chatbot.analyze', 'Analyze request processed', {
        ...baseMeta,
        misalignments: misalignments.length,
        durationMs: Date.now() - startedAt,
        success: true,
      })
      return jsonResponse({ summaryMarkdown })
    }

    const commitMessages = generateCommitMessages({
      snapshot,
      misalignments,
      recentEvents: snapshot.events,
      contextHeadings: context.sections.map((section) => section.heading),
      promptSummary: input.data.prompt,
    })
    logInfo('chatbot.analyze', 'Analyze request processed', {
      ...baseMeta,
      misalignments: misalignments.length,
      durationMs: Date.now() - startedAt,
      success: true,
    })
    return jsonResponse({ commitMessages })
  } catch (error) {
    logError('chatbot.analyze', 'Analyze request failed', {
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      analysisType: input.data.analysisType,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : error,
      success: false,
    })
    throw error
  }
}

const TEXT_STREAM_HEADERS = {
  'content-type': 'text/plain; charset=utf-8',
}

interface SessionStreamOptions {
  sessionId: string
  prompt: string
  clientMessageId?: string
  metadata?: ChatRemediationMetadata
  modelId: string
  startedAt: number
}

interface GeneralStreamOptions {
  sessionId: string
  prompt: string
  clientMessageId?: string
  modelId: string
  startedAt: number
}

async function handleSessionChatStream(options: SessionStreamOptions) {
  const snapshot = await loadSessionSnapshot(options.sessionId)
  const rules = await loadAgentRules()
  const existingMisalignments = await listMisalignments(options.sessionId)
  const history = await listChatMessages(options.sessionId, 'session')
  const userMessage = await appendChatMessage({
    sessionId: options.sessionId,
    mode: 'session',
    role: 'user',
    content: options.prompt,
    clientMessageId: options.clientMessageId,
  })
  history.push(userMessage)

  const detected = detectMisalignments({ snapshot, agentRules: rules, existing: existingMisalignments })
  if (detected.misalignments.length > 0) {
    await ingestMisalignmentCandidates(options.sessionId, detected.misalignments)
  }
  detected.warnings.forEach((warning) => logWarn('chatbot.misalignment', warning))

  const refreshedMisalignments: MisalignmentRecord[] = await listMisalignments(options.sessionId)
  const modelDefinition = getChatModelDefinition(options.modelId)
  const context = buildChatContext({
    snapshot,
    misalignments: refreshedMisalignments,
    history,
    agentRules: rules,
    providerOverrides: {
      maxContextTokens: modelDefinition.contextWindow,
      maxOutputTokens: modelDefinition.maxOutputTokens,
    },
  })

  const runtime = generateSessionCoachReply({
    history,
    contextPrompt: context.prompt,
    metadata: options.metadata,
    modelId: options.modelId,
  })

  const evidence = buildAssistantEvidence(options.metadata, refreshedMisalignments)
  const responseStream = streamResultToResponse(runtime, {
    onComplete: async (assistantText) => {
      const assistantRecord = await appendChatMessage({
        sessionId: options.sessionId,
        mode: 'session',
        role: 'assistant',
        content: assistantText,
        misalignmentId: options.metadata?.misalignmentId,
        evidence,
      })
      logInfo('chatbot.stream', 'Streaming response', {
        sessionId: options.sessionId,
        mode: 'session',
        messageId: assistantRecord.id,
        promptTokens: context.usedTokens,
        trimmedSections: context.trimmedSectionIds,
        metadata: options.metadata ?? null,
        modelId: options.modelId,
        durationMs: Date.now() - options.startedAt,
        finishReason: await runtime.finishReason.catch(() => 'unknown'),
        usage: await runtime.totalUsage.catch(() => null),
        success: true,
      })
    },
    onError: async (error) => {
      logError('chatbot.stream', 'Streaming response failed mid-stream', {
        sessionId: options.sessionId,
        mode: 'session',
        modelId: options.modelId,
        durationMs: Date.now() - options.startedAt,
        error: error instanceof Error ? error.message : error,
        metadata: options.metadata ?? null,
        success: false,
      })
    },
  })

  return new Response(responseStream, { headers: TEXT_STREAM_HEADERS })
}

async function handleGeneralChatStream(options: GeneralStreamOptions) {
  const history = await listChatMessages(options.sessionId, 'general')
  const userMessage = await appendChatMessage({
    sessionId: options.sessionId,
    mode: 'general',
    role: 'user',
    content: options.prompt,
    clientMessageId: options.clientMessageId,
  })
  history.push(userMessage)

  const runtime = runGeneralChatTurn({ history, modelId: options.modelId })
  const responseStream = streamResultToResponse(runtime, {
    onComplete: async (assistantText) => {
      const assistantRecord = await appendChatMessage({
        sessionId: options.sessionId,
        mode: 'general',
        role: 'assistant',
        content: assistantText,
      })
      logInfo('chatbot.stream', 'Streaming response', {
        sessionId: options.sessionId,
        mode: 'general',
        messageId: assistantRecord.id,
        modelId: options.modelId,
        durationMs: Date.now() - options.startedAt,
        finishReason: await runtime.finishReason.catch(() => 'unknown'),
        usage: await runtime.totalUsage.catch(() => null),
        success: true,
      })
    },
    onError: async (error) => {
      logError('chatbot.stream', 'Streaming response failed mid-stream', {
        sessionId: options.sessionId,
        mode: 'general',
        modelId: options.modelId,
        durationMs: Date.now() - options.startedAt,
        error: error instanceof Error ? error.message : error,
        success: false,
      })
    },
  })
  return new Response(responseStream, { headers: TEXT_STREAM_HEADERS })
}

function streamResultToResponse(
  runtime: ChatStreamResult,
  handlers: { onComplete: (text: string) => Promise<void>; onError?: (error: unknown) => Promise<void> | void },
) {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = ''
      try {
        for await (const chunk of runtime.textStream) {
          buffer += chunk
          controller.enqueue(encoder.encode(chunk))
        }
        await handlers.onComplete(buffer)
        controller.close()
      } catch (error) {
        controller.error(error)
        if (handlers.onError) {
          await handlers.onError(error)
        }
      }
    },
  })
}

export function buildAssistantEvidence(metadata: ChatRemediationMetadata | undefined, misalignments: MisalignmentRecord[]) {
  if (!metadata?.misalignmentId) {
    return undefined
  }
  const record = misalignments.find((item) => item.id === metadata.misalignmentId)
  if (!record || !record.evidence?.length) {
    return undefined
  }
  return record.evidence.map<ChatMessageEvidence>((entry, index) => ({
    path: entry.eventId ?? (typeof entry.eventIndex === 'number' ? `event-${entry.eventIndex}` : undefined),
    ruleId: record.ruleId,
    snippet: entry.highlight ?? entry.message,
    severity: record.severity,
    label: entry.message ?? `Evidence #${index + 1}`,
  }))
}

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  if (cachedSnapshot) {
    return { ...cachedSnapshot, sessionId }
  }
  const fs = await import('node:fs/promises')
  const url = new URL('../../tests/fixtures/session-large.json', import.meta.url)
  const file = await fs.readFile(url, 'utf8')
  const parsed = JSON.parse(file) as { meta: SessionSnapshot['meta']; events: SessionSnapshot['events'] }
  cachedSnapshot = {
    sessionId,
    meta: parsed.meta,
    events: parsed.events,
  }
  return cachedSnapshot
}

export async function loadAgentRules() {
  if (cachedRules) {
    return cachedRules
  }
  const fs = await import('node:fs/promises')
  const url = new URL('../../tests/fixtures/agents/AGENTS.session-coach.md', import.meta.url)
  const file = await fs.readFile(url, 'utf8')
  cachedRules = parseAgentRules(file)
  return cachedRules
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
