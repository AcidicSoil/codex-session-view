import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import fs from 'node:fs'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import type { RepoMetadata } from '~/lib/repo-metadata'
import type { SessionOrigin } from '~/lib/session-origin'
import { deriveSessionIdFromAssetPath } from '~/lib/sessions/session-id'
import type { SessionStatus } from '~/lib/sessions/model'
import {
  createUploadId,
  deriveRepoDetailsFromContent,
  deriveSessionTimestampFromContent,
  ensureUploadOrigin,
  measureContentSize,
  normalizeAbsolutePath,
  resolveAssetPath,
  resolveLastModifiedMs,
  resolveOriginalNameFromAssetPath,
} from './sessionUploads.utils'
import {
  getUploadsDataDir,
  getUploadsFilePath,
  loadPersistedUploads,
  resolveUploadStorageDir,
  writeUploadToDisk,
} from './sessionUploads.storage'
import { toRecordDetails, toRecordView } from './sessionUploads.mappers'
import type { SessionUploadRecord, SessionUploadRecordDetails, SessionUploadSummary } from './sessionUploads.types'

export type { SessionUploadRecordDetails, SessionUploadSummary } from './sessionUploads.types'

type FsModule = typeof import('node:fs/promises')
let fsModulePromise: Promise<FsModule> | null = null
async function loadFsModule(): Promise<FsModule> {
  if (!fsModulePromise) {
    fsModulePromise = import('node:fs/promises')
  }
  return fsModulePromise
}

const DATA_DIR = getUploadsDataDir()
const SESSION_UPLOADS_FILE = getUploadsFilePath()
const SESSION_UPLOADS_DIR = resolveUploadStorageDir()

const initialUploadRecords = loadPersistedUploads()

const sessionUploadsCollection = createCollection(
  localOnlyCollectionOptions<SessionUploadRecord>({
    id: 'session-uploads-store',
    getKey: (record) => record.id,
    initialData: initialUploadRecords,
  }),
)

let writeChain = Promise.resolve()

function schedulePersist() {
  writeChain = writeChain
    .then(async () => {
      await fs.promises.mkdir(DATA_DIR, { recursive: true })
      const snapshot = sessionUploadsCollection.toArray.filter((record) => record.persisted)
      await fs.promises.writeFile(SESSION_UPLOADS_FILE, JSON.stringify(snapshot, null, 2), 'utf8')
    })
    .catch(() => {})
  return writeChain
}

export async function saveSessionUpload(
  originalName: string,
  content: string,
  options?: { persist?: boolean },
): Promise<SessionUploadSummary> {
  const repoDetails = deriveRepoDetailsFromContent(content)
  const lastModifiedMs = resolveLastModifiedMs(deriveSessionTimestampFromContent(content))
  const origin = ensureUploadOrigin(content, 'codex')
  const assetPath = resolveAssetPath(originalName)
  const shouldPersist = options?.persist !== false
  const now = new Date().toISOString()
  let sourcePath: string | undefined
  let sourceUpdatedAt: number | undefined
  if (shouldPersist) {
    const result = await writeUploadToDisk(SESSION_UPLOADS_DIR, originalName, content)
    sourcePath = result.sourcePath
    sourceUpdatedAt = result.sourceUpdatedAt
  }
  const record: SessionUploadRecord = {
    id: createUploadId(),
    sessionId: deriveSessionIdFromAssetPath(assetPath),
    originalName,
    storedAt: now,
    size: measureContentSize(content),
    content,
    status: 'running',
    startedAt: now,
    lastUpdatedAt: now,
    persisted: shouldPersist,
    repoLabel: repoDetails.repoLabel,
    repoMeta: repoDetails.repoMeta,
    source: 'upload',
    sourcePath,
    sourceUpdatedAt,
    lastModifiedMs,
    lastModifiedIso: new Date(lastModifiedMs).toISOString(),
    workspaceRoot: repoDetails.workspaceRoot,
    origin,
  }
  await sessionUploadsCollection.insert(record)
  schedulePersist()
  await finalizeUploadParsing(record.id, assetPath, content)
  const refreshed = sessionUploadsCollection.get(record.id)
  return toRecordView(refreshed ?? record)
}

