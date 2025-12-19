import * as crypto from 'node:crypto'
import { dbQuery } from '~/server/persistence/database'
import { generateId } from '~/utils/id-generator'
import type { MisalignmentSeverity } from '~/lib/sessions/model'
import type { HookSource, HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'

export interface HookifyDecisionRecord {
  id: string
  sessionId: string
  source: HookSource
  contentHash: string
  severity: HookDecisionSeverity
  blocked: boolean
  rules: Array<{ id: string; severity: MisalignmentSeverity }>
  message?: string
  annotations?: string
  createdAt: string
}

const DECISION_COLUMNS = `
  id,
  session_id AS "sessionId",
  source,
  content_hash AS "contentHash",
  severity,
  blocked,
  rules,
  message,
  annotations,
  created_at AS "createdAt"
`

export async function recordHookifyDecision(input: {
  sessionId: string
  source: HookSource
  severity: HookDecisionSeverity
  blocked: boolean
  rules: HookRuleSummary[]
  message?: string
  annotations?: string
  content: string
}) {
  const createdAt = new Date().toISOString()
  const record: HookifyDecisionRecord = {
    id: generateId('hook'),
    sessionId: input.sessionId,
    source: input.source,
    contentHash: hashContent(input.content),
    severity: input.severity,
    blocked: input.blocked,
    rules: input.rules.map((rule) => ({ id: rule.id, severity: rule.severity })),
    message: input.message,
    annotations: input.annotations,
    createdAt,
  }
  const result = await dbQuery<HookifyDecisionRecord>(
    `INSERT INTO hookify_decisions (id, session_id, source, content_hash, severity, blocked, rules, message, annotations, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING ${DECISION_COLUMNS}`,
    [
      record.id,
      record.sessionId,
      record.source,
      record.contentHash,
      record.severity,
      record.blocked,
      record.rules,
      record.message ?? null,
      record.annotations ?? null,
      record.createdAt,
    ],
  )
  return result.rows[0]
}

export async function listHookifyDecisions(sessionId: string) {
  const result = await dbQuery<HookifyDecisionRecord>(
    `SELECT ${DECISION_COLUMNS}
       FROM hookify_decisions
      WHERE session_id = $1
      ORDER BY created_at ASC`,
    [sessionId],
  )
  return result.rows
}

export async function clearHookifyDecisions() {
  await dbQuery(`DELETE FROM hookify_decisions`)
}

function hashContent(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex')
}
