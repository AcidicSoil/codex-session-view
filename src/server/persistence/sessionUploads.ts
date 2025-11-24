import { promises as fs } from 'fs'
import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import { deriveRepoDetailsFromLine, type RepoMetadata } from '~/lib/repo-metadata'

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
}

const sessionUploadsCollection = createCollection(
  localOnlyCollectionOptions<SessionUploadRecord>({
    id: 'session-uploads-store',
    getKey: (record) => record.id,
  }),
)

export async function saveSessionUpload(originalName: string, content: string): Promise<SessionUploadSummary> {
  const repoDetails = deriveRepoDetailsFromContent(content)
  const record: SessionUploadRecord = {
    id: createUploadId(),
    originalName,
    storedAt: new Date().toISOString(),
    size: measureContentSize(content),
    content,
    repoLabel: repoDetails.repoLabel,
    repoMeta: repoDetails.repoMeta,
    source: 'upload',
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
  return {
    id: record.id,
    originalName: record.originalName,
    storedAt: record.storedAt,
    size: record.size,
    url: `/api/uploads/${record.id}`,
    repoLabel: record.repoLabel ?? repoDetails.repoLabel,
    repoMeta: record.repoMeta ?? repoDetails.repoMeta,
    source: record.source,
  }
}

export async function ensureSessionUploadForFile(options: {
  relativePath: string
  absolutePath: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: Extract<SessionAssetSource, 'bundled' | 'external'>
}): Promise<SessionUploadSummary> {
  const normalizedPath = normalizeAbsolutePath(options.absolutePath)
  const stat = await fs.stat(options.absolutePath)
  const updatedAt = stat.mtimeMs
  const existing = findRecordBySource(normalizedPath, options.source)
  if (existing && existing.sourceUpdatedAt === updatedAt) {
    const needsMetadataUpdate = (!!options.repoLabel && !existing.repoLabel) || (!!options.repoMeta && !existing.repoMeta)
    if (needsMetadataUpdate) {
      await sessionUploadsCollection.update(existing.id, (draft) => {
        draft.repoLabel = draft.repoLabel ?? options.repoLabel
        draft.repoMeta = draft.repoMeta ?? options.repoMeta
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

function normalizeAbsolutePath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

function findRecordBySource(absolutePath: string, source: SessionAssetSource) {
  return sessionUploadsCollection.toArray.find((record) => record.sourcePath === absolutePath && record.source === source)
}
