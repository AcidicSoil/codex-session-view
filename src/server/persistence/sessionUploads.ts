import { randomUUID } from 'node:crypto'
import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'

interface SessionUploadRecord {
  id: string
  originalName: string
  storedAt: string
  size: number
  content: string
}

export interface SessionUploadSummary {
  id: string
  originalName: string
  storedAt: string
  size: number
  url: string
}

const sessionUploadsCollection = createCollection(
  localOnlyCollectionOptions<SessionUploadRecord>({
    id: 'session-uploads-store',
    getKey: (record) => record.id,
  }),
)

export async function saveSessionUpload(originalName: string, content: string): Promise<SessionUploadSummary> {
  const record: SessionUploadRecord = {
    id: randomUUID(),
    originalName,
    storedAt: new Date().toISOString(),
    size: Buffer.byteLength(content, 'utf8'),
    content,
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
  return {
    id: record.id,
    originalName: record.originalName,
    storedAt: record.storedAt,
    size: record.size,
    url: `/api/uploads/${record.id}`,
  }
}
