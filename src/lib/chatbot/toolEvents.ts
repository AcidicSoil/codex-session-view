import { generateId } from '~/utils/id-generator'
import type { ChatEventReference } from '~/lib/sessions/model'

export type ChatToolEventStatus = 'pending' | 'executing' | 'succeeded' | 'failed'

export interface ChatToolEventRecord {
  id: string
  sessionId: string
  threadId: string | null
  toolCallId: string | null
  toolName: string
  status: ChatToolEventStatus
  arguments: unknown
  result?: unknown
  error?: string
  startedAt: string
  completedAt?: string
  latencyMs?: number
  contextEvents?: ChatEventReference[]
}

export function createChatToolEventRecord(input: {
  sessionId: string
  threadId?: string | null
  toolCallId?: string | null
  toolName: string
  arguments: unknown
  status?: ChatToolEventStatus
  contextEvents?: ChatEventReference[]
  timestamp?: Date
  id?: string
}): ChatToolEventRecord {
  const now = input.timestamp ?? new Date()
  return {
    id: input.id ?? generateId('tool'),
    sessionId: input.sessionId,
    threadId: input.threadId ?? null,
    toolCallId: input.toolCallId ?? null,
    toolName: input.toolName,
    arguments: input.arguments,
    status: input.status ?? 'executing',
    startedAt: now.toISOString(),
    contextEvents: input.contextEvents,
  }
}

export function markChatToolEventResult(
  record: ChatToolEventRecord,
  update: {
    status: ChatToolEventStatus
    result?: unknown
    error?: string
    completedAt?: Date
    contextEvents?: ChatEventReference[]
  },
): ChatToolEventRecord {
  const completedAt = (update.completedAt ?? new Date()).toISOString()
  return {
    ...record,
    status: update.status,
    result: update.result,
    error: update.error,
    completedAt,
    latencyMs: new Date(completedAt).getTime() - new Date(record.startedAt).getTime(),
    contextEvents: update.contextEvents ?? record.contextEvents,
  }
}