export async function listSessionUploadRecords(): Promise<SessionUploadSummary[]> {
  return sessionUploadsCollection.toArray.map(toRecordView)
}

export function findSessionUploadRecordByOriginalName(originalName: string): SessionUploadRecordDetails | null {
  const record = sessionUploadsCollection.toArray.find((entry) => entry.originalName === originalName)
  return record ? toRecordDetails(record) : null
}

export function findSessionUploadRecordById(id: string): SessionUploadRecordDetails | null {
  const record = sessionUploadsCollection.get(id)
  return record ? toRecordDetails(record) : null
}

export function getSessionUploadSummaryById(id: string): SessionUploadSummary | null {
  const record = sessionUploadsCollection.get(id)
  return record ? toRecordView(record) : null
}

export function findSessionUploadRecordByAssetPath(assetPath: string): SessionUploadRecordDetails | null {
  const originalName = resolveOriginalNameFromAssetPath(assetPath)
  return findSessionUploadRecordByOriginalName(originalName)
}

export function getSessionUploadSummaryByAssetPath(assetPath: string): SessionUploadSummary | null {
  const originalName = resolveOriginalNameFromAssetPath(assetPath)
  const record = sessionUploadsCollection.toArray.find((entry) => entry.originalName === originalName)
  return record ? toRecordView(record) : null
}

export function getSessionUploadContentByOriginalName(originalName: string) {
  const record = sessionUploadsCollection.toArray.find((entry) => entry.originalName === originalName)
  if (!record) return null
  return record.content
}

export function getSessionUploadContentByAssetPath(assetPath: string) {
  const originalName = resolveOriginalNameFromAssetPath(assetPath)
  return getSessionUploadContentByOriginalName(originalName)
}

export async function clearSessionUploadRecords() {
  for (const record of sessionUploadsCollection.toArray) {
    await sessionUploadsCollection.delete(record.id)
  }
  schedulePersist()
}

export async function updateSessionUploadStatusByAssetPath(
  assetPath: string,
  status: SessionStatus,
  options?: { reason?: string; completedAt?: string },
) {
  const originalName = resolveOriginalNameFromAssetPath(assetPath)
  const record = sessionUploadsCollection.toArray.find((entry) => entry.originalName === originalName)
  if (!record) return null
  const completedAt =
    options?.completedAt ?? (status === 'succeeded' || status === 'failed' ? new Date().toISOString() : undefined)
  await sessionUploadsCollection.update(record.id, (draft) => {
    draft.status = status
    draft.statusReason = options?.reason
    if (completedAt) {
      draft.completedAt = completedAt
    }
    draft.lastUpdatedAt = new Date().toISOString()
  })
  schedulePersist()
  return sessionUploadsCollection.get(record.id) ?? record
}

export async function getSessionUploadContent(id: string) {
  const record = sessionUploadsCollection.get(id)
  if (!record) return null
  return record.content
}

