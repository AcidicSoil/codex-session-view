import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'

export interface SessionRepoBindingRecord {
  sessionId: string
  assetPath: string
  rootDir: string
  updatedAt: number
}

const sessionRepoBindingsCollection = createCollection(
  localOnlyCollectionOptions<SessionRepoBindingRecord>({
    id: 'session-repo-bindings',
    getKey: (record) => record.sessionId,
  }),
)

export async function setSessionRepoBinding(binding: {
  sessionId: string
  assetPath: string
  rootDir: string
}) {
  const existing = sessionRepoBindingsCollection.get(binding.sessionId)
  const record: SessionRepoBindingRecord = {
    sessionId: binding.sessionId,
    assetPath: binding.assetPath,
    rootDir: binding.rootDir,
    updatedAt: Date.now(),
  }
  if (existing) {
    await sessionRepoBindingsCollection.update(binding.sessionId, () => record)
    return record
  }
  await sessionRepoBindingsCollection.insert(record)
  return record
}

export function getSessionRepoBinding(sessionId: string): SessionRepoBindingRecord | null {
  return sessionRepoBindingsCollection.get(sessionId) ?? null
}

export async function clearSessionRepoBinding(sessionId: string) {
  if (sessionRepoBindingsCollection.get(sessionId)) {
    await sessionRepoBindingsCollection.delete(sessionId)
  }
}

export async function clearAllSessionRepoBindings() {
  for (const record of sessionRepoBindingsCollection.toArray) {
    await sessionRepoBindingsCollection.delete(record.sessionId)
  }
}

export function listSessionRepoBindings(): SessionRepoBindingRecord[] {
  return [...sessionRepoBindingsCollection.toArray]
}
