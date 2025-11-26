import { z } from 'zod'
import { parseAgentRules } from '~/lib/agents-rules/parser'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import { assertChatModeEnabled } from '~/features/chatbot/chatModeConfig'
import { logError, logInfo, logWarn } from '~/lib/logger'
import type { SessionSnapshot } from '~/lib/sessions/model'
import { appendChatMessage, listChatMessages } from '~/server/persistence/chatMessages'
import { ingestMisalignmentCandidates, listMisalignments } from '~/server/persistence/misalignments'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import { generateCommitMessages, generateSessionSummaryMarkdown } from '~/lib/ai/client'
import type { ChatRemediationMetadata } from '~/features/chatbot/chatbot.runtime'

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
    const existingMisalignments = await listMisalignments(input.data.sessionId)
    const history = await listChatMessages(input.data.sessionId, input.data.mode)
    const userMessage = await appendChatMessage({
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      role: 'user',
      content: input.data.prompt,
      clientMessageId: input.data.clientMessageId,
    })
    history.push(userMessage)

    const detected = detectMisalignments({ snapshot, agentRules: rules, existing: existingMisalignments })
    if (detected.misalignments.length > 0) {
      await ingestMisalignmentCandidates(input.data.sessionId, detected.misalignments)
    }
    detected.warnings.forEach((warning) => logWarn('chatbot.misalignment', warning))

    const refreshedMisalignments: MisalignmentRecord[] = await listMisalignments(input.data.sessionId)
    const context = buildChatContext({
      snapshot,
      misalignments: refreshedMisalignments,
      history,
      agentRules: rules,
    })

  const assistantText = synthesizeAssistantText({
    prompt: input.data.prompt,
    contextSections: context.sections.map((section) => section.heading),
    misalignments: refreshedMisalignments,
    metadata: input.data.metadata,
  })

    const assistantRecord = await appendChatMessage({
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      role: 'assistant',
      content: assistantText,
    })
    const stream = streamFromText(assistantText)
    logInfo('chatbot.stream', 'Streaming response', {
      sessionId: input.data.sessionId,
      mode: input.data.mode,
      messageId: assistantRecord.id,
      promptTokens: context.usedTokens,
      trimmedSections: context.trimmedSectionIds,
      metadata: input.data.metadata ?? null,
      durationMs: Date.now() - startedAt,
      success: true,
    })
    return new Response(stream, {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    })
  } catch (error) {
    logError('chatbot.stream', 'Streaming response failed', {
      sessionId: input.success ? input.data.sessionId : 'unknown',
      mode: input.success ? input.data.mode : 'unknown',
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : error,
      metadata: input.success ? input.data.metadata ?? null : null,
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

function synthesizeAssistantText(options: {
  prompt: string
  contextSections: string[]
  misalignments: MisalignmentRecord[]
  metadata?: ChatRemediationMetadata
}) {
  const header = `Session coach response:\n\n${options.prompt}`
  const sections = [`Context sections: ${options.contextSections.join(', ') || 'none'}`]
  if (options.metadata) {
    sections.push(formatMetadataSnippet(options.metadata))
  }
  if (options.misalignments.length > 0) {
    sections.push(
      'Misalignments detected:\n' +
        options.misalignments
          .map((item) => `- [${item.severity}] ${item.title} (${item.status}) — ${item.summary}`)
          .join('\n'),
    )
  } else {
    sections.push('No misalignments recorded for this session yet.')
  }
  return [header, ...sections].join('\n\n')
}

function formatMetadataSnippet(metadata: ChatRemediationMetadata) {
  const severity = metadata.severity ?? 'unspecified'
  const target = metadata.ruleId ? metadata.ruleId.toUpperCase() : 'unspecified rule'
  const range = metadata.eventRange
    ? `events ${metadata.eventRange.startIndex}-${metadata.eventRange.endIndex}`
    : 'no event range set'
  return `Remediation target: ${target} (${severity}) around ${range}.`
}

function streamFromText(text: string) {
  const encoder = new TextEncoder()
  const words = text.split(/\s+/)
  let index = 0
  return new ReadableStream<Uint8Array>({
    start(controller) {
      function pushChunk() {
        if (index >= words.length) {
          controller.close()
          return
        }
        const chunk = words.slice(index, index + 15).join(' ')
        index += 15
        controller.enqueue(encoder.encode(chunk + '\n'))
        setTimeout(pushChunk, 10)
      }
      pushChunk()
    },
  })
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
