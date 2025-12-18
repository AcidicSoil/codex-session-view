import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createChatToolEventRecord,
  markChatToolEventResult,
  type ChatToolEventRecord,
  type ChatToolEventStatus,
} from '~/lib/chatbot/toolEvents'
import { logError } from '~/lib/logger'

const toolEventsCollection = createCollection(
  localOnlyCollectionOptions<ChatToolEventRecord>({
    id: 'chat-tool-events',
    getKey: (record) => record.id,
  }),
)

const DATA_DIR = path.join(process.cwd(), 'data')
const TOOL_EVENTS_FILE = path.join(DATA_DIR, 'chat-tool-events.json')

let hydrated = false
let hydrationPromise: Promise<void> | null = null
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
    const raw = await fs.readFile(TOOL_EVENTS_FILE, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error?.code === 'ENOENT') {
        return '[]'
      }
      throw error
    })
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const record of parsed) {
        if (!record?.id) continue
        if (!toolEventsCollection.get(record.id)) {
          await toolEventsCollection.insert(record as ChatToolEventRecord)
        }
      }
    }
  } catch (error) {
    logError('chatToolEvents.hydrate', 'Unable to hydrate tool events store', error as Error)
  } finally {
    hydrated = true
    isHydrating = false
  }
}

function schedulePersist() {
  if (isHydrating) {
    return writeChain
  }
  writeChain = writeChain
    .then(async () => {
      await fs.mkdir(DATA_DIR, { recursive: true })
      await fs.writeFile(TOOL_EVENTS_FILE, JSON.stringify([...toolEventsCollection.toArray], null, 2), 'utf8')
    })
    .catch((error) => {
      logError('chatToolEvents.persist', 'Failed to persist tool events', error as Error)
    })
  return writeChain
}

export async function listChatToolEvents(sessionId: string) {
  await ensureHydrated()
  return toolEventsCollection.toArray
    .filter((record) => record.sessionId === sessionId)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

export async function insertChatToolEvent(input: {
  sessionId: string
  threadId?: string | null
  toolCallId?: string | null
  toolName: string
  arguments: unknown
  contextEvents?: ChatToolEventRecord['contextEvents']
}) {
  await ensureHydrated()
  const record = createChatToolEventRecord(input)
  await toolEventsCollection.insert(record)
  await schedulePersist()
  return record
}

export async function updateChatToolEventStatus(id: string, status: ChatToolEventStatus, updates: { result?: unknown; error?: string } = {}) {
  await ensureHydrated()
  const existing = toolEventsCollection.get(id)
  if (!existing) {
    throw new Error(`Tool event ${id} not found`)
  }
  const updated = markChatToolEventResult(existing, { status, result: updates.result, error: updates.error })
  await toolEventsCollection.update(id, () => updated)
  await schedulePersist()
  return updated
}
