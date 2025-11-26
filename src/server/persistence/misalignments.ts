import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import {
  canTransitionMisalignmentStatus,
  createMisalignmentRecord,
  isValidMisalignmentStatus,
  type MisalignmentRecord,
  type MisalignmentStatus,
  type SessionId,
} from '~/lib/sessions/model'

const misalignmentsCollection = createCollection(
  localOnlyCollectionOptions<MisalignmentRecord>({
    id: 'misalignments-store',
    getKey: (record) => record.id,
  }),
)

export async function listMisalignments(sessionId: SessionId): Promise<MisalignmentRecord[]> {
  return misalignmentsCollection.toArray
    .filter((item) => item.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function upsertMisalignment(record: MisalignmentRecord) {
  const existing = misalignmentsCollection.get(record.id)
  if (existing) {
    await misalignmentsCollection.update(record.id, (draft) => {
      draft.ruleId = record.ruleId
      draft.title = record.title
      draft.summary = record.summary
      draft.severity = record.severity
      draft.status = record.status
      draft.eventRange = record.eventRange
      draft.evidence = record.evidence
      draft.updatedAt = new Date().toISOString()
    })
    return misalignmentsCollection.get(record.id) ?? record
  }
  await misalignmentsCollection.insert(record)
  return record
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
  const existing = misalignmentsCollection.get(id)
  if (!existing || existing.sessionId !== sessionId) {
    throw new Error('Misalignment not found')
  }
  if (!canTransitionMisalignmentStatus(existing.status, nextStatus)) {
    throw new Error(`Cannot transition misalignment from ${existing.status} to ${nextStatus}`)
  }
  await misalignmentsCollection.update(id, (draft) => {
    draft.status = nextStatus
    draft.updatedAt = new Date().toISOString()
  })
  return misalignmentsCollection.get(id)
}

export async function clearMisalignments() {
  for (const record of misalignmentsCollection.toArray) {
    await misalignmentsCollection.delete(record.id)
  }
}

export function getMisalignmentsCollection() {
  return misalignmentsCollection
}
