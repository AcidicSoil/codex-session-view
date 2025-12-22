import path from 'node:path'
import { deriveRepoDetailsFromLine, deriveSessionTimestampMs, type RepoMetadata } from '~/lib/repo-metadata'
import { detectSessionOriginFromContent, type SessionOrigin } from '~/lib/session-origin'
import { deriveSessionIdFromAssetPath } from '~/lib/sessions/session-id'
import type { SessionStatus } from '~/lib/sessions/model'
import type { SessionUploadRecord } from './sessionUploads.types'

const SESSION_UPLOADS_ASSET_PREFIX = 'uploads/'

export function createUploadId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `upload_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function resolveAssetPath(originalName: string) {
  const trimmed = originalName.replace(/^[\\/]+/, '')
  return `${SESSION_UPLOADS_ASSET_PREFIX}${trimmed}`
}

export function resolveOriginalNameFromAssetPath(assetPath: string) {
  const normalized = assetPath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (normalized.startsWith(SESSION_UPLOADS_ASSET_PREFIX)) {
    return normalized.slice(SESSION_UPLOADS_ASSET_PREFIX.length)
  }
  return normalized
}

export function formatStatusLabel(status: SessionStatus) {
  switch (status) {
    case 'queued':
      return 'Queued'
    case 'running':
      return 'Running'
    case 'succeeded':
      return 'Succeeded'
    case 'failed':
      return 'Failed'
    default:
      return 'Unknown'
  }
}

export function measureContentSize(content: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(content).length
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(content, 'utf8')
  }
  return content.length
}

export function deriveRepoDetailsFromContent(content: string): {
  repoLabel?: string
  repoMeta?: RepoMetadata
  workspaceRoot?: string
} {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  if (!firstLine) return {}
  const details = deriveRepoDetailsFromLine(firstLine)
  if (details.workspaceRoot) {
    return {
      ...details,
      workspaceRoot: normalizeWorkspaceRootPath(details.workspaceRoot),
    }
  }
  return details
}

export function deriveSessionTimestampFromContent(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? ''
  if (!firstLine) return undefined
  return deriveSessionTimestampMs(firstLine)
}

export function resolveLastModifiedMs(preferred?: number, fallback?: number) {
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

export function normalizeTimestamp(value: number | undefined) {
  if (typeof value !== 'number') return undefined
  if (!Number.isFinite(value)) return undefined
  const rounded = Math.round(value)
  return Number.isFinite(rounded) ? rounded : undefined
}

export function normalizeAbsolutePath(targetPath: string) {
  return targetPath.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function normalizeWorkspaceRootPath(input?: string) {
  if (!input) return undefined
  const trimmed = input.trim()
  if (!trimmed) return undefined
  let resolved = trimmed
  if (trimmed.startsWith('~')) {
    const home = process.env.HOME ?? process.env.USERPROFILE
    if (home) {
      resolved = path.join(home, trimmed.slice(1))
    }
  }
  if (!path.isAbsolute(resolved)) {
    resolved = path.resolve(resolved)
  }
  return normalizeAbsolutePath(resolved)
}

export function normalizeUploadRecord(record: SessionUploadRecord | null | undefined): SessionUploadRecord | null {
  if (!record || !record.id || !record.originalName) {
    return null
  }
  const storedAt = record.storedAt ?? new Date().toISOString()
  const assetPath = resolveAssetPath(record.originalName)
  const sessionId = record.sessionId ?? deriveSessionIdFromAssetPath(assetPath)
  const startedAt = record.startedAt ?? storedAt
  const lastUpdatedAt = record.lastUpdatedAt ?? storedAt
  const status: SessionStatus = record.status ?? 'succeeded'
  return {
    ...record,
    sessionId,
    storedAt,
    startedAt,
    lastUpdatedAt,
    status,
    persisted: record.persisted ?? true,
  }
}

export function resolveLastModifiedIso(value?: number) {
  if (typeof value !== 'number') return undefined
  return new Date(value).toISOString()
}

export function ensureUploadOrigin(content: string, fallback?: SessionOrigin) {
  return detectSessionOriginFromContent(content, { defaultOrigin: fallback ?? 'codex' })
}
