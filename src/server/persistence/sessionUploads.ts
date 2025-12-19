import path from 'node:path'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import { deriveRepoDetailsFromLine, deriveSessionTimestampMs, type RepoMetadata } from '~/lib/repo-metadata'
import { detectSessionOriginFromContent, type SessionOrigin } from '~/lib/session-origin'
import { dbQuery } from '~/server/persistence/database'

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
  repoLabel?: string | null
  repoMeta?: RepoMetadata | null
  source: SessionAssetSource
  sourcePath?: string | null
  sourceUpdatedAt?: number | null
  workspaceRoot?: string | null
  origin?: SessionOrigin | null
  lastModifiedAt?: string | null
}

export interface SessionUploadRecordDetails {
  id: string
  originalName: string
  storedAt: string
  source: SessionAssetSource
  sourcePath?: string | null
  repoLabel?: string | null
  repoMeta?: RepoMetadata | null
  workspaceRoot?: string | null
  origin?: SessionOrigin | null
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
  origin?: SessionOrigin | null
}

const UPLOAD_COLUMNS = `
  id,
  original_name AS "originalName",
  stored_at AS "storedAt",
  size,
  content,
  repo_label AS "repoLabel",
  repo_meta AS "repoMeta",
  source,
  source_path AS "sourcePath",
  source_updated_at AS "sourceUpdatedAt",
  workspace_root AS "workspaceRoot",
  origin,
  last_modified_at AS "lastModifiedAt"
`

export async function saveSessionUpload(originalName: string, content: string): Promise<SessionUploadSummary> {
  const repoDetails = deriveRepoDetailsFromContent(content)
  const lastModifiedMs = resolveLastModifiedMs(deriveSessionTimestampFromContent(content))
  const origin = detectSessionOriginFromContent(content, { defaultOrigin: 'codex' })
  const storedAt = new Date().toISOString()
  const result = await dbQuery<SessionUploadRecord>(
    `INSERT INTO session_uploads (
        id,
        original_name,
        size,
        content,
        repo_label,
        repo_meta,
        source,
        stored_at,
        last_modified_at,
        workspace_root,
        origin
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING ${UPLOAD_COLUMNS}`,
    [
      createUploadId(),
      originalName,
      measureContentSize(content),
      content,
      repoDetails.repoLabel ?? null,
      repoDetails.repoMeta ?? null,
      'upload',
      storedAt,
      new Date(lastModifiedMs).toISOString(),
      repoDetails.workspaceRoot ?? null,
      origin ?? null,
    ],
  )
  return toRecordView(result.rows[0])
}

export async function listSessionUploadRecords(): Promise<SessionUploadSummary[]> {
  const result = await dbQuery<SessionUploadRecord>(`SELECT ${UPLOAD_COLUMNS} FROM session_uploads ORDER BY stored_at DESC`)
  return result.rows.map(toRecordView)
}

export async function findSessionUploadRecordByOriginalName(originalName: string): Promise<SessionUploadRecordDetails | null> {
  const result = await dbQuery<SessionUploadRecord>(
    `SELECT ${UPLOAD_COLUMNS}
       FROM session_uploads
      WHERE original_name = $1
      LIMIT 1`,
    [originalName],
  )
  const record = result.rows[0]
  return record ? toRecordDetails(record) : null
}

export async function findSessionUploadRecordById(id: string): Promise<SessionUploadRecordDetails | null> {
  const record = await getUploadById(id)
  return record ? toRecordDetails(record) : null
}

export async function getSessionUploadSummaryById(id: string): Promise<SessionUploadSummary | null> {
  const record = await getUploadById(id)
  return record ? toRecordView(record) : null
}

export async function getSessionUploadContentByOriginalName(originalName: string) {
  const result = await dbQuery<{ content: string }>(`SELECT content FROM session_uploads WHERE original_name = $1 LIMIT 1`, [
    originalName,
  ])
  return result.rows[0]?.content ?? null
}

export async function clearSessionUploadRecords() {
  await dbQuery(`DELETE FROM session_uploads`)
}

export async function getSessionUploadContent(id: string) {
  const result = await dbQuery<{ content: string }>(`SELECT content FROM session_uploads WHERE id = $1`, [id])
  return result.rows[0]?.content ?? null
}

