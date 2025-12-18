import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import path from 'node:path'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import { deriveRepoDetailsFromLine, deriveSessionTimestampMs, type RepoMetadata } from '~/lib/repo-metadata'
import { detectSessionOriginFromContent, type SessionOrigin } from '~/lib/session-origin'

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
  workspaceRoot?: string
  origin?: SessionOrigin
}

export interface SessionUploadRecordDetails {
  id: string
  originalName: string
  storedAt: string
  source: SessionAssetSource
  sourcePath?: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  workspaceRoot?: string
  origin?: SessionOrigin
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
  origin?: SessionOrigin
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
  const origin = detectSessionOriginFromContent(content, { defaultOrigin: 'codex' })
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
    workspaceRoot: repoDetails.workspaceRoot,
    origin,
  }
  await sessionUploadsCollection.insert(record)
  return toRecordView(record)
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

export function getSessionUploadContentByOriginalName(originalName: string) {
  const record = sessionUploadsCollection.toArray.find((entry) => entry.originalName === originalName)
  if (!record) return null
  return record.content
}

export async function clearSessionUploadRecords() {
  for (const record of sessionUploadsCollection.toArray) {
    await sessionUploadsCollection.delete(record.id)
  }
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
    draft.repoLabel = draft.repoLabel ?? derivedRepoDetails.repoLabel
    draft.repoMeta = draft.repoMeta ?? derivedRepoDetails.repoMeta
    draft.sourcePath = normalizeAbsolutePath(record.sourcePath!)
    draft.sourceUpdatedAt = stat.mtimeMs
    draft.lastModifiedMs = canonicalLastModifiedMs
    draft.lastModifiedIso = canonicalLastModifiedIso
    if (derivedRepoDetails.workspaceRoot) {
      draft.workspaceRoot = derivedRepoDetails.workspaceRoot
    }
    const updatedOrigin =
      detectSessionOriginFromContent(content, { defaultOrigin: draft.origin ?? 'codex' }) ?? draft.origin
    draft.origin = updatedOrigin
  })

  const refreshed = sessionUploadsCollection.get(id)
  return refreshed ? toRecordView(refreshed) : null
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
    origin: record.origin,
  }
}

function toRecordDetails(record: SessionUploadRecord): SessionUploadRecordDetails {
  return {
    id: record.id,
    originalName: record.originalName,
    storedAt: record.storedAt,
    source: record.source,
    sourcePath: record.sourcePath,
    repoLabel: record.repoLabel,
    repoMeta: record.repoMeta,
    workspaceRoot: record.workspaceRoot,
    origin: record.origin,
  }
}

export async function ensureSessionUploadForFile(options: {
  relativePath: string
  absolutePath: string
  repoLabel?: string
  repoMeta?: RepoMetadata
  source: Extract<SessionAssetSource, 'bundled' | 'external'>
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
  const fileOrigin = options.origin ?? detectSessionOriginFromContent(content, { defaultOrigin: 'codex' })
  if (existing && existing.sourceUpdatedAt === updatedAt) {
    const needsMetadataUpdate = (!!resolvedRepoLabel && !existing.repoLabel) || (!!resolvedRepoMeta && !existing.repoMeta)
    const needsTimestampUpdate =
      existing.lastModifiedMs !== canonicalLastModifiedMs || existing.lastModifiedIso !== canonicalLastModifiedIso
    const needsWorkspaceUpdate = !!derivedRepoDetails.workspaceRoot && !existing.workspaceRoot
    const needsOriginUpdate = !!fileOrigin && existing.origin !== fileOrigin
    if (needsMetadataUpdate || needsTimestampUpdate || needsWorkspaceUpdate || needsOriginUpdate) {
      await sessionUploadsCollection.update(existing.id, (draft) => {
        draft.repoLabel = draft.repoLabel ?? resolvedRepoLabel
        draft.repoMeta = draft.repoMeta ?? resolvedRepoMeta
        if (needsWorkspaceUpdate) {
          draft.workspaceRoot = derivedRepoDetails.workspaceRoot
        }
        if (needsTimestampUpdate) {
          draft.lastModifiedMs = canonicalLastModifiedMs
          draft.lastModifiedIso = canonicalLastModifiedIso
        }
        if (needsOriginUpdate && fileOrigin) {
          draft.origin = fileOrigin
        }
      })
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
      draft.originalName = options.relativePath
      draft.size = size
      draft.content = content
      draft.storedAt = new Date().toISOString()
      draft.repoLabel = resolvedRepoLabel ?? draft.repoLabel
      draft.repoMeta = resolvedRepoMeta ?? draft.repoMeta
      draft.source = options.source
      draft.sourcePath = normalizedPath
      draft.sourceUpdatedAt = updatedAt
      draft.lastModifiedMs = canonicalLastModifiedMs
      draft.lastModifiedIso = canonicalLastModifiedIso
      if (derivedRepoDetails.workspaceRoot) {
        draft.workspaceRoot = derivedRepoDetails.workspaceRoot
      }
      if (fileOrigin) {
        draft.origin = fileOrigin
      }
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
  const details = deriveRepoDetailsFromLine(firstLine)
  if (details.workspaceRoot) {
    return {
      ...details,
      workspaceRoot: normalizeWorkspaceRootPath(details.workspaceRoot),
    }
  }
  return details
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

function normalizeWorkspaceRootPath(input?: string) {
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

function findRecordBySource(absolutePath: string, source: SessionAssetSource) {
  return sessionUploadsCollection.toArray.find((record) => record.sourcePath === absolutePath && record.source === source)
}
