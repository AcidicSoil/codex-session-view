import { buildChatContext } from '~/features/chatbot/context-builder'
import { featureFlags } from '~/config/features'
import { getChatModelOptions, getDefaultModelForMode } from '~/lib/ai/client'
import { logWarn } from '~/lib/logger'
import { activateChatThread, listChatMessages, resetChatThread } from '~/server/persistence/chatMessages.server'
import { getActiveChatThread, listChatThreads } from '~/server/persistence/chatThreads.server'
import { listMisalignments } from '~/server/persistence/misalignments'
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import { ensureLmStudioModelsRegistered } from '~/server/lib/lmStudioModels'

export async function fetchChatbotStateServer(data: {
  sessionId: string
  mode: 'session' | 'general'
  reset?: boolean
  threadId?: string
}) {
  await ensureLmStudioModelsRegistered().catch(() => {})
  const { loadAgentRules, loadSessionSnapshot } = await import('~/server/lib/chatbotData.server')
  if (data.reset) {
    await resetChatThread(data.sessionId, data.mode)
  }
  if (data.threadId) {
    await activateChatThread(data.sessionId, data.mode, data.threadId)
  }
  const activeThread = await getActiveChatThread(data.sessionId, data.mode)
  const snapshot = await loadSessionSnapshot(data.sessionId)
  const repoBinding = data.mode === 'session' ? getSessionRepoBinding(data.sessionId) : null
  const agentRules = repoBinding ? await loadAgentRules(repoBinding.rootDir) : []
  if (data.mode === 'session' && !repoBinding) {
    logWarn('chatbot.state', 'No repo root bound to session; skipping AGENT rules', {
      sessionId: data.sessionId,
    })
  }
  const messages = await listChatMessages(data.sessionId, data.mode, activeThread.id)
  const misalignments = data.mode === 'session' ? await listMisalignments(data.sessionId) : []
  const contextPreview =
    data.mode === 'session'
      ? buildChatContext({ snapshot, misalignments, history: messages, agentRules })
      : null
  const contextSections = contextPreview?.sections ?? []
  const threadSummaries = await listChatThreads(data.sessionId, data.mode)
  return {
    sessionId: data.sessionId,
    mode: data.mode,
    threadId: activeThread.id,
    threads: threadSummaries.map((thread) => ({
      id: thread.id,
      title: thread.title,
      status: thread.status,
      messageCount: thread.messageCount,
      lastMessagePreview: thread.lastMessagePreview,
      lastMessageAt: thread.lastMessageAt,
      mode: thread.mode,
    })),
    featureEnabled: featureFlags.sessionCoach.enabled(),
    repoContext: repoBinding,
    snapshot,
    misalignments,
    messages,
    contextSections: contextSections.map((section) => ({ id: section.id, heading: section.heading })),
    modelOptions: getChatModelOptions(data.mode),
    initialModelId: getDefaultModelForMode(data.mode),
  }
}