export async function refreshSessionUploadFromSource(id: string): Promise<SessionUploadSummary | null> {
  const record = sessionUploadsCollection.get(id)
  if (!record) {
    return null
  }
  if (!record.sourcePath) {
    throw new Error('Session upload does not track a source file; live updates are unavailable.')
  }
  const fs = await loadFsModule()
  let stat
  try {
    stat = await fs.stat(record.sourcePath)
  } catch {
    throw new Error(`Session source file is missing at ${record.sourcePath}`)
  }
  const content = await fs.readFile(record.sourcePath, 'utf8')
  const derivedRepoDetails = deriveRepoDetailsFromContent(content)
  const sessionTimestampMs = deriveSessionTimestampFromContent(content)
  const canonicalLastModifiedMs = resolveLastModifiedMs(sessionTimestampMs, stat.mtimeMs)
  const canonicalLastModifiedIso = new Date(canonicalLastModifiedMs).toISOString()

  await sessionUploadsCollection.update(id, (draft) => {
    draft.content = content
    draft.size = measureContentSize(content)
    draft.storedAt = new Date().toISOString()
    draft.status = 'queued'
    draft.completedAt = undefined
    draft.repoLabel = draft.repoLabel ?? derivedRepoDetails.repoLabel
    draft.repoMeta = draft.repoMeta ?? derivedRepoDetails.repoMeta
    draft.sourcePath = normalizeAbsolutePath(record.sourcePath!)
    draft.sourceUpdatedAt = stat.mtimeMs
    draft.lastModifiedMs = canonicalLastModifiedMs
    draft.lastModifiedIso = canonicalLastModifiedIso
    draft.lastUpdatedAt = new Date().toISOString()
    if (derivedRepoDetails.workspaceRoot) {
      draft.workspaceRoot = derivedRepoDetails.workspaceRoot
    }
    const updatedOrigin = ensureUploadOrigin(content, draft.origin)
    draft.origin = updatedOrigin ?? draft.origin
  })
  schedulePersist()

  const refreshed = sessionUploadsCollection.get(id)
  return refreshed ? toRecordView(refreshed) : null
}

