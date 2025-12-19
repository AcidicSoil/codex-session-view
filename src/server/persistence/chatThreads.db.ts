import type { Pool } from 'pg'
import { withConnection } from '~/server/persistence/database'
import type { ChatMode, SessionId } from '~/lib/sessions/model'

export interface ChatThreadRecord {
  id: string
  sessionId: SessionId
  mode: ChatMode
  title: string
  status: 'active' | 'archived'
  messageCount: number
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  createdAt: string
  updatedAt: string
}

async function query(pool: Pool, text: string, params: unknown[] = []) {
  return pool.query({ text, values: params })
}

export async function listChatThreadsDb(sessionId: SessionId, mode?: ChatMode): Promise<ChatThreadRecord[]> {
  return withConnection(async (pool) => {
    const result = await query(
      pool,
      `SELECT id, session_id AS "sessionId", mode, title, status, message_count AS "messageCount",
              last_message_preview AS "lastMessagePreview", last_message_at AS "lastMessageAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
         FROM chat_threads
        WHERE session_id = $1 AND ($2::text IS NULL OR mode = $2)
        ORDER BY updated_at DESC`,
      [sessionId, mode ?? null],
    )
    return result.rows
  })
}

export async function upsertChatThreadDb(record: ChatThreadRecord) {
  return withConnection(async (pool) => {
    await query(
      pool,
      `INSERT INTO chat_threads (id, session_id, mode, title, status, message_count, last_message_preview,
                                 last_message_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id)
         DO UPDATE SET title = EXCLUDED.title,
                       status = EXCLUDED.status,
                       message_count = EXCLUDED.message_count,
                       last_message_preview = EXCLUDED.last_message_preview,
                       last_message_at = EXCLUDED.last_message_at,
                       updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        record.sessionId,
        record.mode,
        record.title,
        record.status,
        record.messageCount,
        record.lastMessagePreview ?? null,
        record.lastMessageAt ?? null,
        record.createdAt,
        record.updatedAt,
      ],
    )
  })
}
