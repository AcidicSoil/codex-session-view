import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { logInfo, logWarn } from '~/lib/logger'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'
import { evaluateAddToChatContent, type HookRuleSummary, type HookDecisionSeverity } from '~/server/lib/hookifyRuntime'
import { recordHookifyDecision } from '~/server/persistence/hookifyDecisions'

type HookSource = 'timeline' | 'session' | 'manual'

const inputSchema = z.object({
  sessionId: z.string().min(1),
  source: z.union([z.literal('timeline'), z.literal('session'), z.literal('manual')]),
  content: z.string().min(1),
  eventType: z.string().optional(),
  filePath: z.string().optional(),
})

export interface HookifyAddToChatResponse {
  blocked: boolean
  severity: HookDecisionSeverity
  rules: HookRuleSummary[]
  annotations?: string
  message?: string
  decisionId: string
  prefill: CoachPrefillPayload | null
}

export const hookifyAddToChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadAgentRules } = await import('~/server/lib/chatbotData')
    const agentRules = await loadAgentRules()
    const evaluation = evaluateAddToChatContent({
      sessionId: data.sessionId,
      source: data.source,
      content: data.content,
      agentRules,
    })

    const record = await recordHookifyDecision({
      sessionId: data.sessionId,
      source: data.source,
      severity: evaluation.severity,
      blocked: evaluation.blocked,
      rules: evaluation.rules,
      message: evaluation.message,
      annotations: evaluation.annotations,
      content: data.content,
    })

    const logPayload = {
      sessionId: data.sessionId,
      source: data.source,
      severity: evaluation.severity,
      blocked: evaluation.blocked,
      decisionId: record.id,
      ruleCount: evaluation.rules.length,
    }

    if (evaluation.blocked) {
      logWarn('hookify.add-to-chat', 'Add to chat blocked by AGENT rules', logPayload)
    } else {
      logInfo('hookify.add-to-chat', 'Add to chat annotated by AGENT rules', logPayload)
    }

    return {
      blocked: evaluation.blocked,
      severity: evaluation.severity,
      rules: evaluation.rules,
      annotations: evaluation.annotations,
      message: evaluation.message,
      decisionId: record.id,
      prefill: evaluation.blocked ? null : evaluation.prefill ?? { prompt: data.content },
    } satisfies HookifyAddToChatResponse
  })
