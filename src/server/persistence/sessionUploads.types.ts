import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import type { RepoMetadata } from '~/lib/repo-metadata'
import type { SessionOrigin } from '~/lib/session-origin'
import type { SessionStatus } from '~/lib/sessions/model'

export interface SessionUploadRecord {
  id: string
  sessionId: string
  originalName: string
  storedAt: string
  size: number
  content: string
  status: SessionStatus
  startedAt: string
  completedAt?: string
  lastUpdatedAt: string
  statusReason?: string
  persisted: boolean
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: SessionAssetSource
  sourcePath?: string
  sourceUpdatedAt?: number
  lastModifiedMs?: number
  lastModifiedIso?: string
  workspaceRoot?: string
  origin?: SessionOrigin
}

export interface SessionUploadRecordDetails {
  id: string
  sessionId: string
  originalName: string
  storedAt: string
  source: SessionAssetSource
  sourcePath?: string
  status: SessionStatus
  startedAt: string
  completedAt?: string
  lastUpdatedAt: string
  statusReason?: string
  persisted: boolean
  repoLabel?: string
  repoMeta?: RepoMetadata
  workspaceRoot?: string
  origin?: SessionOrigin
}

export interface SessionUploadSummary {
  id: string
  sessionId: string
  originalName: string
  storedAt: string
  size: number
  url: string
  status: SessionStatus
  statusLabel: string
  startedAt: string
  completedAt?: string
  lastUpdatedAt: string
  statusReason?: string
  persisted: boolean
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: SessionAssetSource
  lastModifiedMs?: number
  lastModifiedIso?: string
  origin?: SessionOrigin
}
