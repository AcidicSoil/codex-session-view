import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { ChatMode, SessionId } from '~/lib/sessions/model'
import { logError } from '~/lib/logger'
import { generateId } from '~/utils/id-generator'

export type ChatThreadStatus = 'active' | 'archived'

export interface ChatThreadRecord {
  id: string
  sessionId: SessionId
  mode: ChatMode
  title: string
  status: ChatThreadStatus
  messageCount: number
  lastMessagePreview?: string
  lastMessageAt?: string
  createdAt: string
  updatedAt: string
}

const chatThreadsCollection = createCollection(
  localOnlyCollectionOptions<ChatThreadRecord>({
    id: 'chat-threads-store',
    getKey: (record) => record.id,
  }),
)

const DATA_DIR = path.join(process.cwd(), 'data')
const CHAT_THREADS_FILE = path.join(DATA_DIR, 'chat-threads.json')

let hydrationPromise: Promise<void> | null = null
let hydrated = false
let writeChain = Promise.resolve()
let isHydrating = false

async function ensureHydrated() {
  if (hydrated) return
  if (!hydrationPromise) {
    hydrationPromise = hydrateFromDisk()
  }
  await hydrationPromise
}

async function hydrateFromDisk() {
  isHydrating = true
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    const raw = await fs.readFile(CHAT_THREADS_FILE, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error?.code === 'ENOENT') {
        return '[]'
      }
      throw error
    })
    let parsed: unknown = []
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      logError('chatThreads.hydrate', 'Failed to parse chat thread snapshot; starting fresh', error as Error)
      parsed = []
    }
    if (!Array.isArray(parsed)) {
      parsed = []
    }
    for (const record of parsed as ChatThreadRecord[]) {
      if (!record?.id) continue
      if (chatThreadsCollection.get(record.id)) continue
      await chatThreadsCollection.insert(record)
    }
    hydrated = true
  } catch (error) {
    logError('chatThreads.hydrate', 'Unable to hydrate chat thread store', error as Error)
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
      const snapshot = [...chatThreadsCollection.toArray]
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(CHAT_THREADS_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
    })
    .catch((error) => {
      logError('chatThreads.persist', 'Failed to persist chat thread snapshot', error as Error)
    })
  return writeChain
}

export async function listChatThreads(sessionId: SessionId, mode?: ChatMode) {
  await ensureHydrated()
  return chatThreadsCollection.toArray
    .filter((thread) => thread.sessionId === sessionId && (!mode || thread.mode === mode))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getChatThreadById(id: string) {
  await ensureHydrated()
  return chatThreadsCollection.get(id) ?? null
}

export async function getActiveChatThread(sessionId: SessionId, mode: ChatMode) {
  await ensureHydrated()
  const existing = chatThreadsCollection.toArray.find(
    (thread) => thread.sessionId === sessionId && thread.mode === mode && thread.status === 'active',
  )
  if (existing) {
    return existing
  }
  return await createChatThread({
    sessionId,
    mode,
    title: deriveDefaultTitle(mode, chatThreadsCollection.toArray.filter((thread) => thread.sessionId === sessionId && thread.mode === mode).length + 1),
  })
}

interface CreateChatThreadInput {
  sessionId: SessionId
  mode: ChatMode
  title?: string
  status?: ChatThreadStatus
}

async function createChatThread(input: CreateChatThreadInput) {
  const now = new Date().toISOString()
  const record: ChatThreadRecord = {
    id: generateId('thread'),
    sessionId: input.sessionId,
    mode: input.mode,
    title: input.title ?? deriveDefaultTitle(input.mode),
    status: input.status ?? 'active',
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  await chatThreadsCollection.insert(record)
  await schedulePersist()
  return record
}

export async function startNewChatThread(sessionId: SessionId, mode: ChatMode) {
  await ensureHydrated()
  const active = await getActiveChatThread(sessionId, mode)
  if (active.status === 'active') {
    await chatThreadsCollection.update(active.id, (draft) => {
      draft.status = 'archived'
      draft.updatedAt = new Date().toISOString()
    })
  }
  const count = chatThreadsCollection.toArray.filter(
    (thread) => thread.sessionId === sessionId && thread.mode === mode,
  ).length
  const thread = await createChatThread({
    sessionId,
    mode,
    title: deriveDefaultTitle(mode, count + 1),
    status: 'active',
  })
  return thread
}

export async function setActiveChatThread(threadId: string) {
  await ensureHydrated()
  const target = chatThreadsCollection.get(threadId)
  if (!target) {
    throw new Error(`Chat thread ${threadId} not found`)
  }
  const peers = chatThreadsCollection.toArray.filter(
    (thread) => thread.sessionId === target.sessionId && thread.mode === target.mode,
  )
  for (const peer of peers) {
    await chatThreadsCollection.update(peer.id, (draft) => {
      draft.status = peer.id === threadId ? 'active' : 'archived'
      draft.updatedAt = new Date().toISOString()
    })
  }
  await schedulePersist()
  return chatThreadsCollection.get(threadId)!
}

export async function renameChatThread(threadId: string, title: string) {
  await ensureHydrated()
  const existing = chatThreadsCollection.get(threadId)
  if (!existing) {
    throw new Error(`Chat thread ${threadId} not found`)
  }
  await chatThreadsCollection.update(threadId, (draft) => {
    draft.title = title.trim() || draft.title
    draft.updatedAt = new Date().toISOString()
  })
  await schedulePersist()
  return chatThreadsCollection.get(threadId)!
}

export async function archiveChatThread(threadId: string) {
  await ensureHydrated()
  const existing = chatThreadsCollection.get(threadId)
  if (!existing) {
    return null
  }
  await chatThreadsCollection.update(threadId, (draft) => {
    draft.status = 'archived'
    draft.updatedAt = new Date().toISOString()
  })
  await schedulePersist()
  return chatThreadsCollection.get(threadId)!
}

export async function removeChatThreadRecord(threadId: string) {
  await ensureHydrated()
  const existing = chatThreadsCollection.get(threadId)
  if (!existing) {
    return null
  }
  await chatThreadsCollection.delete(threadId)
  await schedulePersist()
  return existing
}

export async function touchChatThread(threadId: string, updates: { lastMessagePreview?: string; lastMessageAt?: string; incrementCount?: number }) {
  await ensureHydrated()
  const existing = chatThreadsCollection.get(threadId)
  if (!existing) {
    return
  }
  await chatThreadsCollection.update(threadId, (draft) => {
    draft.updatedAt = new Date().toISOString()
    if (updates.lastMessagePreview !== undefined) {
      draft.lastMessagePreview = updates.lastMessagePreview
    }
    if (updates.lastMessageAt !== undefined) {
      draft.lastMessageAt = updates.lastMessageAt
    }
    if (updates.incrementCount) {
      draft.messageCount += updates.incrementCount
    }
  })
  await schedulePersist()
}

export async function clearThreadsForSession(sessionId: SessionId) {
  await ensureHydrated()
  const matches = chatThreadsCollection.toArray.filter((thread) => thread.sessionId === sessionId)
  for (const record of matches) {
    await chatThreadsCollection.delete(record.id)
  }
  await schedulePersist()
}

function deriveDefaultTitle(mode: ChatMode, index = 1) {
  const label = mode === 'session' ? 'Session Coach' : 'General'
  return index <= 1 ? label : `${label} #${index}`
}
