import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { featureFlags } from '~/config/features'
import { loadAgentRules, loadSessionSnapshot } from '~/server/chatbot-api.server'
import { listChatMessages } from '~/server/persistence/chatMessages'
import { listMisalignments } from '~/server/persistence/misalignments'

const inputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
})

export const fetchChatbotState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const snapshot = await loadSessionSnapshot(data.sessionId)
    const agentRules = await loadAgentRules()
    const messages = await listChatMessages(data.sessionId, data.mode)
    const misalignments = await listMisalignments(data.sessionId)
    const contextPreview = buildChatContext({ snapshot, misalignments, history: messages, agentRules })
    return {
      sessionId: data.sessionId,
      mode: data.mode,
      featureEnabled: featureFlags.sessionCoach.enabled(),
      snapshot,
      misalignments,
      messages,
      contextSections: contextPreview.sections.map((section) => ({ id: section.id, heading: section.heading })),
    }
  })
