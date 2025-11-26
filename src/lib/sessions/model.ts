import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser'
import { generateId } from '~/utils/id-generator'

export type SessionId = string
export type ChatMode = 'session' | 'general'
export type ChatRole = 'system' | 'user' | 'assistant'

export interface SessionSnapshot {
  sessionId: SessionId
  meta?: SessionMetaParsed
  events: ResponseItemParsed[]
}

export interface SessionEventRange {
  startIndex: number
  endIndex?: number
  startEventId?: string
  endEventId?: string
}

export type MisalignmentSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'
export type MisalignmentStatus = 'new' | 'acknowledged' | 'dismissed'

export interface MisalignmentEvidence {
  message: string
  eventIndex?: number
  eventId?: string
  highlight?: string
}

export interface MisalignmentRecord {
  id: string
  sessionId: SessionId
  ruleId: string
  title: string
  summary: string
  severity: MisalignmentSeverity
  status: MisalignmentStatus
  eventRange?: SessionEventRange
  evidence: MisalignmentEvidence[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessageRecord {
  id: string
  sessionId: SessionId
  mode: ChatMode
  role: ChatRole
  content: string
  clientMessageId?: string
  misalignmentId?: string
  createdAt: string
  updatedAt: string
}

export interface ChatThreadState {
  sessionId: SessionId
  mode: ChatMode
  messages: ChatMessageRecord[]
}

export const MISALIGNMENT_STATUS_TRANSITIONS: Record<MisalignmentStatus, MisalignmentStatus[]> = {
  new: ['acknowledged', 'dismissed'],
  acknowledged: ['dismissed', 'new'],
  dismissed: ['acknowledged', 'new'],
}

export function isValidMisalignmentStatus(value: string): value is MisalignmentStatus {
  return value === 'new' || value === 'acknowledged' || value === 'dismissed'
}

export function canTransitionMisalignmentStatus(current: MisalignmentStatus, next: MisalignmentStatus) {
  return MISALIGNMENT_STATUS_TRANSITIONS[current]?.includes(next) ?? false
}

export function createChatMessageRecord(input: {
  sessionId: SessionId
  mode: ChatMode
  role: ChatRole
  content: string
  clientMessageId?: string
  misalignmentId?: string
  id?: string
  timestamp?: Date
}): ChatMessageRecord {
  const createdAt = (input.timestamp ?? new Date()).toISOString()
  return {
    id: input.id ?? generateId('chat'),
    sessionId: input.sessionId,
    mode: input.mode,
    role: input.role,
    content: input.content,
    clientMessageId: input.clientMessageId,
    misalignmentId: input.misalignmentId,
    createdAt,
    updatedAt: createdAt,
  }
}

export function createMisalignmentRecord(input: {
  sessionId: SessionId
  ruleId: string
  title: string
  summary: string
  severity?: MisalignmentSeverity
  status?: MisalignmentStatus
  evidence?: MisalignmentEvidence[]
  eventRange?: SessionEventRange
  id?: string
  timestamp?: Date
}): MisalignmentRecord {
  const createdAt = (input.timestamp ?? new Date()).toISOString()
  return {
    id: input.id ?? generateId('misalignment'),
    sessionId: input.sessionId,
    ruleId: input.ruleId,
    title: input.title,
    summary: input.summary,
    severity: input.severity ?? 'medium',
    status: input.status ?? 'new',
    eventRange: input.eventRange,
    evidence: input.evidence ?? [],
    createdAt,
    updatedAt: createdAt,
  }
}
