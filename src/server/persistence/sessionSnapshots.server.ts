import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import fs from 'node:fs'
import path from 'node:path'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import type { SessionId, SessionSnapshot } from '~/lib/sessions/model'
import type { SessionMetaParsed, ResponseItemParsed } from '~/lib/session-parser'
import { parseSessionToArrays } from '~/lib/session-parser/streaming'
import { logError } from '~/lib/logger'

export interface SessionSnapshotRecord {
  sessionId: SessionId
  assetPath: string
  source: SessionAssetSource
  persisted: boolean
  meta?: SessionMetaParsed
  events: ResponseItemParsed[]
  eventCount: number
  createdAt: string
  updatedAt: string
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SNAPSHOT_FILE = path.join(DATA_DIR, 'session-snapshots.json')

const initialSnapshots = loadPersistedSnapshots()

const sessionSnapshotsCollection = createCollection(
  localOnlyCollectionOptions<SessionSnapshotRecord>({
    id: 'session-snapshots-store',
    getKey: (record) => record.sessionId,
    initialData: initialSnapshots,
  }),
)

let writeChain = Promise.resolve()

function schedulePersist() {
  writeChain = writeChain
    .then(async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true })
      const snapshot = sessionSnapshotsCollection.toArray.filter((record) => record.persisted)
      await fs.promises.writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
    })
    .catch((error) => {
      logError('sessionSnapshots.persist', 'Failed to persist session snapshots', error as Error)
    })
  return writeChain
}

export function getSessionSnapshotRecord(sessionId: SessionId): SessionSnapshotRecord | null {
  return sessionSnapshotsCollection.get(sessionId) ?? null
}

export function getSessionSnapshot(sessionId: SessionId): SessionSnapshot | null {
  const record = sessionSnapshotsCollection.get(sessionId)
  if (!record) return null
  return {
    sessionId: record.sessionId,
    meta: record.meta,
    events: record.events,
  }
}

export async function upsertSessionSnapshot(record: SessionSnapshotRecord) {
  const existing = sessionSnapshotsCollection.get(record.sessionId)
  if (existing) {
    await sessionSnapshotsCollection.update(record.sessionId, () => record)
  } else {
    await sessionSnapshotsCollection.insert(record)
  }
  schedulePersist()
  return record
}

export async function ensureSessionSnapshotFromContent(options: {
  sessionId: SessionId
  assetPath: string
  content: string
  source: SessionAssetSource
  persisted?: boolean
}): Promise<SessionSnapshotRecord> {
  const blob = new Blob([options.content], { type: 'application/json' })
  const result = await parseSessionToArrays(blob)
  if (!result.meta || !Array.isArray(result.events)) {
    throw new Error('Session content could not be parsed into a snapshot')
  }
  const now = new Date().toISOString()
  const record: SessionSnapshotRecord = {
    sessionId: options.sessionId,
    assetPath: options.assetPath,
    source: options.source,
    persisted: options.persisted ?? true,
    meta: result.meta,
    events: result.events,
    eventCount: result.events.length,
    createdAt: getSessionSnapshotRecord(options.sessionId)?.createdAt ?? now,
    updatedAt: now,
  }
  await upsertSessionSnapshot(record)
  return record
}

export async function clearSessionSnapshots() {
  for (const record of sessionSnapshotsCollection.toArray) {
    await sessionSnapshotsCollection.delete(record.sessionId)
  }
  schedulePersist()
}

function loadPersistedSnapshots(): SessionSnapshotRecord[] {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) {
      return []
    }
    const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf8')
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((record) => record && record.sessionId && record.assetPath)
      .map((record) => ({ ...record, persisted: record.persisted ?? true })) as SessionSnapshotRecord[]
  } catch {
    return []
  }
}
