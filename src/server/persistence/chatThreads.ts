import type { QueryResult } from 'pg'
import type { ChatMode, SessionId } from '~/lib/sessions/model'
import { generateId } from '~/utils/id-generator'
import { dbQuery, getDatabasePool, runInTransaction } from '~/server/persistence/database'

export type ChatThreadStatus = 'active' | 'archived'

export interface ChatThreadRecord {
  id: string
  sessionId: SessionId
  mode: ChatMode
  title: string
  status: ChatThreadStatus
  messageCount: number
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  createdAt: string
  updatedAt: string
}

const THREAD_COLUMNS = `
  id,
  session_id AS "sessionId",
  mode,
  title,
  status,
  message_count AS "messageCount",
  last_message_preview AS "lastMessagePreview",
  last_message_at AS "lastMessageAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

type QueryExecutor = {
  query: (text: string, params?: unknown[]) => Promise<QueryResult<any>>
}

export async function listChatThreads(sessionId: SessionId, mode?: ChatMode) {
  const result = await dbQuery<ChatThreadRecord>(
    `SELECT ${THREAD_COLUMNS}
       FROM chat_threads
      WHERE session_id = $1 AND ($2::text IS NULL OR mode = $2)
      ORDER BY updated_at DESC`,
    [sessionId, mode ?? null],
  )
  return result.rows
}

export async function getChatThreadById(id: string) {
  const result = await dbQuery<ChatThreadRecord>(
    `SELECT ${THREAD_COLUMNS}
       FROM chat_threads
      WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

export async function getActiveChatThread(sessionId: SessionId, mode: ChatMode) {
  const result = await dbQuery<ChatThreadRecord>(
    `SELECT ${THREAD_COLUMNS}
       FROM chat_threads
      WHERE session_id = $1 AND mode = $2 AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1`,
    [sessionId, mode],
  )
  if (result.rowCount > 0) {
    return result.rows[0]
  }
  return await createChatThread({ sessionId, mode })
}

export async function startNewChatThread(sessionId: SessionId, mode: ChatMode) {
  return await runInTransaction(async (client) => {
    const active = await client.query<{ id: string }>(
      `SELECT id FROM chat_threads WHERE session_id = $1 AND mode = $2 AND status = 'active' FOR UPDATE`,
      [sessionId, mode],
    )
    if (active.rowCount > 0) {
      await client.query(`UPDATE chat_threads SET status = 'archived', updated_at = NOW() WHERE id = $1`, [active.rows[0].id])
    }
    return await createChatThread({ sessionId, mode, status: 'active' }, client)
  })
}

export async function setActiveChatThread(threadId: string) {
  return await runInTransaction(async (client) => {
    const target = await fetchThreadById(threadId, client)
    if (!target) {
      throw new Error(`Chat thread ${threadId} not found`)
    }
    await client.query(
      `UPDATE chat_threads
          SET status = CASE WHEN id = $1 THEN 'active' ELSE 'archived' END,
              updated_at = NOW()
        WHERE session_id = $2 AND mode = $3`,
      [threadId, target.sessionId, target.mode],
    )
    const refreshed = await fetchThreadById(threadId, client)
    if (!refreshed) {
      throw new Error(`Chat thread ${threadId} not found after activation`)
    }
    return refreshed
  })
}

export async function renameChatThread(threadId: string, title: string) {
  const trimmed = title.trim()
  if (!trimmed) {
    return await getChatThreadById(threadId)
  }
  await dbQuery(
    `UPDATE chat_threads
        SET title = $2,
            updated_at = NOW()
      WHERE id = $1`,
    [threadId, trimmed],
  )
  return await getChatThreadById(threadId)
}

export async function archiveChatThread(threadId: string) {
  await dbQuery(`UPDATE chat_threads SET status = 'archived', updated_at = NOW() WHERE id = $1`, [threadId])
  return await getChatThreadById(threadId)
}

export async function removeChatThreadRecord(threadId: string) {
  const existing = await getChatThreadById(threadId)
  if (!existing) {
    return null
  }
  await dbQuery(`DELETE FROM chat_threads WHERE id = $1`, [threadId])
  return existing
}

export async function touchChatThread(
  threadId: string,
  updates: { lastMessagePreview?: string; lastMessageAt?: string; incrementCount?: number },
) {
  await dbQuery(
    `UPDATE chat_threads
        SET updated_at = NOW(),
            last_message_preview = COALESCE($2, last_message_preview),
            last_message_at = COALESCE($3, last_message_at),
            message_count = message_count + COALESCE($4, 0)
      WHERE id = $1`,
    [threadId, updates.lastMessagePreview ?? null, updates.lastMessageAt ?? null, updates.incrementCount ?? 0],
  )
}

export async function resetChatThreadMessages(threadId: string) {
  await dbQuery(
    `UPDATE chat_threads
        SET message_count = 0,
            last_message_preview = NULL,
            last_message_at = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [threadId],
  )
  return await getChatThreadById(threadId)
}

export async function clearThreadsForSession(sessionId: SessionId) {
  await dbQuery(`DELETE FROM chat_threads WHERE session_id = $1`, [sessionId])
}

interface CreateChatThreadInput {
  sessionId: SessionId
  mode: ChatMode
  title?: string
  status?: ChatThreadStatus
}

async function createChatThread(input: CreateChatThreadInput, executor?: QueryExecutor) {
  const db = executor ?? getDatabasePool()
  const count = await getThreadCount(input.sessionId, input.mode, db)
  const now = new Date().toISOString()
  const id = generateId('thread')
  const title = input.title ?? deriveDefaultTitle(input.mode, count + 1)
  const result: QueryResult<ChatThreadRecord> = await db.query(
    `INSERT INTO chat_threads (id, session_id, mode, title, status, message_count, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,0,$6,$7)
     RETURNING ${THREAD_COLUMNS}`,
    [id, input.sessionId, input.mode, title, input.status ?? 'active', now, now],
  )
  return result.rows[0]
}

async function getThreadCount(sessionId: SessionId, mode: ChatMode, executor: QueryExecutor) {
  const result = await executor.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM chat_threads WHERE session_id = $1 AND mode = $2`, [
    sessionId,
    mode,
  ])
  const count = result.rows[0]?.count ?? '0'
  return Number.parseInt(count, 10)
}

async function fetchThreadById(id: string, executor: QueryExecutor) {
  const result: QueryResult<ChatThreadRecord> = await executor.query(
    `SELECT ${THREAD_COLUMNS}
       FROM chat_threads
      WHERE id = $1
      FOR UPDATE`,
    [id],
  )
  return result.rows[0] ?? null
}

function deriveDefaultTitle(mode: ChatMode, index = 1) {
  const label = mode === 'session' ? 'Session Coach' : 'General'
  return index <= 1 ? label : `${label} #${index}`
}
