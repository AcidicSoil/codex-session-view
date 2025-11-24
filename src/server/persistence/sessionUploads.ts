import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import { deriveRepoDetailsFromLine, deriveSessionTimestampMs, type RepoMetadata } from '~/lib/repo-metadata'

type FsModule = typeof import('node:fs/promises')
let fsModulePromise: Promise<FsModule> | null = null
async function loadFsModule(): Promise<FsModule> {
  if (!fsModulePromise) {
    fsModulePromise = import('node:fs/promises')
  }
  return fsModulePromise
}

interface SessionUploadRecord {
  id: string
  originalName: string
  storedAt: string
  size: number
  content: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: SessionAssetSource
  sourcePath?: string
  sourceUpdatedAt?: number
  lastModifiedMs?: number
  lastModifiedIso?: string
}

export interface SessionUploadSummary {
  id: string
  originalName: string
  storedAt: string
  size: number
  url: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: SessionAssetSource
  lastModifiedMs?: number
  lastModifiedIso?: string
}

const sessionUploadsCollection = createCollection(
  localOnlyCollectionOptions<SessionUploadRecord>({
    id: 'session-uploads-store',
    getKey: (record) => record.id,
  }),
)

export async function saveSessionUpload(originalName: string, content: string): Promise<SessionUploadSummary> {
  const repoDetails = deriveRepoDetailsFromContent(content)
  const lastModifiedMs = resolveLastModifiedMs(deriveSessionTimestampFromContent(content))
  const record: SessionUploadRecord = {
    id: createUploadId(),
    originalName,
    storedAt: new Date().toISOString(),
    size: measureContentSize(content),
    content,
    repoLabel: repoDetails.repoLabel,
    repoMeta: repoDetails.repoMeta,
    source: 'upload',
    lastModifiedMs,
    lastModifiedIso: new Date(lastModifiedMs).toISOString(),
  }
  await sessionUploadsCollection.insert(record)
  return toRecordView(record)
}

export async function listSessionUploadRecords(): Promise<SessionUploadSummary[]> {
  return sessionUploadsCollection.toArray.map(toRecordView)
}

export async function getSessionUploadContent(id: string) {
  const record = sessionUploadsCollection.get(id)
  if (!record) return null
  return record.content
}

function toRecordView(record: SessionUploadRecord): SessionUploadSummary {
  const needsRepoDetails = !record.repoLabel || !record.repoMeta
  const repoDetails = needsRepoDetails ? deriveRepoDetailsFromContent(record.content) : {}
  const lastModifiedMs = resolveLastModifiedMs(record.lastModifiedMs, Date.parse(record.storedAt))
  const lastModifiedIso = record.lastModifiedIso ?? new Date(lastModifiedMs).toISOString()
  return {
    id: record.id,
    originalName: record.originalName,
    storedAt: record.storedAt,
    size: record.size,
    url: `/api/uploads/${record.id}`,
    repoLabel: record.repoLabel ?? repoDetails.repoLabel,
    repoMeta: record.repoMeta ?? repoDetails.repoMeta,
    source: record.source,
    lastModifiedMs,
    lastModifiedIso,
  }
}

export async function ensureSessionUploadForFile(options: {
  relativePath: string
  absolutePath: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: Extract<SessionAssetSource, 'bundled' | 'external'>
  sessionTimestampMs?: number
}): Promise<SessionUploadSummary> {
  const fs = await loadFsModule()
  const normalizedPath = normalizeAbsolutePath(options.absolutePath)
  const stat = await fs.stat(options.absolutePath)
  const updatedAt = stat.mtimeMs
  const canonicalLastModifiedMs = resolveLastModifiedMs(options.sessionTimestampMs, updatedAt)
  const canonicalLastModifiedIso = new Date(canonicalLastModifiedMs).toISOString()
  const existing = findRecordBySource(normalizedPath, options.source)
  if (existing && existing.sourceUpdatedAt === updatedAt) {
    const needsMetadataUpdate = (!!options.repoLabel && !existing.repoLabel) || (!!options.repoMeta && !existing.repoMeta)
    const needsTimestampUpdate =
      existing.lastModifiedMs !== canonicalLastModifiedMs || existing.lastModifiedIso !== canonicalLastModifiedIso
    if (needsMetadataUpdate || needsTimestampUpdate) {
      await sessionUploadsCollection.update(existing.id, (draft) => {
        draft.repoLabel = draft.repoLabel ?? options.repoLabel
        draft.repoMeta = draft.repoMeta ?? options.repoMeta
        if (needsTimestampUpdate) {
          draft.lastModifiedMs = canonicalLastModifiedMs
          draft.lastModifiedIso = canonicalLastModifiedIso
        }
      })
      const refreshed = sessionUploadsCollection.get(existing.id)
      if (refreshed) {
        return toRecordView(refreshed)
      }
    }
    return toRecordView(existing)
  }

  const content = await fs.readFile(options.absolutePath, 'utf8')
  const size = measureContentSize(content)
  if (existing) {
    await sessionUploadsCollection.update(existing.id, (draft) => {
      draft.originalName = options.relativePath
      draft.size = size
      draft.content = content
      draft.storedAt = new Date().toISOString()
      draft.repoLabel = options.repoLabel ?? draft.repoLabel
      draft.repoMeta = options.repoMeta ?? draft.repoMeta
      draft.source = options.source
      draft.sourcePath = normalizedPath
      draft.sourceUpdatedAt = updatedAt
      draft.lastModifiedMs = canonicalLastModifiedMs
      draft.lastModifiedIso = canonicalLastModifiedIso
    })
    const refreshed = sessionUploadsCollection.get(existing.id)
    if (!refreshed) {
      throw new Error('Failed to refresh session upload record')
    }
    return toRecordView(refreshed)
  }

  const record: SessionUploadRecord = {
    id: createUploadId(),
    originalName: options.relativePath,
    storedAt: new Date().toISOString(),
    size,
    content,
    repoLabel: options.repoLabel,
    repoMeta: options.repoMeta,
    source: options.source,
    sourcePath: normalizedPath,
    sourceUpdatedAt: updatedAt,
    lastModifiedMs: canonicalLastModifiedMs,
    lastModifiedIso: canonicalLastModifiedIso,
  }
  await sessionUploadsCollection.insert(record)
  return toRecordView(record)
}

function createUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `upload_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

function measureContentSize(content: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).length
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(content, 'utf8')
  }
  return content.length
}

function deriveRepoDetailsFromContent(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  if (!firstLine) return {}
  return deriveRepoDetailsFromLine(firstLine)
}

function deriveSessionTimestampFromContent(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  if (!firstLine) return undefined
  return deriveSessionTimestampMs(firstLine)
}

function resolveLastModifiedMs(preferred?: number, fallback?: number) {
  const normalizedPreferred = normalizeTimestamp(preferred)
  if (typeof normalizedPreferred === 'number') {
    return normalizedPreferred
  }
  const normalizedFallback = normalizeTimestamp(fallback)
  if (typeof normalizedFallback === 'number') {
    return normalizedFallback
  }
  return Date.now()
}

function normalizeTimestamp(value: number | undefined) {
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value)) return undefined
  const rounded = Math.round(value)
  return Number.isFinite(rounded) ? rounded : undefined
}

function normalizeAbsolutePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

function findRecordBySource(absolutePath: string, source: SessionAssetSource) {
  return sessionUploadsCollection.toArray.find((record) => record.sourcePath === absolutePath && record.source === source)
}
