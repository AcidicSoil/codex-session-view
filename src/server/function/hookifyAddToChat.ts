import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'

const loadHookifyAddToChatServer = createServerOnlyFn(() => import('./hookifyAddToChat.server'))

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
    const { handleHookifyAddToChatServer } = await loadHookifyAddToChatServer()
    return handleHookifyAddToChatServer(data)
  })
