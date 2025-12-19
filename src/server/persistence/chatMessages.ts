import type { QueryResult } from 'pg'
import {
  createChatMessageRecord,
  type ChatMessageEvidence,
  type ChatMessageRecord,
  type ChatMode,
  type SessionId,
} from '~/lib/sessions/model'
import { dbQuery } from '~/server/persistence/database'
import {
  getActiveChatThread,
  setActiveChatThread,
  startNewChatThread,
  touchChatThread,
  type ChatThreadRecord,
} from '~/server/persistence/chatThreads'

const MESSAGE_COLUMNS = `
  id,
  session_id AS "sessionId",
  thread_id AS "threadId",
  mode,
  role,
  content,
  client_message_id AS "clientMessageId",
  misalignment_id AS "misalignmentId",
  evidence,
  context_events AS "contextEvents",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export async function listChatMessages(sessionId: SessionId, mode: ChatMode, threadId?: string): Promise<ChatMessageRecord[]> {
  const targetThreadId = await resolveThreadId(sessionId, mode, threadId)
  const result = await dbQuery<ChatMessageRecord>(
    `SELECT ${MESSAGE_COLUMNS}
       FROM chat_messages
      WHERE session_id = $1 AND mode = $2 AND thread_id = $3
      ORDER BY created_at ASC`,
    [sessionId, mode, targetThreadId],
  )
  return result.rows
}

export async function listChatMessagesByThread(threadId: string): Promise<ChatMessageRecord[]> {
  const result = await dbQuery<ChatMessageRecord>(
    `SELECT ${MESSAGE_COLUMNS}
       FROM chat_messages
      WHERE thread_id = $1
      ORDER BY created_at ASC`,
    [threadId],
  )
  return result.rows
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
  const targetThreadId = await resolveThreadId(input.sessionId, input.mode, input.threadId)
  if (input.clientMessageId) {
    const existing = await findMessageByClientId(input.sessionId, input.mode, targetThreadId, input.clientMessageId)
    if (existing) {
      return existing
    }
  }
  const record = createChatMessageRecord({ ...input, threadId: targetThreadId })
  try {
    const inserted = await insertChatMessage(record)
    await touchChatThread(targetThreadId, {
      lastMessagePreview: record.content.slice(0, 280),
      lastMessageAt: record.createdAt,
      incrementCount: 1,
    })
    return inserted
  } catch (error) {
    if (isUniqueViolation(error) && input.clientMessageId) {
      const fallback = await findMessageByClientId(input.sessionId, input.mode, targetThreadId, input.clientMessageId)
      if (fallback) {
        return fallback
      }
    }
    throw error
  }
}

export async function resetChatThread(sessionId: SessionId, mode: ChatMode) {
  await startNewChatThread(sessionId, mode)
}

export async function activateChatThread(sessionId: SessionId, mode: ChatMode, threadId: string) {
  const thread = await getThreadById(threadId)
  if (!thread || thread.sessionId !== sessionId || thread.mode !== mode) {
    throw new Error('Thread does not match session/mode')
  }
  await setActiveChatThread(threadId)
}

export async function updateChatMessage(id: string, apply: (draft: ChatMessageRecord) => void) {
  const existing = await getMessageById(id)
  if (!existing) {
    throw new Error(`Chat message ${id} not found`)
  }
  const draft: ChatMessageRecord = { ...existing }
  apply(draft)
  draft.updatedAt = new Date().toISOString()
  const result = await dbQuery<ChatMessageRecord>(
    `UPDATE chat_messages
        SET content = $2,
            evidence = $3,
            context_events = $4,
            misalignment_id = $5,
            updated_at = $6
      WHERE id = $1
      RETURNING ${MESSAGE_COLUMNS}`,
    [
      draft.id,
      draft.content,
      toJsonb(draft.evidence),
      toJsonb(draft.contextEvents),
      draft.misalignmentId ?? null,
      draft.updatedAt,
    ],
  )
  return result.rows[0]
}

export async function clearChatMessages() {
  await dbQuery(`DELETE FROM chat_messages`)
}

export async function deleteMessagesForThread(threadId: string) {
  await dbQuery(`DELETE FROM chat_messages WHERE thread_id = $1`, [threadId])
}

async function resolveThreadId(sessionId: SessionId, mode: ChatMode, preferred?: string) {
  if (preferred) return preferred
  const thread = await getActiveChatThread(sessionId, mode)
  return thread.id
}

async function insertChatMessage(record: ChatMessageRecord) {
  const result: QueryResult<ChatMessageRecord> = await dbQuery(
    `INSERT INTO chat_messages (id, session_id, thread_id, mode, role, content, client_message_id, misalignment_id, evidence, context_events, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${MESSAGE_COLUMNS}`,
    [
      record.id,
      record.sessionId,
      record.threadId,
      record.mode,
      record.role,
      record.content,
      record.clientMessageId ?? null,
      record.misalignmentId ?? null,
      toJsonb(record.evidence),
      toJsonb(record.contextEvents),
      record.createdAt,
      record.updatedAt,
    ],
  )
  return result.rows[0]
}

async function findMessageByClientId(sessionId: SessionId, mode: ChatMode, threadId: string, clientMessageId: string) {
  const result = await dbQuery<ChatMessageRecord>(
    `SELECT ${MESSAGE_COLUMNS}
       FROM chat_messages
      WHERE session_id = $1 AND mode = $2 AND thread_id = $3 AND client_message_id = $4`,
    [sessionId, mode, threadId, clientMessageId],
  )
  return result.rows[0] ?? null
}

async function getMessageById(id: string) {
  const result = await dbQuery<ChatMessageRecord>(
    `SELECT ${MESSAGE_COLUMNS}
       FROM chat_messages
      WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

async function getThreadById(id: string): Promise<ChatThreadRecord | null> {
  const result = await dbQuery<ChatThreadRecord>(
    `SELECT id,
            session_id AS "sessionId",
            mode,
            title,
            status,
            message_count AS "messageCount",
            last_message_preview AS "lastMessagePreview",
            last_message_at AS "lastMessageAt",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
       FROM chat_threads
      WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

function toJsonb(value: unknown | null | undefined) {
  if (value === undefined || value === null) {
    return null
  }
  return JSON.stringify(value)
}

function isUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505'
}
