import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { clearAssetRepoRootCache, resolveRepoRootForAssetPath } from '~/server/lib/sessionRepoRoots'
import { clearSessionUploadRecords, ensureSessionUploadForFile } from '~/server/persistence/sessionUploads'

function normalize(dir: string) {
  return dir.replace(/\\/g, '/').replace(/\/+$/, '')
}

describe('sessionRepoRoots', () => {
  let repoDir: string

  beforeEach(async () => {
    repoDir = await mkdtemp(path.join(os.tmpdir(), 'repo-root-'))
    await mkdir(path.join(repoDir, '.git'), { recursive: true })
    clearAssetRepoRootCache()
    await clearSessionUploadRecords()
  })

  afterEach(async () => {
    await rm(repoDir, { recursive: true, force: true }).catch(() => {})
  })

  it('resolves repo root for registered session assets with git metadata', async () => {
    const sessionFile = path.join(repoDir, 'sessions', 'demo.ndjson')
    await mkdir(path.dirname(sessionFile), { recursive: true })
    await writeFile(sessionFile, '{"events": []}', 'utf8')

    await ensureSessionUploadForFile({
      relativePath: 'tmp/demo.ndjson',
      absolutePath: sessionFile,
      source: 'external',
    })

    const result = await resolveRepoRootForAssetPath('uploads/tmp/demo.ndjson')
    expect(result.rootDir).toBe(normalize(repoDir))
    expect(result.reason).toBeUndefined()
  })

  it('falls back to file directory when git metadata is missing', async () => {
    const orphanRepo = await mkdtemp(path.join(os.tmpdir(), 'repo-root-missing-'))
    const orphanFile = path.join(orphanRepo, 'session.ndjson')
    await writeFile(orphanFile, '{"events": []}', 'utf8')

    await ensureSessionUploadForFile({
      relativePath: 'tmp/orphan.ndjson',
      absolutePath: orphanFile,
      source: 'external',
    })

    const result = await resolveRepoRootForAssetPath('uploads/tmp/orphan.ndjson')
    expect(result.rootDir).toBe(normalize(path.dirname(orphanFile)))
    expect(result.reason).toBeUndefined()

    await rm(orphanRepo, { recursive: true, force: true }).catch(() => {})
  })
})