export async function ensureSessionUploadForFile(options: {
  relativePath: string
  absolutePath: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: SessionAssetSource
  sessionTimestampMs?: number
  origin?: SessionOrigin
}): Promise<SessionUploadSummary> {
  const fs = await loadFsModule()
  const normalizedPath = normalizeAbsolutePath(options.absolutePath)
  const stat = await fs.stat(options.absolutePath)
  const updatedAt = stat.mtimeMs
  const canonicalLastModifiedMs = resolveLastModifiedMs(options.sessionTimestampMs, updatedAt)
  const canonicalLastModifiedIso = new Date(canonicalLastModifiedMs).toISOString()
  const existing = findRecordBySource(normalizedPath, options.source)
  const content = await fs.readFile(options.absolutePath, 'utf8')
  const derivedRepoDetails = deriveRepoDetailsFromContent(content)
  const resolvedRepoLabel = options.repoLabel ?? derivedRepoDetails.repoLabel
  const resolvedRepoMeta = options.repoMeta ?? derivedRepoDetails.repoMeta
  const fileOrigin = options.origin ?? ensureUploadOrigin(content, 'codex')
  if (existing && existing.sourceUpdatedAt === updatedAt) {
    const needsMetadataUpdate = (!!resolvedRepoLabel && !existing.repoLabel) || (!!resolvedRepoMeta && !existing.repoMeta)
    const needsTimestampUpdate =
      existing.lastModifiedMs !== canonicalLastModifiedMs || existing.lastModifiedIso !== canonicalLastModifiedIso
    const needsWorkspaceUpdate = !!derivedRepoDetails.workspaceRoot && !existing.workspaceRoot
    const needsOriginUpdate = !!fileOrigin && existing.origin !== fileOrigin
    const assetPath = resolveAssetPath(options.relativePath)
    const needsSessionId = existing.sessionId !== deriveSessionIdFromAssetPath(assetPath)
    if (needsMetadataUpdate || needsTimestampUpdate || needsWorkspaceUpdate || needsOriginUpdate || needsSessionId) {
      await sessionUploadsCollection.update(existing.id, (draft) => {
        draft.repoLabel = draft.repoLabel ?? resolvedRepoLabel
        draft.repoMeta = draft.repoMeta ?? resolvedRepoMeta
        if (needsSessionId) {
          draft.sessionId = deriveSessionIdFromAssetPath(assetPath)
        }
        if (needsWorkspaceUpdate) {
          draft.workspaceRoot = derivedRepoDetails.workspaceRoot
        }
        if (needsTimestampUpdate) {
          draft.lastModifiedMs = canonicalLastModifiedMs
          draft.lastModifiedIso = canonicalLastModifiedIso
          draft.lastUpdatedAt = new Date().toISOString()
        }
        if (needsOriginUpdate && fileOrigin) {
          draft.origin = fileOrigin
        }
      })
      schedulePersist()
      const refreshed = sessionUploadsCollection.get(existing.id)
      if (refreshed) {
        return toRecordView(refreshed)
      }
    }
    return toRecordView(existing)
  }

  const size = measureContentSize(content)
  if (existing) {
    await sessionUploadsCollection.update(existing.id, (draft) => {
      draft.sessionId = deriveSessionIdFromAssetPath(resolveAssetPath(options.relativePath))
      draft.originalName = options.relativePath
      draft.size = size
      draft.content = content
      draft.storedAt = new Date().toISOString()
      draft.status = 'queued'
      draft.completedAt = undefined
      draft.repoLabel = resolvedRepoLabel ?? draft.repoLabel
      draft.repoMeta = resolvedRepoMeta ?? draft.repoMeta
      draft.source = options.source
      draft.sourcePath = normalizedPath
      draft.sourceUpdatedAt = updatedAt
      draft.lastModifiedMs = canonicalLastModifiedMs
      draft.lastModifiedIso = canonicalLastModifiedIso
      draft.lastUpdatedAt = new Date().toISOString()
      if (derivedRepoDetails.workspaceRoot) {
        draft.workspaceRoot = derivedRepoDetails.workspaceRoot
      }
      if (fileOrigin) {
        draft.origin = fileOrigin
      }
    })
    schedulePersist()
    const refreshed = sessionUploadsCollection.get(existing.id)
    if (!refreshed) {
      throw new Error('Failed to refresh session upload record')
    }
    return toRecordView(refreshed)
  }

  const assetPath = resolveAssetPath(options.relativePath)
  const record: SessionUploadRecord = {
    id: createUploadId(),
    sessionId: deriveSessionIdFromAssetPath(assetPath),
    originalName: options.relativePath,
    storedAt: new Date().toISOString(),
    size,
    content,
    status: 'queued',
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    persisted: options.source !== 'upload',
    repoLabel: resolvedRepoLabel,
    repoMeta: resolvedRepoMeta,
    source: options.source,
    sourcePath: normalizedPath,
    sourceUpdatedAt: updatedAt,
    lastModifiedMs: canonicalLastModifiedMs,
    lastModifiedIso: canonicalLastModifiedIso,
    workspaceRoot: derivedRepoDetails.workspaceRoot,
    origin: fileOrigin,
  }
  await sessionUploadsCollection.insert(record)
  schedulePersist()
  return toRecordView(record)
}

async function finalizeUploadParsing(uploadId: string, assetPath: string, content: string) {
  try {
    const { ensureSessionSnapshotFromContent } = await import('./sessionSnapshots.server')
    const record = sessionUploadsCollection.get(uploadId)
    await ensureSessionSnapshotFromContent({
      sessionId: deriveSessionIdFromAssetPath(assetPath),
      assetPath,
      content,
      source: 'upload',
      persisted: record?.persisted ?? true,
    })
    await sessionUploadsCollection.update(uploadId, (draft) => {
      draft.status = 'succeeded'
      draft.completedAt = new Date().toISOString()
      draft.lastUpdatedAt = new Date().toISOString()
      draft.statusReason = undefined
    })
  } catch (error) {
    await sessionUploadsCollection.update(uploadId, (draft) => {
      draft.status = 'failed'
      draft.completedAt = new Date().toISOString()
      draft.lastUpdatedAt = new Date().toISOString()
      draft.statusReason = error instanceof Error ? error.message : 'Failed to parse session'
    })
  } finally {
    schedulePersist()
  }
}

function findRecordBySource(absolutePath: string, source: SessionAssetSource) {
  return sessionUploadsCollection.toArray.find((record) => record.sourcePath === absolutePath && record.source === source)
}
