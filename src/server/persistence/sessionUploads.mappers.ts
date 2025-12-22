import { deriveRepoDetailsFromContent, formatStatusLabel, resolveLastModifiedMs } from './sessionUploads.utils'
import type { SessionUploadRecord, SessionUploadRecordDetails, SessionUploadSummary } from './sessionUploads.types'

export function toRecordView(record: SessionUploadRecord): SessionUploadSummary {
  const needsRepoDetails = !record.repoLabel || !record.repoMeta
  const repoDetails = needsRepoDetails ? deriveRepoDetailsFromContent(record.content) : {}
  const lastModifiedMs = resolveLastModifiedMs(record.lastModifiedMs, Date.parse(record.storedAt))
  const lastModifiedIso = record.lastModifiedIso ?? new Date(lastModifiedMs).toISOString()
  return {
    id: record.id,
    sessionId: record.sessionId,
    originalName: record.originalName,
    storedAt: record.storedAt,
    size: record.size,
    url: `/api/uploads/${record.id}`,
    status: record.status,
    statusLabel: formatStatusLabel(record.status),
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    lastUpdatedAt: record.lastUpdatedAt,
    statusReason: record.statusReason,
    persisted: record.persisted,
    repoLabel: record.repoLabel ?? repoDetails.repoLabel,
    repoMeta: record.repoMeta ?? repoDetails.repoMeta,
    source: record.source,
    lastModifiedMs,
    lastModifiedIso,
    origin: record.origin,
  }
}

export function toRecordDetails(record: SessionUploadRecord): SessionUploadRecordDetails {
  return {
    id: record.id,
    sessionId: record.sessionId,
    originalName: record.originalName,
    storedAt: record.storedAt,
    source: record.source,
    sourcePath: record.sourcePath,
    status: record.status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    lastUpdatedAt: record.lastUpdatedAt,
    statusReason: record.statusReason,
    persisted: record.persisted,
    repoLabel: record.repoLabel,
    repoMeta: record.repoMeta,
    workspaceRoot: record.workspaceRoot,
    origin: record.origin,
  }
}
