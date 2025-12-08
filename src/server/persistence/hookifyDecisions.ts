import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import * as crypto from 'node:crypto'
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

const hookifyDecisionsCollection = createCollection(
  localOnlyCollectionOptions<HookifyDecisionRecord>({
    id: 'hookify-decisions-store',
    getKey: (record) => record.id,
  }),
)

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
  await hookifyDecisionsCollection.insert(record)
  return record
}

export async function listHookifyDecisions(sessionId: string) {
  return hookifyDecisionsCollection.toArray.filter((record) => record.sessionId === sessionId)
}

export async function clearHookifyDecisions() {
  for (const record of hookifyDecisionsCollection.toArray) {
    await hookifyDecisionsCollection.delete(record.id)
  }
}

function hashContent(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex')
}
