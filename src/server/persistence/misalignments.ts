import { dbQuery } from '~/server/persistence/database'
import {
  canTransitionMisalignmentStatus,
  createMisalignmentRecord,
  isValidMisalignmentStatus,
  type MisalignmentRecord,
  type MisalignmentStatus,
  type SessionId,
} from '~/lib/sessions/model'

const MISALIGNMENT_COLUMNS = `
  id,
  session_id AS "sessionId",
  rule_id AS "ruleId",
  title,
  summary,
  severity,
  status,
  event_range AS "eventRange",
  evidence,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export async function listMisalignments(sessionId: SessionId): Promise<MisalignmentRecord[]> {
  const result = await dbQuery<MisalignmentRecord>(
    `SELECT ${MISALIGNMENT_COLUMNS}
       FROM misalignments
      WHERE session_id = $1
      ORDER BY created_at ASC`,
    [sessionId],
  )
  return result.rows
}

export async function upsertMisalignment(record: MisalignmentRecord) {
  const createdAt = record.createdAt ?? new Date().toISOString()
  const updatedAt = new Date().toISOString()
  const result = await dbQuery<MisalignmentRecord>(
    `INSERT INTO misalignments (id, session_id, rule_id, title, summary, severity, status, event_range, evidence, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id)
     DO UPDATE SET rule_id = EXCLUDED.rule_id,
                   title = EXCLUDED.title,
                   summary = EXCLUDED.summary,
                   severity = EXCLUDED.severity,
                   status = EXCLUDED.status,
                   event_range = EXCLUDED.event_range,
                   evidence = EXCLUDED.evidence,
                   updated_at = EXCLUDED.updated_at
     RETURNING ${MISALIGNMENT_COLUMNS}`,
    [
      record.id,
      record.sessionId,
      record.ruleId,
      record.title,
      record.summary,
      record.severity,
      record.status,
      record.eventRange ?? null,
      record.evidence ?? [],
      createdAt,
      updatedAt,
    ],
  )
  return result.rows[0]
}

export async function ingestMisalignmentCandidates(sessionId: SessionId, candidates: MisalignmentRecord[]) {
  for (const candidate of candidates) {
    if (candidate.sessionId === sessionId) {
      await upsertMisalignment(candidate)
      continue
    }
    await upsertMisalignment(
      createMisalignmentRecord({
        sessionId,
        ruleId: candidate.ruleId,
        title: candidate.title,
        summary: candidate.summary,
        severity: candidate.severity,
        status: candidate.status,
        evidence: candidate.evidence,
        eventRange: candidate.eventRange,
        id: candidate.id,
      }),
    )
  }
}

export async function updateMisalignmentStatus(sessionId: SessionId, id: string, nextStatus: MisalignmentStatus) {
  if (!isValidMisalignmentStatus(nextStatus)) {
    throw new Error(`Invalid misalignment status: ${nextStatus}`)
  }
  const existing = await getMisalignmentById(id)
  if (!existing || existing.sessionId !== sessionId) {
    throw new Error('Misalignment not found')
  }
  if (!canTransitionMisalignmentStatus(existing.status, nextStatus)) {
    throw new Error(`Cannot transition misalignment from ${existing.status} to ${nextStatus}`)
  }
  await dbQuery(
    `UPDATE misalignments
        SET status = $2,
            updated_at = NOW()
      WHERE id = $1`,
    [id, nextStatus],
  )
  const record = await getMisalignmentById(id)
  return { record: record ?? existing, previousStatus: existing.status }
}

export async function clearMisalignments() {
  await dbQuery(`DELETE FROM misalignments`)
}

async function getMisalignmentById(id: string) {
  const result = await dbQuery<MisalignmentRecord>(`SELECT ${MISALIGNMENT_COLUMNS} FROM misalignments WHERE id = $1`, [id])
  return result.rows[0] ?? null
}
