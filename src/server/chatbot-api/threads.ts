import { activateChatThread } from '~/server/persistence/chatMessages.server'
import { getActiveChatThread } from '~/server/persistence/chatThreads.server'

export async function resolveActiveThreadId(
  sessionId: string,
  mode: 'session' | 'general',
  threadId?: string,
) {
  if (threadId) {
    await activateChatThread(sessionId, mode, threadId)
  }
  const activeThread = await getActiveChatThread(sessionId, mode)
  return activeThread.id
}
