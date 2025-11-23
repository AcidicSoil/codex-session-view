import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import { deriveRepoDetailsFromLine, type RepoMetadata } from '~/lib/repo-metadata'

interface SessionUploadRecord {
  id: string
  originalName: string
  storedAt: string
  size: number
  content: string
  repoLabel?: string
  repoMeta?: RepoMetadata
}

export interface SessionUploadSummary {
  id: string
  originalName: string
  storedAt: string
  size: number
  url: string
  repoLabel?: string
  repoMeta?: RepoMetadata
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
  }
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
