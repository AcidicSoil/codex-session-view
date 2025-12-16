import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
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
} from '~/server/persistence/chatThreads'
import { deleteMessagesForThread } from '~/server/persistence/chatMessages'

const renameInput = z.object({
  threadId: z.string().min(1),
  title: z.string().min(1),
})

export const renameChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => renameInput.parse(data))
  .handler(async ({ data }) => {
    const updated = await renameChatThread(data.threadId, data.title)
    return {
      thread: updated,
    }
  })

const deleteInput = z.object({
  threadId: z.string().min(1),
})

export const deleteChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data }) => {
    const removed = await removeChatThreadRecord(data.threadId)
    if (!removed) {
      throw new Error('Thread not found')
    }
    await deleteMessagesForThread(data.threadId)
    const nextActive = await ensureActiveThreadAfterRemoval(removed)
    return {
      deletedId: removed.id,
      nextActiveId: nextActive?.id ?? null,
    }
  })

const archiveInput = z.object({
  threadId: z.string().min(1),
})

export const archiveChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => archiveInput.parse(data))
  .handler(async ({ data }) => {
    const thread = await archiveChatThread(data.threadId)
    if (!thread) {
      throw new Error('Thread not found')
    }
    const nextActive = await ensureActiveThreadAfterRemoval(thread)
    return {
      archivedId: thread.id,
      nextActiveId: nextActive?.id ?? null,
    }
  })

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

const clearInput = z.object({
  threadId: z.string().min(1),
})

export const clearChatThreadState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => clearInput.parse(data))
  .handler(async ({ data }) => {
    await deleteMessagesForThread(data.threadId)
    const thread = await resetChatThreadMessages(data.threadId)
    return {
      clearedId: thread.id,
    }
  })
