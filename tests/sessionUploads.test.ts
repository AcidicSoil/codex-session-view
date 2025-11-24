import { describe, expect, it, vi, beforeEach } from 'vitest'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'

describe('sessionUploads persistence', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('stores uploads in TanStack DB collection', async () => {
    const store = await import('~/server/persistence/sessionUploads')
    const record = await store.saveSessionUpload('example.json', '{"foo":1}')
    expect(record.url).toMatch(/\/api\/uploads\//)
    expect(record.source).toBe('upload')

    const list = await store.listSessionUploadRecords()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(record.id)

    const content = await store.getSessionUploadContent(record.id)
    expect(content).toBe('{"foo":1}')
  })

  it('ensures discovered files are cached as uploads', async () => {
    const store = await import('~/server/persistence/sessionUploads')
    const tmpPath = path.join(os.tmpdir(), `codex-session-${Date.now()}.jsonl`)
    await fs.writeFile(tmpPath, '{"meta":{"git":{"repo":"example/repo","branch":"main"}}}\n{"event":1}')
    try {
      const summary = await store.ensureSessionUploadForFile({
        relativePath: 'sessions/tmp.jsonl',
        absolutePath: tmpPath,
        source: 'external',
      })
      expect(summary.url).toContain('/api/uploads/')
      expect(summary.source).toBe('external')

      const again = await store.ensureSessionUploadForFile({
        relativePath: 'sessions/tmp.jsonl',
        absolutePath: tmpPath,
        source: 'external',
      })
      expect(again.id).toBe(summary.id)
    } finally {
      await fs.unlink(tmpPath)
    }
  })
})