export async function refreshSessionUploadFromSource(id: string): Promise<SessionUploadSummary | null> {
  const record = await getUploadById(id)
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

  await dbQuery(
    `UPDATE session_uploads
        SET content = $2,
            size = $3,
            stored_at = $4,
            repo_label = COALESCE(repo_label, $5),
            repo_meta = COALESCE(repo_meta, $6),
            source_path = $7,
            source_updated_at = $8,
            last_modified_at = $9,
            workspace_root = COALESCE(workspace_root, $10),
            origin = COALESCE($11, origin)
      WHERE id = $1`,
    [
      id,
      content,
      measureContentSize(content),
      new Date().toISOString(),
      derivedRepoDetails.repoLabel ?? null,
      derivedRepoDetails.repoMeta ?? null,
      normalizeAbsolutePath(record.sourcePath),
      stat.mtimeMs,
      canonicalLastModifiedIso,
      derivedRepoDetails.workspaceRoot ?? null,
      detectSessionOriginFromContent(content, { defaultOrigin: record.origin ?? 'codex' }) ?? record.origin ?? null,
    ],
  )

  const refreshed = await getUploadById(id)
  return refreshed ? toRecordView(refreshed) : null
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
  const existing = await findRecordBySource(normalizedPath, options.source)
  const content = await fs.readFile(options.absolutePath, 'utf8')
  const derivedRepoDetails = deriveRepoDetailsFromContent(content)
  const resolvedRepoLabel = options.repoLabel ?? derivedRepoDetails.repoLabel
  const resolvedRepoMeta = options.repoMeta ?? derivedRepoDetails.repoMeta
  const fileOrigin = options.origin ?? detectSessionOriginFromContent(content, { defaultOrigin: 'codex' })

  if (existing && existing.sourceUpdatedAt === updatedAt) {
    const needsMetadataUpdate = (!!resolvedRepoLabel && !existing.repoLabel) || (!!resolvedRepoMeta && !existing.repoMeta)
    const needsTimestampUpdate = !existing.lastModifiedAt || existing.lastModifiedAt !== canonicalLastModifiedIso
    const needsWorkspaceUpdate = !!derivedRepoDetails.workspaceRoot && !existing.workspaceRoot
    const needsOriginUpdate = !!fileOrigin && existing.origin !== fileOrigin
    if (needsMetadataUpdate || needsTimestampUpdate || needsWorkspaceUpdate || needsOriginUpdate) {
      await dbQuery(
        `UPDATE session_uploads
            SET repo_label = COALESCE(repo_label, $2),
                repo_meta = COALESCE(repo_meta, $3),
                workspace_root = COALESCE(workspace_root, $4),
                last_modified_at = $5,
                origin = COALESCE($6, origin)
          WHERE id = $1`,
        [
          existing.id,
          resolvedRepoLabel ?? null,
          resolvedRepoMeta ?? null,
          derivedRepoDetails.workspaceRoot ?? null,
          canonicalLastModifiedIso,
          fileOrigin ?? null,
        ],
      )
      const refreshed = await getUploadById(existing.id)
      if (refreshed) {
        return toRecordView(refreshed)
      }
    }
    return toRecordView(existing)
  }

  const size = measureContentSize(content)
  if (existing) {
    await dbQuery(
      `UPDATE session_uploads
          SET original_name = $2,
              size = $3,
              content = $4,
              stored_at = $5,
              repo_label = COALESCE($6, repo_label),
              repo_meta = COALESCE($7, repo_meta),
              source = $8,
              source_path = $9,
              source_updated_at = $10,
              last_modified_at = $11,
              workspace_root = COALESCE($12, workspace_root),
              origin = COALESCE($13, origin)
        WHERE id = $1`,
      [
        existing.id,
        options.relativePath,
        size,
        content,
        new Date().toISOString(),
        resolvedRepoLabel ?? null,
        resolvedRepoMeta ?? null,
        options.source,
        normalizedPath,
        updatedAt,
        canonicalLastModifiedIso,
        derivedRepoDetails.workspaceRoot ?? null,
        fileOrigin ?? null,
      ],
    )
    const refreshed = await getUploadById(existing.id)
    if (!refreshed) {
      throw new Error('Failed to refresh session upload record')
    }
    return toRecordView(refreshed)
  }

  const inserted = await dbQuery<SessionUploadRecord>(
    `INSERT INTO session_uploads (
        id,
        original_name,
        size,
        content,
        repo_label,
        repo_meta,
        source,
        source_path,
        source_updated_at,
        stored_at,
        last_modified_at,
        workspace_root,
        origin
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING ${UPLOAD_COLUMNS}`,
    [
      createUploadId(),
      options.relativePath,
      size,
      content,
      resolvedRepoLabel ?? null,
      resolvedRepoMeta ?? null,
      options.source,
      normalizedPath,
      updatedAt,
      new Date().toISOString(),
      canonicalLastModifiedIso,
      derivedRepoDetails.workspaceRoot ?? null,
      fileOrigin ?? null,
    ],
  )
  return toRecordView(inserted.rows[0])
}

function createUploadId() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
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

function normalizeAbsolutePath(inputPath: string) {
  return inputPath.replace(/\\/g, '/').replace(/\/+$/, '')
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

async function findRecordBySource(absolutePath: string, source: SessionAssetSource) {
  const result = await dbQuery<SessionUploadRecord>(
    `SELECT ${UPLOAD_COLUMNS}
       FROM session_uploads
      WHERE source_path = $1 AND source = $2
      LIMIT 1`,
    [absolutePath, source],
  )
  return result.rows[0] ?? null
}

async function getUploadById(id: string) {
  const result = await dbQuery<SessionUploadRecord>(`SELECT ${UPLOAD_COLUMNS} FROM session_uploads WHERE id = $1`, [id])
  return result.rows[0] ?? null
}

function toRecordView(record: SessionUploadRecord): SessionUploadSummary {
  const needsRepoDetails = !record.repoLabel || !record.repoMeta
  const repoDetails = needsRepoDetails ? deriveRepoDetailsFromContent(record.content) : {}
  const lastModifiedMs = resolveLastModifiedMs(record.lastModifiedAt ? Date.parse(record.lastModifiedAt) : undefined, Date.parse(record.storedAt))
  const lastModifiedIso = record.lastModifiedAt ?? new Date(lastModifiedMs).toISOString()
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
    origin: record.origin ?? null,
  }
}

function toRecordDetails(record: SessionUploadRecord): SessionUploadRecordDetails {
  return {
    id: record.id,
    originalName: record.originalName,
    storedAt: record.storedAt,
    source: record.source,
    sourcePath: record.sourcePath ?? undefined,
    repoLabel: record.repoLabel ?? undefined,
    repoMeta: record.repoMeta ?? undefined,
    workspaceRoot: record.workspaceRoot ?? undefined,
    origin: record.origin ?? undefined,
  }
}
