import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import { listMisalignments } from '~/server/persistence/misalignments'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'

const inputSchema = z.object({
  sessionId: z.string().min(1),
})

export const generateSessionContextPrefill = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<CoachPrefillPayload> => {
    const { loadSessionSnapshot, loadAgentRules } = await import('~/server/lib/chatbotData.server')
    const snapshot = await loadSessionSnapshot(data.sessionId)
    if (!snapshot) {
      throw new Error('Session context unavailable. Load a session before injecting context.')
    }
    const repoBinding = getSessionRepoBinding(data.sessionId)
    const agentRules = repoBinding ? await loadAgentRules(repoBinding.rootDir) : []
    const misalignments = await listMisalignments(data.sessionId)
    const context = buildChatContext({ snapshot, misalignments, agentRules })
    const sectionBlocks = context.sections
      .map((section) => `## ${section.heading}\n${section.content}`.trim())
      .join('\n\n')
    const prompt = [`Refresh analysis for session ${snapshot.sessionId}.`, sectionBlocks]
      .filter(Boolean)
      .join('\n\n')
    return {
      prompt,
    }
  })
