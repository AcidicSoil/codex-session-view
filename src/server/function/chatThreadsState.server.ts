import {
  archiveChatThread,
  getActiveChatThread,
  listChatThreads,
  removeChatThreadRecord,
  renameChatThread,
  resetChatThreadMessages,
  setActiveChatThread,
  startNewChatThread,
  type ChatThreadRecord,
} from '~/server/persistence/chatThreads.server'
import { deleteMessagesForThread } from '~/server/persistence/chatMessages.server'

export async function renameChatThreadStateServer(threadId: string, title: string) {
  const updated = await renameChatThread(threadId, title)
  return {
    thread: updated,
  }
}

export async function deleteChatThreadStateServer(threadId: string) {
  const removed = await removeChatThreadRecord(threadId)
  if (!removed) {
    throw new Error('Thread not found')
  }
  await deleteMessagesForThread(threadId)
  const nextActive = await ensureActiveThreadAfterRemoval(removed)
  return {
    deletedId: removed.id,
    nextActiveId: nextActive?.id ?? null,
  }
}

export async function archiveChatThreadStateServer(threadId: string) {
  const thread = await archiveChatThread(threadId)
  if (!thread) {
    throw new Error('Thread not found')
  }
  const nextActive = await ensureActiveThreadAfterRemoval(thread)
  return {
    archivedId: thread.id,
    nextActiveId: nextActive?.id ?? null,
  }
}

export async function clearChatThreadStateServer(threadId: string) {
  await deleteMessagesForThread(threadId)
  const thread = await resetChatThreadMessages(threadId)
  return {
    clearedId: thread.id,
  }
}

async function ensureActiveThreadAfterRemoval(thread: ChatThreadRecord) {
  const remaining = await listChatThreads(thread.sessionId, thread.mode)
  const hasActive = remaining.some((entry) => entry.status === 'active')
  if (hasActive) {
    const active = await getActiveChatThread(thread.sessionId, thread.mode)
    return active
  }
  if (remaining.length > 0) {
    const promoted = await setActiveChatThread(remaining[0].id)
    return promoted
  }
  const next = await startNewChatThread(thread.sessionId, thread.mode)
  return next
}
