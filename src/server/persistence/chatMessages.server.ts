import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createChatMessageRecord,
  type ChatMessageEvidence,
  type ChatMessageRecord,
  type ChatMode,
  type SessionId,
} from '~/lib/sessions/model'
import { logError } from '~/lib/logger'
import { getActiveChatThread, touchChatThread, startNewChatThread, setActiveChatThread } from '~/server/persistence/chatThreads.server'

const chatMessagesCollection = createCollection(
  localOnlyCollectionOptions<ChatMessageRecord>({
    id: 'chat-messages-store',
    getKey: (record) => record.id,
  }),
)

const DATA_DIR = path.join(process.cwd(), 'data')
const CHAT_MESSAGES_FILE = path.join(DATA_DIR, 'chat-messages.json')

let hydrationPromise: Promise<void> | null = null
let hydrated = false
let writeChain = Promise.resolve()
let isHydrating = false

async function ensureHydrated() {
  if (hydrated) {
    return
  }
  if (!hydrationPromise) {
    hydrationPromise = hydrateFromDisk()
  }
  await hydrationPromise
}

async function hydrateFromDisk() {
  isHydrating = true
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const raw = await fs.readFile(CHAT_MESSAGES_FILE, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error?.code === 'ENOENT') {
        return '[]'
      }
      throw error
    })
    let parsed: unknown = []
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      logError('chatMessages.hydrate', 'Failed to parse chat history snapshot; starting fresh', error as Error)
      parsed = []
    }
    if (!Array.isArray(parsed)) {
      parsed = []
    }
    const threadCache = new Map<string, string>()
    for (const record of parsed as ChatMessageRecord[]) {
      if (!record?.id) continue
      const recordWithThread = await ensureRecordHasThread(record, threadCache)
      if (chatMessagesCollection.get(recordWithThread.id)) {
        continue
      }
      await chatMessagesCollection.insert(recordWithThread)
    }
    hydrated = true
  } catch (error) {
    logError('chatMessages.hydrate', 'Unable to hydrate chat history store', error as Error)
    hydrated = true
  } finally {
    isHydrating = false
  }
}

function schedulePersist() {
  if (isHydrating) {
    return writeChain
  }
  writeChain = writeChain
    .then(async () => {
      const snapshot = [...chatMessagesCollection.toArray]
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(CHAT_MESSAGES_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
    })
    .catch((error) => {
      logError('chatMessages.persist', 'Failed to persist chat history snapshot', error as Error)
    })
  return writeChain
}

export async function listChatMessages(sessionId: SessionId, mode: ChatMode, threadId?: string): Promise<ChatMessageRecord[]> {
  await ensureHydrated()
  const targetThreadId = await resolveThreadId(sessionId, mode, threadId)
  return chatMessagesCollection.toArray
    .filter((record) => record.sessionId === sessionId && record.mode === mode && record.threadId === targetThreadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function listChatMessagesByThread(threadId: string) {
  await ensureHydrated()
  return chatMessagesCollection.toArray
    .filter((record) => record.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function appendChatMessage(input: {
  sessionId: SessionId
  mode: ChatMode
  role: ChatMessageRecord['role']
  content: string
  misalignmentId?: string
  clientMessageId?: string
  evidence?: ChatMessageEvidence[]
  contextEvents?: ChatMessageRecord['contextEvents']
  threadId?: string
}) {
  await ensureHydrated()
  const targetThreadId = await resolveThreadId(input.sessionId, input.mode, input.threadId)
  const dedupeKey = input.clientMessageId
  if (dedupeKey) {
    const existing = chatMessagesCollection.toArray.find(
      (record) =>
        record.sessionId === input.sessionId &&
        record.mode === input.mode &&
        record.threadId === targetThreadId &&
        record.clientMessageId === dedupeKey,
    )
    if (existing) {
      return existing
    }
  }
  const record = createChatMessageRecord({ ...input, threadId: targetThreadId })
  await chatMessagesCollection.insert(record)
  await touchChatThread(targetThreadId, {
    lastMessagePreview: record.content.slice(0, 280),
    lastMessageAt: record.updatedAt,
    incrementCount: 1,
  })
  await schedulePersist()
  return record
}

export async function resetChatThread(sessionId: SessionId, mode: ChatMode) {
  await ensureHydrated()
  await startNewChatThread(sessionId, mode)
}

export async function activateChatThread(sessionId: SessionId, mode: ChatMode, threadId: string) {
  await ensureHydrated()
  const thread = await setActiveChatThread(threadId)
  if (thread.sessionId !== sessionId || thread.mode !== mode) {
    throw new Error('Thread does not match session/mode')
  }
}

export async function updateChatMessage(id: string, apply: (draft: ChatMessageRecord) => void) {
  await ensureHydrated()
  const existing = chatMessagesCollection.get(id)
  if (!existing) {
    throw new Error(`Chat message ${id} not found`)
  }
  await chatMessagesCollection.update(id, (draft) => {
    apply(draft)
    draft.updatedAt = new Date().toISOString()
  })
  const refreshed = chatMessagesCollection.get(id)
  if (!refreshed) {
    throw new Error(`Chat message ${id} not found after update`)
  }
  await schedulePersist()
  return refreshed
}

export function getChatMessagesCollection() {
  return chatMessagesCollection
}

export async function clearChatMessages() {
  await ensureHydrated()
  for (const record of chatMessagesCollection.toArray) {
    await chatMessagesCollection.delete(record.id)
  }
  await schedulePersist()
}

export async function deleteMessagesForThread(threadId: string) {
  await ensureHydrated()
  const matches = chatMessagesCollection.toArray.filter((record) => record.threadId === threadId)
  for (const record of matches) {
    await chatMessagesCollection.delete(record.id)
  }
  await schedulePersist()
}

async function ensureRecordHasThread(
  record: ChatMessageRecord,
  cache: Map<string, string>,
): Promise<ChatMessageRecord> {
  if (record.threadId) {
    return record
  }
  const key = `${record.sessionId}:${record.mode}`
  if (!cache.has(key)) {
    const thread = await getActiveChatThread(record.sessionId, record.mode)
    cache.set(key, thread.id)
  }
  const threadId = cache.get(key)!
  return { ...record, threadId }
}

async function resolveThreadId(sessionId: SessionId, mode: ChatMode, preferred?: string) {
  if (preferred) return preferred
  const thread = await getActiveChatThread(sessionId, mode)
  return thread.id
}
