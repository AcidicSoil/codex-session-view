import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { featureFlags } from '~/config/features'
import { listChatMessages, resetChatThread } from '~/server/persistence/chatMessages'
import { listMisalignments } from '~/server/persistence/misalignments'
import { getChatModelOptions, getDefaultModelForMode } from '~/lib/ai/client'
import { ensureLmStudioModelsRegistered } from '~/server/lib/lmStudioModels'
import { logWarn } from '~/lib/logger'
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'

const inputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  reset: z.boolean().optional(),
})

export const fetchChatbotState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    await ensureLmStudioModelsRegistered().catch(() => {})
    const { loadAgentRules, loadSessionSnapshot } = await import('~/server/lib/chatbotData')
    if (data.reset) {
      await resetChatThread(data.sessionId, data.mode)
    }
    const snapshot = await loadSessionSnapshot(data.sessionId)
    const repoBinding = data.mode === 'session' ? getSessionRepoBinding(data.sessionId) : null
    const agentRules = repoBinding ? await loadAgentRules(repoBinding.rootDir) : []
    if (data.mode === 'session' && !repoBinding) {
      logWarn('chatbot.state', 'No repo root bound to session; skipping AGENT rules', {
        sessionId: data.sessionId,
      })
    }
    const messages = await listChatMessages(data.sessionId, data.mode)
    const misalignments = data.mode === 'session' ? await listMisalignments(data.sessionId) : []
    const contextPreview =
      data.mode === 'session'
        ? buildChatContext({ snapshot, misalignments, history: messages, agentRules })
        : null
    const contextSections = contextPreview?.sections ?? []
    return {
      sessionId: data.sessionId,
      mode: data.mode,
      featureEnabled: featureFlags.sessionCoach.enabled(),
      repoContext: repoBinding,
      snapshot,
      misalignments,
      messages,
      contextSections: contextSections.map((section) => ({ id: section.id, heading: section.heading })),
      modelOptions: getChatModelOptions(data.mode),
      initialModelId: getDefaultModelForMode(data.mode),
    }
  })
