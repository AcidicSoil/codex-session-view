import path from 'node:path'
import { access } from 'node:fs/promises'
import type { SessionAssetSource } from '~/lib/viewerDiscovery'
import { findSessionUploadRecordByOriginalName } from '~/server/persistence/sessionUploads'

export type RepoRootMissingReason = 'missing-file-path' | 'asset-not-found' | 'no-source-path'

interface RepoRootCacheEntry {
  rootDir: string | null
  reason?: RepoRootMissingReason
  source?: SessionAssetSource
}

export interface RepoRootResolution {
  rootDir: string | null
  reason?: RepoRootMissingReason
  source?: SessionAssetSource
  assetPath?: string
}

const assetRootCache = new Map<string, RepoRootCacheEntry>()

export async function resolveRepoRootForAssetPath(assetPath: string | undefined): Promise<RepoRootResolution> {
  const originalName = normalizeAssetName(assetPath)
  if (!originalName) {
    return { rootDir: null, reason: 'missing-file-path' }
  }

  const cached = assetRootCache.get(originalName)
  if (cached) {
    return { ...cached, assetPath: `uploads/${originalName}` }
  }

  const record = findSessionUploadRecordByOriginalName(originalName)
  if (!record) {
    const miss = { rootDir: null, reason: 'asset-not-found' }
    assetRootCache.set(originalName, miss)
    return miss
  }

  if (!record.sourcePath && !record.workspaceRoot) {
    const miss = { rootDir: null, reason: 'no-source-path', source: record.source }
    assetRootCache.set(originalName, miss)
    return miss
  }

  const workspaceCandidate = record.workspaceRoot ? normalizeRoot(record.workspaceRoot) : null
  const sourceCandidate = record.sourcePath ? normalizeRoot(path.dirname(record.sourcePath)) : null
  let repoRoot = workspaceCandidate ? await resolveRootFromDirectory(workspaceCandidate) : null
  if (!repoRoot && sourceCandidate) {
    repoRoot = await resolveRootFromDirectory(sourceCandidate)
  }
  if (!repoRoot) {
    repoRoot = workspaceCandidate ?? sourceCandidate ?? normalizeRoot(process.cwd())
  }

  const hit = { rootDir: repoRoot, source: record.source, assetPath: `uploads/${originalName}` }
  assetRootCache.set(originalName, hit)
  return hit
}

export function clearAssetRepoRootCache(assetPath?: string) {
  if (!assetPath) {
    assetRootCache.clear()
    return
  }
  const originalName = normalizeAssetName(assetPath)
  if (!originalName) return
  assetRootCache.delete(originalName)
}

export function describeRepoRootFailure(reason: RepoRootMissingReason | undefined) {
  switch (reason) {
    case 'asset-not-found':
      return 'No session asset found for this selection. Rerun session discovery and try again.'
    case 'no-source-path':
      return 'This upload is not linked to a real repository, so Hookify cannot load its AGENT rules.'
    case 'missing-file-path':
    default:
      return 'Select a session asset that originates from a repository to enable AGENT validation.'
  }
}

function normalizeAssetName(assetPath: string | undefined) {
  if (!assetPath) return null
  const noPrefix = assetPath.startsWith('uploads/') ? assetPath.slice('uploads/'.length) : assetPath
  const trimmed = noPrefix.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function resolveRootFromDirectory(startDir: string): Promise<string | null> {
  const normalized = normalizeRoot(startDir)
  const gitRoot = await findGitRoot(normalized)
  if (gitRoot) return gitRoot
  const instructionRoot = await findInstructionRoot(normalized)
  if (instructionRoot) return instructionRoot
  if (await pathExists(normalized)) {
    return normalized
  }
  return null
}

async function findGitRoot(startDir: string): Promise<string | null> {
  let current = normalizeRoot(startDir)
  let previous: string | null = null
  while (current && current !== previous) {
    const gitPath = path.join(current, '.git')
    if (await pathExists(gitPath)) {
      return normalizeRoot(current)
    }
    previous = current
    current = path.dirname(current)
  }
  return null
}

async function findInstructionRoot(startDir: string): Promise<string | null> {
  let current = normalizeRoot(startDir)
  let previous: string | null = null
  while (current && current !== previous) {
    if (await containsInstructionFiles(current)) {
      return normalizeRoot(current)
    }
    previous = current
    current = path.dirname(current)
  }
  return null
}

async function containsInstructionFiles(dir: string) {
  const candidates = [
    path.join(dir, 'AGENTS.md'),
    path.join(dir, '.ruler'),
    path.join(dir, '.cursor', 'rules'),
    path.join(dir, 'docs', 'agents'),
  ]
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return true
    }
  }
  return false
}

function normalizeRoot(rootDir: string) {
  return rootDir.replace(/\\/g, '/').replace(/\/+$/, '')
}

async function pathExists(target: string) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}
