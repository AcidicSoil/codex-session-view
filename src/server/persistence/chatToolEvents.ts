import { dbQuery } from '~/server/persistence/database'
import {
  createChatToolEventRecord,
  markChatToolEventResult,
  type ChatToolEventRecord,
  type ChatToolEventStatus,
} from '~/lib/chatbot/toolEvents'

export interface ChatToolEventRepository {
  listBySession(sessionId: string): Promise<ChatToolEventRecord[]>
  insert(input: {
    sessionId: string
    threadId?: string | null
    toolCallId?: string | null
    toolName: string
    arguments: unknown
    contextEvents?: ChatToolEventRecord['contextEvents']
  }): Promise<ChatToolEventRecord>
  updateStatus(
    id: string,
    status: ChatToolEventStatus,
    updates?: { result?: unknown; error?: string; contextEvents?: ChatToolEventRecord['contextEvents'] },
  ): Promise<ChatToolEventRecord>
  updateStatusByToolCall?: (
    toolCallId: string,
    status: ChatToolEventStatus,
    updates?: { result?: unknown; error?: string; contextEvents?: ChatToolEventRecord['contextEvents'] },
  ) => Promise<ChatToolEventRecord | null>
}

const EVENT_COLUMNS = `
  id,
  session_id AS "sessionId",
  thread_id AS "threadId",
  tool_call_id AS "toolCallId",
  tool_name AS "toolName",
  arguments,
  status,
  result,
  error,
  context_events AS "contextEvents",
  duration_ms AS "latencyMs",
  started_at AS "startedAt",
  completed_at AS "completedAt"
`

export const postgresChatToolEventRepository: ChatToolEventRepository = {
  async listBySession(sessionId) {
    const result = await dbQuery<ChatToolEventRecord>(
      `SELECT ${EVENT_COLUMNS}
         FROM chat_tool_events
        WHERE session_id = $1
        ORDER BY started_at ASC`,
      [sessionId],
    )
    return result.rows
  },

  async insert(input) {
    const record = createChatToolEventRecord(input)
    const inserted = await dbQuery<ChatToolEventRecord>(
      `INSERT INTO chat_tool_events (id, session_id, thread_id, tool_call_id, tool_name, arguments, status, context_events, started_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING ${EVENT_COLUMNS}`,
      [
        record.id,
        record.sessionId,
        record.threadId,
        record.toolCallId,
        record.toolName,
        toJsonb(record.arguments),
        record.status,
        toJsonb(record.contextEvents),
        record.startedAt,
      ],
    )
    return inserted.rows[0]
  },

  async updateStatus(id, status, updates = {}) {
    const existing = await getEventById(id)
    if (!existing) {
      throw new Error(`Tool event ${id} not found`)
    }
    const updatedRecord = markChatToolEventResult(existing, {
      status,
      result: updates.result,
      error: updates.error,
      contextEvents: updates.contextEvents,
    })
    const result = await dbQuery<ChatToolEventRecord>(
      `UPDATE chat_tool_events
          SET status = $2,
              result = $3,
              error = $4,
              context_events = $5,
              duration_ms = $6,
              completed_at = $7
        WHERE id = $1
        RETURNING ${EVENT_COLUMNS}`,
      [
        updatedRecord.id,
        updatedRecord.status,
        toJsonb(updatedRecord.result),
        updatedRecord.error ?? null,
        toJsonb(updatedRecord.contextEvents),
        updatedRecord.latencyMs ?? null,
        updatedRecord.completedAt ?? null,
      ],
    )
    return result.rows[0]
  },

  async updateStatusByToolCall(toolCallId, status, updates = {}) {
    if (!toolCallId) {
      return null
    }
    const target = await findEventByToolCall(toolCallId)
    if (!target) {
      return null
    }
    return await postgresChatToolEventRepository.updateStatus(target.id, status, updates)
  },
}

export function getChatToolEventRepository(): ChatToolEventRepository {
  return postgresChatToolEventRepository
}

export async function listChatToolEvents(sessionId: string) {
  return postgresChatToolEventRepository.listBySession(sessionId)
}

export async function insertChatToolEvent(input: {
  sessionId: string
  threadId?: string | null
  toolCallId?: string | null
  toolName: string
  arguments: unknown
  contextEvents?: ChatToolEventRecord['contextEvents']
}) {
  return postgresChatToolEventRepository.insert(input)
}

export async function updateChatToolEventStatus(
  id: string,
  status: ChatToolEventStatus,
  updates: { result?: unknown; error?: string; contextEvents?: ChatToolEventRecord['contextEvents'] } = {},
) {
  return postgresChatToolEventRepository.updateStatus(id, status, updates)
}

async function getEventById(id: string) {
  const result = await dbQuery<ChatToolEventRecord>(`SELECT ${EVENT_COLUMNS} FROM chat_tool_events WHERE id = $1`, [id])
  return result.rows[0] ?? null
}

async function findEventByToolCall(toolCallId: string) {
  const result = await dbQuery<ChatToolEventRecord>(`SELECT ${EVENT_COLUMNS} FROM chat_tool_events WHERE tool_call_id = $1`, [toolCallId])
  return result.rows[0] ?? null
}

function toJsonb(value: unknown | null | undefined) {
  if (value === undefined || value === null) {
    return null
  }
  return JSON.stringify(value)
}
