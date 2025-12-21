import { buildChatContext } from '~/features/chatbot/context-builder'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import { logError, logInfo, logWarn } from '~/lib/logger'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'
import { appendChatMessage, listChatMessages } from '~/server/persistence/chatMessages.server'
import { ingestMisalignmentCandidates, listMisalignments } from '~/server/persistence/misalignments'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import { getChatModelDefinition } from '~/lib/ai/client'
import { loadAgentRules, loadSessionSnapshot } from '~/server/lib/chatbotData.server'
import { resolveTimelineContext } from '~/server/lib/sessionEventResolver'
import { generateSessionCoachReply, runGeneralChatTurn } from '~/server/lib/aiRuntime'
import { createTimelineTools } from '~/server/lib/tools/timelineTools'
import { createNdjsonStream } from '~/server/lib/chatStream/ndjsonStream'
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import type { ChatMessageEvidence } from '~/lib/sessions/model'

export const NDJSON_STREAM_HEADERS = {
  'content-type': 'application/x-ndjson; charset=utf-8',
}

interface SessionStreamOptions {
  sessionId: string
  prompt: string
  clientMessageId?: string
  metadata?: ChatRemediationMetadata
  modelId: string
  startedAt: number
  threadId: string
}

interface GeneralStreamOptions {
  sessionId: string
  prompt: string
  clientMessageId?: string
  modelId: string
  startedAt: number
  threadId: string
}

export async function handleSessionChatStream(options: SessionStreamOptions) {
  const snapshot = await loadSessionSnapshot(options.sessionId)
  const repoBinding = getSessionRepoBinding(options.sessionId)
  const rules = repoBinding ? await loadAgentRules(repoBinding.rootDir) : []
  if (!repoBinding) {
    logWarn('chatbot.stream', 'Missing repo root for session; continuing without AGENT rules', {
      sessionId: options.sessionId,
    })
  }
  const existingMisalignments = await listMisalignments(options.sessionId)
  const history = await listChatMessages(options.sessionId, 'session', options.threadId)
  const timelineContext = resolveTimelineContext({
    snapshot,
    prompt: options.prompt,
    metadata: options.metadata,
  })
  const userMessage = await appendChatMessage({
    sessionId: options.sessionId,
    mode: 'session',
    threadId: options.threadId,
    role: 'user',
    content: options.prompt,
    clientMessageId: options.clientMessageId,
    contextEvents: timelineContext.references.length ? timelineContext.references : undefined,
  })
  history.push(userMessage)

  const detected = detectMisalignments({
    snapshot,
    agentRules: rules,
    existing: existingMisalignments,
  })
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
    extraSections: timelineContext.section ? [timelineContext.section] : undefined,
  })

  const timelineTools = createTimelineTools({ sessionId: options.sessionId, threadId: options.threadId })
  const runtime = generateSessionCoachReply({
    history,
    contextPrompt: context.prompt,
    metadata: options.metadata,
    modelId: options.modelId,
    tools: timelineTools,
    toolContext: { sessionId: options.sessionId, threadId: options.threadId },
  })

  const evidence = buildAssistantEvidence(options.metadata, refreshedMisalignments)
  const responseStream = createNdjsonStream({
    runtime,
    onComplete: async (assistantText) => {
      const assistantRecord = await appendChatMessage({
        sessionId: options.sessionId,
        mode: 'session',
        threadId: options.threadId,
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
        resolvedEvents: timelineContext.references.map((ref) => ref.displayIndex),
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

  return new Response(responseStream, { headers: NDJSON_STREAM_HEADERS })
}

export async function handleGeneralChatStream(options: GeneralStreamOptions) {
  const history = await listChatMessages(options.sessionId, 'general', options.threadId)
  const userMessage = await appendChatMessage({
    sessionId: options.sessionId,
    mode: 'general',
    threadId: options.threadId,
    role: 'user',
    content: options.prompt,
    clientMessageId: options.clientMessageId,
  })
  history.push(userMessage)

  const runtime = runGeneralChatTurn({ history, modelId: options.modelId })
  const responseStream = createNdjsonStream({
    runtime,
    onComplete: async (assistantText) => {
      const assistantRecord = await appendChatMessage({
        sessionId: options.sessionId,
        mode: 'general',
        threadId: options.threadId,
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
  return new Response(responseStream, { headers: NDJSON_STREAM_HEADERS })
}

export function buildAssistantEvidence(
  metadata: ChatRemediationMetadata | undefined,
  misalignments: MisalignmentRecord[],
): ChatMessageEvidence[] | undefined {
  if (!metadata?.misalignmentId) {
    return undefined
  }
  const record = misalignments.find((item) => item.id === metadata.misalignmentId)
  if (!record || !record.evidence?.length) {
    return undefined
  }
  return record.evidence.map<ChatMessageEvidence>((entry, index) => ({
    path:
      entry.eventId ??
      (typeof entry.eventIndex === 'number' ? `event-${entry.eventIndex}` : undefined),
    ruleId: record.ruleId,
    snippet: entry.highlight ?? entry.message,
    severity: record.severity,
    label: record.title ?? entry.message ?? `Evidence #${index + 1}`,
  }))
}
